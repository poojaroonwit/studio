import { randomUUID } from 'crypto';
import prisma from '../src/lib/prisma';

async function main() {
  const employees = await prisma.$queryRawUnsafe<Array<{ id: string; company_id: string | null; hire_date: Date | null }>>(
    `SELECT id, company_id, hire_date FROM hr_employees
     WHERE status IN ('active','probation','onboarding') ORDER BY employee_number LIMIT 40`,
  );
  if (!employees.length) {
    console.log('Payroll seed skipped: seed HR employees first.');
    return;
  }
  const companyIds = [...new Set(employees.map(employee => employee.company_id).filter(Boolean))] as string[];
  for (const companyId of companyIds.length ? companyIds : [null]) {
    const groupRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO hr_payroll_groups
        (id, company_id, code, name, pay_frequency, currency, timezone, payment_method, cutoff_day, pay_day, effective_from)
       VALUES ($1::uuid, $2::uuid, 'TH-MONTHLY', 'Thailand Monthly Salaried', 'monthly', 'THB', 'Asia/Bangkok', 'bank_transfer', 24, 28, '2026-01-01')
       ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now() RETURNING id`, randomUUID(), companyId,
    );
    const groupId = groupRows[0].id;
    const periodName = companyId ? `July 2026 · ${companyId.slice(0, 6).toUpperCase()}` : 'July 2026 · Global Monthly';
    const periodRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO hr_payroll_periods(id, name, start_date, end_date, pay_date, status, company_id, payroll_group_id, version, created_at, updated_at)
       VALUES ($1::uuid, $2, '2026-07-01', '2026-07-31', '2026-07-31', 'open', $3::uuid, $4::uuid, 1, now(), now())
       ON CONFLICT (name) DO UPDATE SET company_id = EXCLUDED.company_id, payroll_group_id = EXCLUDED.payroll_group_id, updated_at = now() RETURNING id`,
      randomUUID(), periodName, companyId, groupId,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO hr_payroll_rule_sets
        (id, company_id, jurisdiction, name, legal_version, effective_from, status, rules, reviewed_by, version)
       VALUES ($1::uuid, $2::uuid, 'TH', 'Thailand payroll review baseline', 'TH-REVIEW-2026.1', '2026-01-01',
               'draft', $3::jsonb, 'Requires qualified payroll review', 1)
       ON CONFLICT (company_id, jurisdiction, legal_version) DO NOTHING`,
      randomUUID(), companyId, JSON.stringify({ currency: 'THB', roundingDecimals: 2, authoritative: false }),
    );
    const scoped = employees.filter(employee => employee.company_id === companyId || companyId === null);
    for (let index = 0; index < scoped.length; index += 1) {
      const employee = scoped[index];
      const salary = 42000 + (index % 8) * 6500;
      await prisma.$executeRawUnsafe(
        `INSERT INTO hr_employee_payroll_profiles
          (id, employee_id, company_id, payroll_group_id, payment_method, payment_currency,
           bank_account_reference, tax_profile_reference, payroll_start_date, status, version)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'bank_transfer', 'THB', $5, $6, $7::date, 'active', 1)
         ON CONFLICT (employee_id) DO UPDATE SET payroll_group_id = EXCLUDED.payroll_group_id,
           company_id = EXCLUDED.company_id, updated_at = now()`,
        randomUUID(), employee.id, companyId, groupId, `PAY-${String(index + 1).padStart(4, '0')}`,
        `TAX-${String(index + 1).padStart(4, '0')}`, employee.hire_date || '2026-01-01',
      );
      await prisma.$executeRawUnsafe(
        `INSERT INTO hr_compensation_packages
          (id, employee_id, company_id, base_salary, currency, pay_frequency, effective_from,
           components, reason, status, version, created_at, updated_at)
         SELECT $1::uuid, $2::uuid, $3::uuid, $4, 'THB', 'monthly', '2026-01-01',
                $5::jsonb, '2026 compensation baseline', 'approved', 1, now(), now()
         WHERE NOT EXISTS (SELECT 1 FROM hr_compensation_packages package WHERE package.employee_id = $2::uuid
           AND package.effective_from = '2026-01-01'::date)`,
        randomUUID(), employee.id, companyId, salary,
        JSON.stringify([{ code: 'BASE_SALARY', label: 'Base salary', amount: salary, recurring: true }]),
      );
    }
    const planName = companyId ? `Core Medical · ${companyId.slice(0, 6).toUpperCase()}` : 'Core Medical · Global';
    const planRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO hr_benefit_plans
        (id, company_id, name, type, description, employer_cost, employee_cost, is_active,
         eligibility_rules, provider_code, effective_from, version, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, 'health_insurance', 'Core employee medical coverage', 1850, 450, true,
               $4::jsonb, 'BKK-HEALTH-CORE', '2026-01-01', 1, now(), now())
       ON CONFLICT (name) DO UPDATE SET employer_cost = EXCLUDED.employer_cost, employee_cost = EXCLUDED.employee_cost, updated_at = now()
       RETURNING id`, randomUUID(), companyId, planName,
      JSON.stringify({ employmentStatuses: ['active','probation'], waitingDays: 30 }),
    );
    for (const employee of scoped.slice(0, Math.max(1, Math.floor(scoped.length * 0.75)))) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO hr_employee_benefit_enrollments
          (id, employee_id, benefit_plan_id, company_id, status, effective_from,
           employee_contribution, employer_contribution, enrolled_at, version, created_at, updated_at)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'active', '2026-01-01', 450, 1850, now(), 1, now(), now())
         ON CONFLICT (employee_id, benefit_plan_id) DO NOTHING`, randomUUID(), employee.id, planRows[0].id, companyId,
      );
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO hr_payroll_runs
        (id, period_id, company_id, payroll_group_id, run_type, status, idempotency_key, employee_count, version, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'regular', 'draft', $5, 0, 1, now(), now())
       ON CONFLICT (company_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`,
      randomUUID(), periodRows[0].id, companyId, groupId, `seed:regular:${companyId || 'global'}:2026-07`,
    );
  }
  console.log(`Payroll seed ready for ${employees.length} employees.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
