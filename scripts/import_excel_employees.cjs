const XLSX = require('xlsx');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
let url = '', key = '';
try {
  const env = fs.readFileSync('.env', 'utf8');
  env.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
  });
} catch(e) {}

if (!url || !key) {
  console.error('Supabase URL or Key not found in .env');
  process.exit(1);
}

const sb = createClient(url, key);

const filePath = 'public/Employees Directory (2).xlsx';
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Tampilan Emp Direc'];
const rawRows = XLSX.utils.sheet_to_json(ws);

const formatDate = (val) => {
  if (!val) return null;
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
};

const formatPhone = (val) => {
  if (!val || val === 0 || val === '0') return null;
  return String(val).trim();
};

const mapGender = (val) => {
  if (!val) return null;
  const s = String(val).toLowerCase();
  if (s.includes('male') || s.includes('laki')) return 'Laki-laki';
  if (s.includes('female') || s.includes('perempuan')) return 'Perempuan';
  return String(val);
};

const mapMarital = (val) => {
  if (!val) return null;
  const s = String(val).toLowerCase();
  if (s.includes('married') || s.includes('menikah')) return 'Menikah';
  if (s.includes('single') || s.includes('belum')) return 'Belum Menikah';
  return String(val);
};

const mapContract = (val) => {
  if (!val) return 'PKWTT';
  const s = String(val).toLowerCase();
  if (s.includes('permanent') || s.includes('tetap')) return 'PKWTT';
  if (s.includes('contract') || s.includes('kontrak')) return 'PKWT';
  if (s.includes('probation') || s.includes('percobaan')) return 'Probation';
  return String(val);
};

const mapRole = (position, level) => {
  const p = (position || '').toLowerCase();
  const l = (level || '').toLowerCase();
  if (p.includes('vp') || l.includes('vice president')) return 'VP';
  if (p.includes('manager') || l.includes('manager')) return 'Manager';
  if (p.includes('supervisor') || l.includes('supervisor')) return 'Supervisor';
  if (p.includes('hr') || p.includes('human resources')) return 'HR Staff';
  return 'Employee';
};

async function importEmployees() {
  console.log('Fetching existing companies and employees...');
  const { data: existingCompanies } = await sb.from('companies').select('*');
  const compMap = new Map();
  (existingCompanies || []).forEach(c => compMap.set(c.name.trim().toLowerCase(), c));

  const { data: existingUsers, error: userError } = await sb.from('user_accounts').select('*');
  if (userError) {
    console.error('Error fetching user_accounts:', userError);
    return;
  }

  const emailMap = new Map();
  const codeMap = new Map();
  (existingUsers || []).forEach(u => {
    if (u.email) emailMap.set(u.email.toLowerCase().trim(), u);
    if (u.employee_code) codeMap.set(String(u.employee_code).trim(), u);
  });

  // 1. Ensure all companies exist
  const uniqueCompanies = [...new Set(rawRows.map(r => String(r['Branch Name'] || '').trim()).filter(Boolean))];
  for (const cName of uniqueCompanies) {
    if (!compMap.has(cName.toLowerCase())) {
      console.log('Inserting new company:', cName);
      const code = cName.replace(/^PT\s+/i, '').split(' ').map(w => w[0]).join('').toUpperCase();
      const { data: insertedComp, error: compErr } = await sb.from('companies').insert({
        name: cName,
        code: code || 'CORP',
        address: 'The City Tower Lt. 27. Jl. MH Thamrin No.81, Jakarta Pusat'
      }).select().single();
      if (!compErr && insertedComp) {
        compMap.set(cName.toLowerCase(), insertedComp);
      }
    }
  }

  // 2. Import each employee
  let insertedCount = 0;
  let updatedCount = 0;

  for (const r of rawRows) {
    const fullName = String(r['Full Name'] || '').trim();
    const empId = String(r['Employee ID'] || '').trim();
    const email = String(r['Email'] || '').trim().toLowerCase();

    const payload = {
      full_name: fullName,
      employee_id: empId,
      employee_code: empId,
      nik: String(r['NIK (NPWP 16 Digit)'] || '').trim() || null,
      npwp: String(r['NIK (NPWP 16 Digit)'] || '').trim() || null,
      company: String(r['Branch Name'] || '').trim(),
      branch: String(r['Branch Name'] || '').trim(),
      department: String(r['Organization'] || 'HR & Logistics').trim(),
      job_title: String(r['Job Position'] || '').trim(),
      job_level: String(r['Job Level'] || 'Staff').trim(),
      contract_type: mapContract(r['Status Employee']),
      employment_type: mapContract(r['Status Employee']),
      status: 'Active',
      employment_status: 'Active',
      join_date: formatDate(r['Join Date']),
      contract_end_date: formatDate(r['End Date']),
      status_effective_date: formatDate(r['Sign Date']),
      separation_date: formatDate(r['Resign Date']),
      email: email,
      date_of_birth: formatDate(r['Birth Date']),
      birth_place: r['Birth Place'] && r['Birth Place'] !== '0' && r['Birth Place'] !== 0 ? String(r['Birth Place']).trim() : null,
      address: String(r['Citizen ID Address'] || '').trim() || null,
      residential_address: String(r['Citizen ID Address'] || '').trim() || null,
      phone: formatPhone(r['Mobile Phone']),
      religion: String(r['Religion'] || '').trim() || null,
      gender: mapGender(r['Gender']),
      marital_status: mapMarital(r['Marital Status']),
      role: mapRole(r['Job Position'], r['Job Level']),
      updated_at: new Date().toISOString()
    };

    // Check if user already exists by email or employee_code
    // Note: Kadek Hananda Cherry email in DB is kadek.cherry@gesit.co.id, while in Excel it is hananda.cherry@gesit.co.id
    const existing = emailMap.get(email) || codeMap.get(empId);

    if (existing) {
      console.log(`Updating existing employee [ID: ${existing.id}] ${fullName} (${empId})...`);
      const { error: updErr } = await sb.from('user_accounts').update(payload).eq('id', existing.id);
      if (updErr) {
        console.error(`Failed to update ${fullName}:`, updErr.message);
      } else {
        updatedCount++;
      }
    } else {
      console.log(`Inserting new employee ${fullName} (${empId})...`);
      payload.created_at = new Date().toISOString();
      const { error: insErr } = await sb.from('user_accounts').insert(payload);
      if (insErr) {
        console.error(`Failed to insert ${fullName}:`, insErr.message);
      } else {
        insertedCount++;
      }
    }
  }

  console.log(`\nImport Summary:`);
  console.log(`- Total Records Processed: ${rawRows.length}`);
  console.log(`- Newly Inserted: ${insertedCount}`);
  console.log(`- Updated / Enriched: ${updatedCount}`);
}

importEmployees();
