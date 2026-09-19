import type { HrResourceConfig } from './hr-resource-registry';

export type HrCrudRecord = Record<string, unknown> & { id: string };

export function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function quoteTable(identifier: string) {
  return identifier.split('.').map(part => quoteIdent(part)).join('.');
}

export function rowToClientRecord(row: Record<string, unknown>, config: HrResourceConfig): HrCrudRecord {
  const record: HrCrudRecord = { id: String(row.id) };
  for (const field of config.fields) record[field.name] = row[field.column];
  record.createdAt = row.created_at;
  record.updatedAt = row.updated_at;

  if (config.key === 'people') {
    record.applicantId = row.applicant_id || null;
    record.applicant = row.applicant_profile || null;
    record.personProfileId = row.person_profile_id || null;
    record.personProfile = row.person_profile || null;
    record.onboardingStatus = row.onboarding_status || 'not_started';
    record.managerId = row.manager_id || null;
    record.departmentId = row.department_id || null;
    record.departmentName = row.department_name || null;
    record.managerName = row.manager_name || null;
    record.positionId = row.position_id || null;
    record.positionTitle = row.position_title || null;
    record.clientName = row.client_name || null;
    record.clientCode = row.client_code || null;
    record.probationPeriodDays = row.probation_period_days ?? null;
    record.probationEvaluationFrequencyDays = row.probation_evaluation_frequency_days ?? null;
    record.positionProbationPeriodDays = Number(row.position_probation_period_days || 90);
    record.positionProbationEvaluationFrequencyDays = Number(row.position_probation_evaluation_frequency_days || 30);
    record.accountUserId = row.account_user_id || null;
    record.accountEmail = row.account_email || null;
    record.accountName = row.account_name || null;
    record.employeeAvatarUrl = row.employee_avatar_url || null;
    record.accountRole = row.account_role || null;
    record.accountIsActive = row.account_is_active ?? null;
    record.accountForcePasswordChange = row.account_force_password_change ?? null;
    record.accountLastLogin = row.account_last_login
      ? new Date(row.account_last_login as string | number | Date).toISOString()
      : null;
    record.accountLinkedByEmail = Boolean(row.account_user_id) && row.account_linked_by_email === true;

    for (const [clientKey, databaseKey] of Object.entries({
      legalName: 'legal_name',
      businessUnit: 'business_unit',
      workPhone: 'work_phone',
      address: 'address',
      emergencyContacts: 'emergency_contacts',
      familyDependents: 'family_dependents',
      bankInformation: 'bank_information',
      taxInformation: 'tax_information',
      governmentIdentification: 'government_identification',
      education: 'education',
      workExperience: 'work_experience',
      skills: 'skills',
      certifications: 'certifications',
      languages: 'languages',
      profileCompletion: 'profile_completion',
    })) record[clientKey] = row[databaseKey] ?? null;
  }

  if (config.key === 'teams') {
    record.employeeCount = Number(row.employee_count || 0);
    record.headcountUsage = Number(row.headcount_usage || 0);
  }
  if (config.key === 'clients') record.employeeCount = Number(row.employee_count || 0);
  return record;
}
