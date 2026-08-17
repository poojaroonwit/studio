import type { Prisma } from "@prisma/client";

import { logAudit } from "@/lib/auditLog";
import prisma from "@/lib/prisma";
import type { PayrollAccess, PayrollActionInput } from "./contracts";
import { PayrollServiceError } from "./service-foundation";
import { toSqlDate } from "./date-only";

type Db = Prisma.TransactionClient | typeof prisma;
type Row = Record<string, unknown>;

function number(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function collectInputs(
  client: Db,
  run: Row,
  actorId: string,
) {
  const runId = String(run.id);
  const companyId = run.company_id ? String(run.company_id) : null;
  const period = await client.$queryRawUnsafe<Row[]>(
    `SELECT start_date, end_date
       FROM hr_payroll_periods
      WHERE id = $1::uuid
      LIMIT 1`,
    String(run.period_id),
  );

  if (!period[0]) {
    throw new PayrollServiceError(
      "PERIOD_NOT_FOUND",
      "Payroll inputs cannot be collected because this run has no payroll period. Select a valid period and try again.",
      409,
    );
  }

  // Prisma returns PostgreSQL DATE values as JavaScript Date objects. Never
  // pass Date.toString() output to a raw $n::date parameter; PostgreSQL cannot
  // parse strings such as "Wed Aug 12 2026 ...". Bind canonical date-only text.
  const start = toSqlDate(period[0].start_date);
  const end = toSqlDate(period[0].end_date);

  await client.$executeRawUnsafe(
    `INSERT INTO hr_payroll_inputs
      (id, company_id, payroll_run_id, employee_id, input_type, component_code, amount, currency,
       source_module, source_record_id, effective_date, approval_status, status, idempotency_key, created_by_id)
     SELECT gen_random_uuid(), claim.company_id, $1::uuid, claim.employee_id, 'earning', 'EXPENSE_REIMBURSEMENT',
            claim.employee_reimbursement, claim.reimbursement_currency, 'expenses', claim.id::text,
            claim.period_end, 'approved', 'ready', concat('expense-claim:', claim.id::text, ':', $1), $2::uuid
       FROM expense_claims claim
      WHERE claim.status = 'approved'
        AND claim.employee_reimbursement > 0
        AND claim.period_end BETWEEN $3::date AND $4::date
        AND ($5::uuid IS NULL OR claim.company_id = $5::uuid)
     ON CONFLICT (company_id, idempotency_key) DO NOTHING`,
    runId,
    actorId,
    start,
    end,
    companyId,
  );

  await client.$executeRawUnsafe(
    `UPDATE hr_payroll_inputs
        SET payroll_run_id = $1::uuid, updated_at = now()
      WHERE payroll_run_id IS NULL
        AND approval_status = 'approved'
        AND status = 'ready'
        AND effective_date BETWEEN $2::date AND $3::date
        AND ($4::uuid IS NULL OR company_id = $4::uuid)`,
    runId,
    start,
    end,
    companyId,
  );

  return client.$queryRawUnsafe<Row[]>(
    `UPDATE hr_payroll_runs
        SET status = 'collecting_inputs', version = version + 1, updated_at = now()
      WHERE id = $1::uuid
      RETURNING *`,
    runId,
  );
}

export async function collectPayrollInputs(
  input: PayrollActionInput,
  access: PayrollAccess,
  actorId: string,
) {
  if (!access.canManage) {
    throw new PayrollServiceError(
      "FORBIDDEN",
      "Payroll management permission is required.",
      403,
    );
  }

  if (input.action !== "collect_inputs") {
    throw new PayrollServiceError(
      "INVALID_ACTION",
      "This payroll operation only supports input collection.",
      400,
    );
  }

  try {
    const result = await prisma.$transaction(async (client) => {
      const rows = await client.$queryRawUnsafe<Row[]>(
        `SELECT *
           FROM hr_payroll_runs
          WHERE id = $1::uuid
            AND version = $2
            AND ($3::uuid IS NULL OR company_id = $3::uuid)
          FOR UPDATE`,
        input.runId,
        input.expectedVersion,
        access.actorCompanyId,
      );
      const run = rows[0];
      if (!run) {
        throw new PayrollServiceError(
          "CONCURRENT_UPDATE",
          "The payroll run changed or is outside your company scope. Refresh and try again.",
          409,
        );
      }

      const status = String(run.status);
      if (
        !["draft", "collecting_inputs", "returned_for_correction"].includes(
          status,
        )
      ) {
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "Inputs can only be collected before review.",
          409,
        );
      }

      const collected = await collectInputs(client, run, actorId);
      return { run, collected: collected[0] };
    });

    await logAudit(
      "AUDIT",
      "Payroll run collect_inputs.",
      "Payroll:Run:collect_inputs",
      actorId,
      {
        runId: input.runId,
        entity: "payroll-run",
        entityId: input.runId,
        fromStatus: String(result.run.status),
        toStatus: String(result.collected?.status || "collecting_inputs"),
        version: number(result.collected?.version),
      },
    );

    return result.collected;
  } catch (error) {
    if (error instanceof PayrollServiceError) throw error;
    console.error("[Payroll workspace] input collection failed", error);
    throw new PayrollServiceError(
      "INPUT_COLLECTION_FAILED",
      "Payroll could not collect the inputs. Check the payroll period and approved input records, then try again.",
      500,
    );
  }
}
