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

async function syncApprovalLines() {
  console.log('Reading public/Approval Line Att n Time Off.xlsx...');
  const wb = xlsx.readFile('public/Approval Line Att n Time Off.xlsx');
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`Found ${rows.length} rows in Excel.`);

  const { data: users, error } = await supabase
    .from('user_accounts')
    .select('id, employee_id, full_name, email, role');

  if (error) {
    console.error('Error fetching users:', error);
    process.exit(1);
  }

  console.log(`Found ${users.length} user accounts in Supabase database.`);

  const nameMap = new Map();
  users.forEach(u => nameMap.set(norm(u.full_name), u));

  const idMap = new Map();
  users.forEach(u => {
    if (u.employee_id) idMap.set(norm(u.employee_id), u);
  });

  let updatedCount = 0;
  const results = [];

  for (const r of rows) {
    const empId = norm(r['Employee ID']);
    const empName = norm(r['Employee Name']);
    const user = idMap.get(empId) || nameMap.get(empName);

    if (!user) continue;

    const l1Name = norm(r['Approval Line 1 Name']);
    const l2Name = norm(r['Approval Line 2 Name']);

    const approver1 = nameMap.get(l1Name);
    const approver2 = nameMap.get(l2Name);

    const updatePayload = {
      supervisor_id: approver1 ? approver1.id : null,
      attendance_supervisor_id: approver1 ? approver1.id : null,
      attendance_hr_id: approver2 ? approver2.id : null,
      manager_id: approver2 ? approver2.id : null,
      updated_at: new Date().toISOString()
    };

    const { error: updateErr } = await supabase
      .from('user_accounts')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateErr) {
      console.error(`Failed to update ${user.full_name}:`, updateErr.message);
    } else {
      updatedCount++;
      results.push({
        id: user.id,
        name: user.full_name,
        empId: user.employee_id,
        spv: approver1 ? `${approver1.full_name} (ID: ${approver1.id})` : `(Nama di Excel: ${r['Approval Line 1 Name']} - Belum ada di user_accounts)`,
        hrManager: approver2 ? `${approver2.full_name} (ID: ${approver2.id})` : `(Nama di Excel: ${r['Approval Line 2 Name']} - Belum ada di user_accounts)`
      });
    }
  }

  console.log(`\n========================================`);
  console.log(`BERHASIL MEMPERBARUI ${updatedCount} KARYAWAN!`);
  console.log(`========================================`);
  console.table(results);
}

syncApprovalLines().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
