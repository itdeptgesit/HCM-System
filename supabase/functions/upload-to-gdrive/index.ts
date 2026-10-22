import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function createJWT(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const encode = (obj: any) => base64url(new TextEncoder().encode(JSON.stringify(obj)));
  const signingInput = `${encode(header)}.${encode(payload)}`;

  let rawKey = credentials.private_key as string;
  if (!rawKey) throw new Error("private_key tidak ditemukan di credentials");
  if (!rawKey.includes("\n") && rawKey.includes("\\n")) rawKey = rawKey.replace(/\\n/g, "\n");

  const base64Key = rawKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (!base64Key) throw new Error("Private key kosong");

  const binary = atob(base64Key);
  const keyData = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) keyData[i] = binary.charCodeAt(i);

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

async function getAccessToken(credentials: any): Promise<string> {
  const jwt = await createJWT(credentials);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`Gagal mendapatkan token: ${await res.text()}`);
  return (await res.json()).access_token;
}

// Cari atau buat subfolder di dalam parentFolderId
async function getOrCreateSubfolder(accessToken: string, parentFolderId: string, name: string): Promise<string> {
  try {
    const q = encodeURIComponent(
      `'${parentFolderId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (searchRes.ok) {
      const { files } = await searchRes.json();
      if (files && files.length > 0) return files[0].id;
    }

    const createRes = await fetch(
      "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentFolderId],
        }),
      }
    );
    if (createRes.ok) return (await createRes.json()).id;
  } catch (e) {
    console.warn("getOrCreateSubfolder error:", e);
  }
  return parentFolderId;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      fileName,
      fileMimeType,
      mimeType,
      fileBase64,
      base64,
      targetEmail,
      requesterEmail,
      folderType,
      category,
      visibility,
      employeeId,
      employeeCode,
      employeeName,
    } = body;

    const actualFileName = fileName || "document.pdf";
    const actualBase64 = fileBase64 || base64;
    const actualMimeType = fileMimeType || mimeType || "application/octet-stream";
    const userEmail = (targetEmail || requesterEmail || "").trim().toLowerCase();

    const action = body.action || "upload";

    // --- Verifikasi sesi pemanggil -------------------------------------------
    // Sebelumnya fungsi ini terbuka: siapa pun yang memegang anon key bisa
    // menulis ke Drive perusahaan, bahkan meminta izin "anyone" pada file.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      throw new Error("Konfigurasi Supabase belum lengkap di secrets fungsi.");
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) throw new Error("Authentication required");

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser }, error: authError } = await callerClient.auth.getUser();
    if (authError || !callerUser?.email) throw new Error("Invalid or expired session");

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const { data: caller } = await admin
      .from("user_accounts")
      .select("id, auth_user_id, email, full_name, employee_code, role, groups, status")
      .ilike("email", callerUser.email)
      .maybeSingle();
    if (!caller) throw new Error("Account profile not found in HCM");

    const callerRole = String(caller.role || "").toLowerCase();
    const callerGroups: string[] = Array.isArray(caller.groups) ? caller.groups : [];
    const isHR =
      ["admin", "super admin", "super_admin", "hr", "hr manager", "hr staff", "office_management"].includes(callerRole) ||
      callerGroups.some((g) => ["hr", "hrd", "it_management", "csl_admin"].includes(String(g).toLowerCase()));

    // Dokumen pribadi (termasuk foto absensi) hanya boleh diunggah untuk diri sendiri.
    const personalCategories = [
      "attendance_photo",
      "payment_proof",
      "foto_profil",
      "ktp",
      "ijazah",
      "bpjs",
      "sk_karyawan",
    ];
    if (personalCategories.includes(category) && !isHR) {
      // `employeeId` tidak konsisten antar pemanggil: mobile mengirim
      // user_accounts.id / auth.uid, web profil mengirim employee_code.
      // Terima ketiganya, tolak hanya bila jelas milik orang lain.
      const requestedOwner = String(employeeId || caller.id);
      const ownIds = new Set([
        String(caller.id),
        String(caller.auth_user_id || ""),
        String(caller.employee_code || ""),
        String(callerUser.id),
      ]);
      if (employeeId && !ownIds.has(requestedOwner)) {
        throw new Error("Anda hanya boleh mengunggah dokumen milik sendiri.");
      }
    }

    // Dokumen perusahaan hanya untuk HR.
    if (["sk_perusahaan", "news_attachment", "news_image", "internal_hr"].includes(category) && !isHR) {
      throw new Error("Hanya HR yang boleh mengunggah dokumen perusahaan.");
    }

    let serviceAccountRaw = Deno.env.get("GDRIVE_SERVICE_ACCOUNT_JSON");
    const rootFolderId = Deno.env.get("GDRIVE_FOLDER_ID");

    if (!serviceAccountRaw || !rootFolderId) {
      throw new Error("Konfigurasi Google Drive belum diatur di Supabase Secrets (GDRIVE_SERVICE_ACCOUNT_JSON & GDRIVE_FOLDER_ID).");
    }

    serviceAccountRaw = serviceAccountRaw
      .replace(/^\uFEFF/, "")
      .replace(/^\u0000+/, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim();

    let credentials: any;
    try {
      credentials = JSON.parse(serviceAccountRaw);
      if (typeof credentials === "string") credentials = JSON.parse(credentials);
    } catch (e: any) {
      throw new Error(`Format GDRIVE_SERVICE_ACCOUNT_JSON tidak valid: ${e.message}`);
    }

    // Aksi: Update izin akses file yang sudah ada (make_public / share)
    if (action === "make_public" || action === "share") {
      if (!isHR) throw new Error("Hanya HR yang boleh mengubah izin file.");
      const fileId = body.fileId;
      if (!fileId) throw new Error("Missing fileId");
      const accessToken = await getAccessToken(credentials);

      const targetEmail = body.targetEmail;
      const permBody = targetEmail
        ? { role: "reader", type: "user", emailAddress: targetEmail }
        : { role: "reader", type: "anyone" };

      const permRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(permBody),
        }
      );

      if (!permRes.ok) {
        throw new Error(`Gagal update permission: ${await permRes.text()}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Izin file berhasil diperbarui!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!actualFileName || !actualBase64) {
      throw new Error("Missing fileName or fileBase64 payload");
    }

    // Batas aman payload (base64 membengkak ~33%). Edge Function tidak cocok
    // untuk file besar; foto absensi setelah kompresi jauh di bawah batas ini.
    if (actualBase64.length > 8_000_000) {
      throw new Error("File terlalu besar. Maksimal sekitar 6 MB.");
    }

    const accessToken = await getAccessToken(credentials);

    // Tentukan folder tujuan berdasarkan HR folderType / category
    let targetFolderId = rootFolderId;

    if (folderType === "employee_docs" || ["ktp", "ijazah", "sk_karyawan", "bpjs", "foto_profil"].includes(category)) {
      const parentEmpDocs = await getOrCreateSubfolder(accessToken, rootFolderId, "Dokumen Karyawan");
      if (employeeName || employeeCode || employeeId) {
        const empFolderName = `[${employeeCode || employeeId || "EMP"}] ${employeeName || "Karyawan"}`.trim();
        targetFolderId = await getOrCreateSubfolder(accessToken, parentEmpDocs, empFolderName);
      } else {
        targetFolderId = parentEmpDocs;
      }
    } else if (folderType === "news_published" || category === "news_attachment" || category === "news_image") {
      targetFolderId = await getOrCreateSubfolder(accessToken, rootFolderId, "Berita & Pengumuman");
    } else if (folderType === "sk_published" || category === "sk_perusahaan") {
      targetFolderId = await getOrCreateSubfolder(accessToken, rootFolderId, "SK & Kebijakan");
    } else if (folderType === "hr_internal" || category === "internal_hr") {
      targetFolderId = await getOrCreateSubfolder(accessToken, rootFolderId, "Internal HR");
    } else if (folderType === "attendance" || category === "attendance_photo") {
      // Foto absensi dikelompokkan per karyawan agar mudah ditelusuri HR.
      const parentAbsensi = await getOrCreateSubfolder(accessToken, rootFolderId, "Absensi");
      const ownerName = employeeName || caller.full_name || caller.email;
      const ownerCode = employeeCode || caller.employee_code || caller.id;
      targetFolderId = await getOrCreateSubfolder(accessToken, parentAbsensi, `[${ownerCode}] ${ownerName}`.trim());
    } else if (folderType === "reimbursement" || category === "payment_proof") {
      // Bukti reimbursement bersifat medis/keuangan: pisahkan dari foto absensi.
      const parentReimb = await getOrCreateSubfolder(accessToken, rootFolderId, "Reimbursement");
      const ownerName = employeeName || caller.full_name || caller.email;
      const ownerCode = employeeCode || caller.employee_code || caller.id;
      targetFolderId = await getOrCreateSubfolder(accessToken, parentReimb, `[${ownerCode}] ${ownerName}`.trim());
    } else if (folderType === "document") {
      targetFolderId = await getOrCreateSubfolder(accessToken, rootFolderId, "CSL Documents");
    } else if (folderType === "request") {
      targetFolderId = await getOrCreateSubfolder(accessToken, rootFolderId, "User Requests");
    }

    // Decode Base64
    const cleanBase64 = actualBase64.replace(/^data:.*,/, "");
    const fileBytes = Uint8Array.from(atob(cleanBase64), (c) => c.charCodeAt(0));

    // Multipart upload ke Google Drive API v3
    const boundary = "-------314159265358979323846";
    const metadataStr = JSON.stringify({ name: actualFileName, parents: [targetFolderId] });
    const encoder = new TextEncoder();
    const pre = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n--${boundary}\r\nContent-Type: ${actualMimeType}\r\n\r\n`
    );
    const post = encoder.encode(`\r\n--${boundary}--`);
    const bodyPayload = new Uint8Array(pre.length + fileBytes.length + post.length);
    bodyPayload.set(pre, 0);
    bodyPayload.set(fileBytes, pre.length);
    bodyPayload.set(post, pre.length + fileBytes.length);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary="${boundary}"`,
          "Content-Length": String(bodyPayload.length),
        },
        body: bodyPayload,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      if (errText.includes("storageQuotaExceeded") || errText.includes("Service Accounts do not have storage quota")) {
        throw new Error(
          "Gagal: Folder yang digunakan berada di 'Drive Saya' (My Drive). Google Service Account tidak memiliki kuota penyimpanan pribadi dan wajib menggunakan 'Drive Bersama' (Shared Drive) di Google Workspace. Silakan buat/pindahkan folder ke Drive Bersama (Shared Drive) dan pastikan Service Account diundang sebagai Pengelola Konten."
        );
      }
      throw new Error(`Google Drive upload failed: ${errText}`);
    }

    const fileData = await uploadRes.json();

    // Atur izin akses Google Drive:
    // 1. Jika dokumen pengumuman / publik / SK perusahaan / foto profil -> beri izin reader ke 'anyone' (agar gambar/dokumen bisa dilihat semua orang di web app)
    // Foto absensi & bukti reimbursement saat ini diset "anyone with link" agar
    // bisa dirender langsung oleh <img> di app-hr dan Image.network di app-absen
    // (setara bucket publik yang dipakai sebelumnya). Set env
    // GDRIVE_ATTENDANCE_PUBLIC=false untuk menutupnya, tapi aplikasi lalu wajib
    // memakai proxy/signed URL agar foto tetap tampil.
    const attendancePublic = (Deno.env.get("GDRIVE_ATTENDANCE_PUBLIC") ?? "true") !== "false";
    const isPublicResource =
      visibility === "all_active" ||
      folderType === "news_published" ||
      folderType === "sk_published" ||
      ["news_image", "news_attachment", "sk_perusahaan", "foto_profil"].includes(category) ||
      (attendancePublic && ["attendance_photo", "payment_proof"].includes(category));

    if (isPublicResource) {
      try {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ role: "reader", type: "anyone" }),
          }
        );
      } catch (permErr) {
        console.warn("Gagal set permission anyone:", permErr);
      }
    }

    // 2. Jika ada email user spesifik -> beri izin viewer/reader personal
    if (userEmail && userEmail.includes("@")) {
      try {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ role: "reader", type: "user", emailAddress: userEmail }),
          }
        );
      } catch (permErr) {
        console.warn("Gagal set permission viewer:", permErr);
      }
    }

    const finalUrl = fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`;
    const finalDownload = fileData.webContentLink || `https://drive.google.com/uc?export=download&id=${fileData.id}`;
    // URL yang bisa langsung dipakai <img>/Image.network tanpa redirect 302.
    const imageUrl = actualMimeType.startsWith("image/")
      ? `https://lh3.googleusercontent.com/d/${fileData.id}=w1024`
      : null;

    return new Response(
      JSON.stringify({
        success: true,
        fileId: fileData.id,
        fileUrl: finalUrl,
        gdriveUrl: finalUrl,
        imageUrl,
        downloadUrl: finalDownload,
        folderId: targetFolderId,
        fileName: actualFileName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
