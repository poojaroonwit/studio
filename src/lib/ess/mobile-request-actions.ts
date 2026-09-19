import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

import { getPool } from '@/lib/db';
import { cancelOwnLeaveRequest, createEssGroupedLeaveRequest } from '@/lib/hr/ess-service';

export type MobileEssRequestIdentity = {
  userId: string;
  employeeId: string;
  email: string;
};

type DbRow = Record<string, unknown>;

function text(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isoDate(value: unknown) {
  if (!(value instanceof Date) && typeof value !== 'string') return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function errorResponse(error: unknown, fallback: string) {
  return NextResponse.json({ error: error instanceof Error ? error.message : fallback }, { status: 400 });
}

export async function createMobileLeaveRequest(identity: MobileEssRequestIdentity, body: Record<string, unknown>) {
  const policyId = text(body.policyId, 80);
  const startDate = text(body.startDate, 10);
  const endDate = text(body.endDate, 10);
  const reason = text(body.reason, 1000);
  const emergencyContact = text(body.emergencyContact, 500);

  if (!policyId || !/^[0-9a-f-]{36}$/i.test(policyId) || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: 'Choose an available leave policy and valid dates' }, { status: 400 });
  }
  if (!emergencyContact) return NextResponse.json({ error: 'Choose an emergency contact before submitting leave' }, { status: 400 });

  try {
    const result = await createEssGroupedLeaveRequest(identity.userId, identity.email, {
      startDate,
      endDate,
      policyId,
      requestUnit: 'full_day',
      halfDayPeriod: null,
      requestedHours: null,
      reason: reason || null,
      emergencyContact,
      handoverInformation: null,
      actingEmployeeId: null,
      saveAsDraft: false,
    });
    const segment = result.segments[0] as DbRow | undefined;
    return NextResponse.json({
      id: segment?.id ? String(segment.id) : result.id,
      requestGroupId: result.requestGroupId,
      startDate: isoDate(segment?.start_date || startDate),
      endDate: isoDate(segment?.end_date || endDate),
      days: Number(segment?.days || 0),
      status: String(segment?.status || 'pending_approval'),
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Unable to create leave request');
  }
}

export async function cancelMobileLeaveRequest(identity: MobileEssRequestIdentity, id: string) {
  try {
    const result = await cancelOwnLeaveRequest(identity.userId, identity.email, id, 'cancel');
    if (!result) return NextResponse.json({ error: 'Leave request changed or can no longer be cancelled' }, { status: 409 });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, 'Unable to cancel leave request');
  }
}

export async function createMobileSupportTicket(identity: MobileEssRequestIdentity, body: Record<string, unknown>) {
  const subject = text(body.subject, 180);
  const message = text(body.message, 5000);
  const category = text(body.category, 100) || 'general';
  if (!subject || !message) return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });

  const id = randomUUID();
  const requestNumber = `ESS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
  await getPool().query(
    `INSERT INTO employee_support_requests
       (id, request_number, requester_user_id, employee_id, category, subject, description, status, priority, metadata, submitted_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', 'normal', $8::jsonb, NOW(), NOW(), NOW())`,
    [id, requestNumber, identity.userId, identity.employeeId, category, subject, message, JSON.stringify({ source: 'ess-mobile' })],
  );
  return NextResponse.json({ id, status: 'submitted' }, { status: 201 });
}

export async function replyMobileSupportTicket(identity: MobileEssRequestIdentity, id: string, body: Record<string, unknown>) {
  const message = text(body.message, 5000);
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

  const owned = await getPool().query(
    `SELECT id, status FROM employee_support_requests
      WHERE id = $1::uuid AND employee_id = $2::uuid LIMIT 1`,
    [id, identity.employeeId],
  );
  const request = owned.rows[0] as DbRow | undefined;
  if (!request) return NextResponse.json({ error: 'HR request not found' }, { status: 404 });
  if (['resolved', 'closed', 'cancelled', 'canceled'].includes(String(request.status || '').toLowerCase())) {
    return NextResponse.json({ error: 'This HR request is closed. Create a new request to continue.' }, { status: 409 });
  }

  await getPool().query(
    `INSERT INTO employee_support_activities
       (id, request_id, actor_user_id, action, message, visibility, metadata, created_at)
     VALUES ($1, $2::uuid, $3::uuid, 'requester_message', $4, 'requester', '{}'::jsonb, NOW())`,
    [randomUUID(), id, identity.userId, message],
  );
  await getPool().query(
    `UPDATE employee_support_requests SET updated_at = NOW() WHERE id = $1::uuid AND employee_id = $2::uuid`,
    [id, identity.employeeId],
  );
  return NextResponse.json({ success: true }, { status: 201 });
}
