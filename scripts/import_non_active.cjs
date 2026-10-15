const fs = require('fs');
const dotenv = require('dotenv');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const env = dotenv.parse(fs.readFileSync('D:/web/app-hr/.env', 'utf8'));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

function cleanKey(key) {
  return key.toLowerCase().replace(/\*/g, '').replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');
}

function normalizeDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = xlsx.SSF.parse_date_code(val);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split(/[\/\-.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

async function runImport() {
  console.log('--- Memulai Import 36 Karyawan Non-Aktif ---');
  const wb = xlsx.readFile('public/Non Active_Template_Import_Karyawan_Gesit_People.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  let inserted = 0;
  let updated = 0;
  let errors = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const normalized = {};
    Object.keys(row).forEach(k => normalized[cleanKey(k)] = row[k]);

    const getValue = (...keys) => {
      for (const k of keys) {
        const cleaned = cleanKey(k);
        if (normalized[cleaned] !== undefined && normalized[cleaned] !== null && String(normalized[cleaned]).trim() !== '') {
          return normalized[cleaned];
        }
      }
      return undefined;
    };

    const fullName = String(getValue('namalengkap', 'nama', 'fullname', 'name') || '').trim();
    const rawEmail = String(getValue('emaillogin', 'email', 'alamatemail') || '').trim().toLowerCase();
    const nik = String(getValue('nikktp', 'nik', 'nomorktp', 'ktp') || '').trim();

    if (!fullName || !rawEmail) {
      console.log(`[Baris ${idx+2}] Skip: Nama atau Email kosong`);
      continue;
    }

    const payload = {
      email: rawEmail,
      username: rawEmail.split('@')[0],
      full_name: fullName,
      nik: nik || null,
      role: String(getValue('roleakun', 'role', 'hakakses') || 'Employee').trim(),
      status: 'Disabled',
      employment_status: 'Resigned',
      groups: ['HCM', String(getValue('roleakun', 'role', 'hakakses') || 'Employee').trim()],
      phone: getValue('nomorhandphone', 'phone', 'telepon', 'hp') ? String(getValue('nomorhandphone', 'phone', 'telepon', 'hp')).trim() : null,
      birth_place: getValue('tempatlahir', 'birthplace', 'kota_lahir') ? String(getValue('tempatlahir', 'birthplace', 'kota_lahir')).trim() : null,
      date_of_birth: normalizeDate(getValue('tanggallahir', 'dateofbirth', 'tgllahir')),
      gender: getValue('jeniskelamin', 'gender', 'kelamin') ? String(getValue('jeniskelamin', 'gender', 'kelamin')).trim() : null,
      religion: getValue('agama', 'religion') ? String(getValue('agama', 'religion')).trim() : null,
      marital_status: getValue('statuspernikahan', 'maritalstatus', 'statusnikah') ? String(getValue('statuspernikahan', 'maritalstatus', 'statusnikah')).trim() : null,
      blood_type: getValue('golongandarah', 'bloodtype', 'goldarah') ? String(getValue('golongandarah', 'bloodtype', 'goldarah')).trim() : null,
      address: getValue('alamatktp', 'address', 'alamat') ? String(getValue('alamatktp', 'address', 'alamat')).trim() : null,
      residential_address: getValue('alamatdomisili', 'residentialaddress', 'domisili') ? String(getValue('alamatdomisili', 'residentialaddress', 'domisili')).trim() : null,
      last_education: getValue('pendidikanterakhir', 'lasteducation', 'pendidikan') ? String(getValue('pendidikanterakhir', 'lasteducation', 'pendidikan')).trim() : null,
      employee_code: getValue('nip', 'kodekaryawan', 'employeecode') ? String(getValue('nip', 'kodekaryawan', 'employeecode')).trim() : null,
      company: getValue('perusahaan', 'company', 'pt') ? String(getValue('perusahaan', 'company', 'pt')).trim() : null,
      branch: getValue('cabang', 'branch', 'lokasikerja') ? String(getValue('cabang', 'branch', 'lokasikerja')).trim() : null,
      department: getValue('departemen', 'department', 'divisi') ? String(getValue('departemen', 'department', 'divisi')).trim() : 'Other',
      job_title: getValue('jabatan', 'jobtitle', 'posisi') ? String(getValue('jabatan', 'jobtitle', 'posisi')).trim() : null,
      job_level: getValue('leveljabatan', 'joblevel', 'level') ? String(getValue('leveljabatan', 'joblevel', 'level')).trim() : 'Staff',
      employment_type: getValue('tipekaryawan', 'employmenttype', 'tipe') ? String(getValue('tipekaryawan', 'employmenttype', 'tipe')).trim() : 'Full-Time',
      join_date: normalizeDate(getValue('tanggalmulaikerja', 'joindate', 'tglmasuk', 'tglbergabung')),
      contract_type: getValue('statuskontrak', 'contracttype', 'jeniskontrak') ? String(getValue('statuskontrak', 'contracttype', 'jeniskontrak')).trim() : 'PKWT 1',
      contract_end_date: normalizeDate(getValue('tanggalselesaikontrak', 'contractenddate', 'tglselesaikontrak')),
      payroll_status: 'Hold',
      separation_reason: 'Resigned',
      bank_name: getValue('namabank', 'bankname', 'bank') ? String(getValue('namabank', 'bankname', 'bank')).trim() : null,
      bank_account_number: getValue('nomorrekening', 'bankaccountnumber', 'norek') ? String(getValue('nomorrekening', 'bankaccountnumber', 'norek')).trim() : null,
      bank_account_name: getValue('namapemilikrekening', 'bankaccountname', 'atasnama') ? String(getValue('namapemilikrekening', 'bankaccountname', 'atasnama')).trim() : null,
      tax_status: getValue('statuspajak', 'taxstatus', 'ptkp') ? String(getValue('statuspajak', 'taxstatus', 'ptkp')).trim() : null,
      npwp: getValue('nomornpwp', 'npwp') ? String(getValue('nomornpwp', 'npwp')).trim() : null,
      bpjs_tk_number: getValue('nomorbpjsketenagakerjaan', 'bpjstknumber', 'bpjstk') ? String(getValue('nomorbpjsketenagakerjaan', 'bpjstknumber', 'bpjstk')).trim() : null,
      bpjs_health_number: getValue('nomorbpjskesehatan', 'bpjshealthnumber', 'bpjskes') ? String(getValue('nomorbpjskesehatan', 'bpjshealthnumber', 'bpjskes')).trim() : null,
      passport_number: getValue('nomorpaspor', 'passportnumber', 'paspor') ? String(getValue('nomorpaspor', 'passportnumber', 'paspor')).trim() : null
    };

    // Cek apakah akun sudah ada di database
    const { data: existingUser } = await supabase
      .from('user_accounts')
      .select('id, email, status')
      .ilike('email', rawEmail)
      .maybeSingle();

    if (existingUser) {
      // Update status menjadi Disabled
      const { error: updateErr } = await supabase
        .from('user_accounts')
        .update({
          status: 'Disabled',
          employment_status: 'Disabled',
          separation_date: payload.contract_end_date || null
        })
        .eq('id', existingUser.id);

      if (updateErr) {
        errors.push(`Gagal update [${rawEmail}]: ${updateErr.message}`);
      } else {
        console.log(`[Update] [ID ${existingUser.id}] ${fullName} (${rawEmail}) -> status: Disabled`);
        updated++;
      }
    } else {
      // Insert record baru
      const { data: insertedData, error: insertErr } = await supabase
        .from('user_accounts')
        .insert([payload])
        .select('id, full_name, email');

      if (insertErr) {
        errors.push(`Gagal insert [${rawEmail}]: ${insertErr.message}`);
      } else {
        console.log(`[Insert] [ID ${insertedData[0].id}] ${fullName} (${rawEmail})`);
        inserted++;
      }
    }
  }

  console.log('\n--- Hasil Eksekusi Import ---');
  console.log(`Berhasil insert baru : ${inserted}`);
  console.log(`Berhasil update      : ${updated}`);
  console.log(`Gagal/Error          : ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach(e => console.error(' ', e));
  }
}

runImport();
