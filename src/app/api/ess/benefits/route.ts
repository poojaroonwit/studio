import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logAudit } from '@/lib/auditLog';
import { getEmployeeForUser } from '@/lib/hr/ess-service';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const applicationSchema = z.object({
  benefitPlanId: z.string().uuid(),
  effectiveFrom: z.string().date(),
  lifeEventType: z.enum(['new_enrollment', 'marriage', 'birth_or_adoption', 'loss_of_coverage', 'other']).default('new_enrollment'),
  dependents: z.array(z.object({ name: z.string().trim().min(2).max(160), relationship: z.string().trim().min(2).max(80) })).max(20).default([]),
});

async function context() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const employee = await getEmployeeForUser(session.user.id, session.user.email);
  return employee ? { session, employee } : null;
}

export async function GET() {
  const access = await context();
  if (!access) return NextResponse.json({ error: 'An employee account is required.' }, { status: 401 });
  const now = new Date();
  const [plans, enrollmentRows] = await Promise.all([
    prisma.benefitPlan.findMany({
      where: {
        isActive: true,
        OR: [{ companyId: access.employee.company_id }, { companyId: null }],
        AND: [{ OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] }, { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] }],
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    }),
    prisma.employeeBenefitEnrollment.findMany({
      where: { employeeId: access.employee.id },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const planById = new Map(plans.map(plan => [plan.id, plan]));
  const missingPlanIds = enrollmentRows.map(row => row.benefitPlanId).filter(id => !planById.has(id));
  if (missingPlanIds.length) {
    const historicalPlans = await prisma.benefitPlan.findMany({ where: { id: { in: missingPlanIds } } });
    historicalPlans.forEach(plan => planById.set(plan.id, plan));
  }
  const enrollments = enrollmentRows.map(row => ({ ...row, benefitPlan: planById.get(row.benefitPlanId) }));
  return NextResponse.json({
    data: {
      employee: { id: access.employee.id, name: [access.employee.preferred_name || access.employee.first_name, access.employee.last_name].filter(Boolean).join(' ') },
      plans,
      enrollments,
    },
  });
}

export async function POST(request: Request) {
  const access = await context();
  if (!access) return NextResponse.json({ error: 'An employee account is required.' }, { status: 401 });
  const parsed = applicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid benefit application.' }, { status: 422 });
  if (parsed.data.effectiveFrom < new Date().toISOString().slice(0, 10)) return NextResponse.json({ error: 'Coverage start cannot be in the past.' }, { status: 422 });

  const plan = await prisma.benefitPlan.findFirst({ where: { id: parsed.data.benefitPlanId, isActive: true, OR: [{ companyId: access.employee.company_id }, { companyId: null }] } });
  if (!plan) return NextResponse.json({ error: 'This benefit plan is not available to your company.' }, { status: 404 });
  const existing = await prisma.employeeBenefitEnrollment.findUnique({ where: { employeeId_benefitPlanId: { employeeId: access.employee.id, benefitPlanId: plan.id } } });
  if (existing && !['ended', 'cancelled', 'rejected'].includes(existing.status)) return NextResponse.json({ error: 'You already have an active or pending application for this plan.' }, { status: 409 });

  const enrollment = await prisma.employeeBenefitEnrollment.upsert({
    where: { employeeId_benefitPlanId: { employeeId: access.employee.id, benefitPlanId: plan.id } },
    create: { employeeId: access.employee.id, benefitPlanId: plan.id, companyId: access.employee.company_id, status: 'pending_approval', effectiveFrom: new Date(`${parsed.data.effectiveFrom}T00:00:00.000Z`), lifeEventType: parsed.data.lifeEventType, dependents: parsed.data.dependents, employeeContribution: plan.employeeCost, employerContribution: plan.employerCost },
    update: { status: 'pending_approval', endedAt: null, effectiveTo: null, effectiveFrom: new Date(`${parsed.data.effectiveFrom}T00:00:00.000Z`), lifeEventType: parsed.data.lifeEventType, dependents: parsed.data.dependents, employeeContribution: plan.employeeCost, employerContribution: plan.employerCost, version: { increment: 1 } },
  });
  await logAudit('AUDIT', `Employee applied for benefit plan '${plan.name}'.`, 'API:ESS:Benefits:Apply', access.session.user.id, { enrollmentId: enrollment.id, benefitPlanId: plan.id });
  return NextResponse.json({ data: enrollment }, { status: 201 });
}
