import { randomUUID } from 'crypto';

import { getPool } from '@/lib/db';

type JsonRow = Record<string, unknown>;

function stringValue(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function jsonArray(value: unknown): JsonRow[] {
  return Array.isArray(value)
    ? value.filter(item => item && typeof item === 'object') as JsonRow[]
    : [];
}

function contactIndex(contacts: JsonRow[], contactId: string) {
  const exact = contacts.findIndex(item => String(item.id || '') === contactId);
  if (exact >= 0) return exact;

  const synthetic = contactId.match(/^contact-(\d+)$/);
  if (!synthetic) return -1;
  const index = Number(synthetic[1]);
  if (!Number.isInteger(index) || index < 0 || index >= contacts.length) return -1;
  return contacts[index]?.id ? -1 : index;
}

export async function writeMobileEmergencyContact(
  employeeId: string,
  body: JsonRow,
  contactId?: string,
) {
  const employeeResult = await getPool().query(
    'SELECT emergency_contacts FROM hr_employees WHERE id = $1',
    [employeeId],
  );
  const contacts = jsonArray((employeeResult.rows[0] as JsonRow | undefined)?.emergency_contacts);
  const index = contactId ? contactIndex(contacts, contactId) : -1;
  if (contactId && index < 0) return { error: 'Emergency contact not found', status: 404 } as const;

  const previous = index >= 0 ? contacts[index] : {};
  const id = stringValue(previous.id, 80) || randomUUID();
  const contact = {
    ...previous,
    id,
    name: stringValue(body.name ?? previous.name, 120),
    relationship: stringValue(body.relationship ?? previous.relationship, 80),
    phone: stringValue(body.phone ?? previous.phone, 50),
    primary: typeof body.primary === 'boolean' ? body.primary : previous.primary === true,
  };
  if (!contact.name || !contact.relationship || !contact.phone) {
    return { error: 'Name, relationship and phone are required', status: 400 } as const;
  }

  if (contact.primary) contacts.forEach(item => { item.primary = false; });
  if (index >= 0) contacts[index] = contact;
  else contacts.push(contact);

  await getPool().query(
    'UPDATE hr_employees SET emergency_contacts = $2::jsonb, updated_at = NOW(), version = version + 1 WHERE id = $1',
    [employeeId, JSON.stringify(contacts)],
  );
  return { contact } as const;
}

export async function deleteMobileEmergencyContact(employeeId: string, contactId: string) {
  const employeeResult = await getPool().query(
    'SELECT emergency_contacts FROM hr_employees WHERE id = $1',
    [employeeId],
  );
  const contacts = jsonArray((employeeResult.rows[0] as JsonRow | undefined)?.emergency_contacts);
  const index = contactIndex(contacts, contactId);
  if (index < 0) return false;

  contacts.splice(index, 1);
  await getPool().query(
    'UPDATE hr_employees SET emergency_contacts = $2::jsonb, updated_at = NOW(), version = version + 1 WHERE id = $1',
    [employeeId, JSON.stringify(contacts)],
  );
  return true;
}
