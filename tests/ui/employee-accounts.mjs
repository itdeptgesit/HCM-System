import assert from 'node:assert/strict';
import { isEmployeeAccount, isActiveEmployee, isHRAccount } from '../../lib/workforce-contract.ts';

const administrator = { full_name: 'Administrator', role: 'Super Admin', employee_code: '2610001', status: 'Active' };
assert.equal(isEmployeeAccount(administrator), false);
assert.equal(isEmployeeAccount({ fullName: ' Administrator ', role: 'SUPER_ADMIN' }), false);
assert.equal(isEmployeeAccount({ full_name: "Rudi Si'arudin", role: 'Super Admin' }), true);
assert.equal(isEmployeeAccount({ full_name: 'TEST Karyawan', role: 'Admin' }), true);
assert.equal(isEmployeeAccount({ full_name: 'TEST Karyawan', role: 'Employee' }), true);
assert.equal(isEmployeeAccount({ full_name: 'TEST System', is_employee: false }), false);
assert.equal(isActiveEmployee(administrator), true);
assert.equal(isHRAccount(administrator), true);
console.log('PASS: system Administrator excluded; real employee admins retained; active/login and HR authorization predicates unchanged.');
