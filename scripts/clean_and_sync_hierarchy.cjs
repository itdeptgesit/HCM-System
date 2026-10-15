const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Supabase URL or Key not found in environment');
  process.exit(1);
}

const supabase = createClient(url, key);

function norm(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function run() {
  console.log('1. Reading public/Approval Line Att n Time Off.xlsx...');
  const wb = xlsx.readFile('public/Approval Line Att n Time Off.xlsx');
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log('Total rows in Excel:', rows.length);

  const { data: users, error } = await supabase
    .from('user_accounts')
    .select('id, employee_id, full_name, email, role');

  if (error || !users) {
    console.error('Error fetching users:', error);
    process.exit(1);
  }

  const nameMap = new Map();
  const idMap = new Map();
  users.forEach(u => {
    nameMap.set(norm(u.full_name), u);
    if (u.employee_id) idMap.set(norm(u.employee_id), u);
  });

  let updatedCount = 0;
  for (const r of rows) {
    const empId = norm(r['Employee ID']);
    const empName = norm(r['Employee Name']);
    const user = idMap.get(empId) || nameMap.get(empName);
    if (!user) continue;

    const l1Name = norm(r['Approval Line 1 Name']);
    const l2Name = norm(r['Approval Line 2 Name']);
    const l3Name = norm(r['Approval Line 3 Name']);

    const approver1 = nameMap.get(l1Name);
    const approver2 = nameMap.get(l2Name);
    const approver3 = nameMap.get(l3Name);

    const updatePayload = {
      // Level 1: Atasan Langsung (Line 1)
      supervisor_id: approver1 ? approver1.id : null,
      attendance_supervisor_id: approver1 ? approver1.id : null,

      // Level 2: HR Specialist (Line 2)
      attendance_hr_id: approver2 ? approver2.id : null,

      // Level 3: Head of Dept / Manager (Line 3)
      manager_id: approver3 ? approver3.id : null,
      attendance_manager_id: approver3 ? approver3.id : null,

      // Level 4 (VP): Dikosongkan agar tidak ada duplikasi 4x
      vp_id: null,
      attendance_vp_id: null,

      updated_at: new Date().toISOString()
    };

    const { error: updErr } = await supabase
      .from('user_accounts')
      .update(updatePayload)
      .eq('id', user.id);

    if (updErr) {
      console.error('Failed to update user', user.full_name, updErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`\n✓ Berhasil memperbarui ${updatedCount} karyawan sesuai 3 jalur persetujuan resmi.`);

  // Also clean up any lingering users where attendance_vp_id was set
  const { error: cleanErr } = await supabase
    .from('user_accounts')
    .update({ vp_id: null, attendance_vp_id: null })
    .not('attendance_vp_id', 'is', null);

  if (cleanErr) console.warn('Clean vp_id error:', cleanErr.message);
  else console.log('✓ Seluruh data VP duplikat berhasil dibersihkan.');
}

run().catch(console.error);
