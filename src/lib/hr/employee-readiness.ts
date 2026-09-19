export type EmployeeReadinessSectionId =
  | 'personal'
  | 'employment'
  | 'payroll'
  | 'compliance'
  | 'account'
  | 'onboarding';

export type EmployeeReadinessOwner = 'employee' | 'people' | 'payroll' | 'it';

export type EmployeeReadinessCheck = {
  id: string;
  label: string;
  section: EmployeeReadinessSectionId;
  owner: EmployeeReadinessOwner;
  complete: boolean;
  blocking: boolean;
};

export type EmployeeReadinessSection = {
  id: EmployeeReadinessSectionId;
  label: string;
  complete: number;
  total: number;
  percent: number;
  missing: number;
};

export type EmployeeReadiness = {
  ready: boolean;
  percent: number;
  complete: number;
  total: number;
  missingCount: number;
  missing: EmployeeReadinessCheck[];
  sections: EmployeeReadinessSection[];
};

const SECTION_LABELS: Record<EmployeeReadinessSectionId, string> = {
  personal: 'Personal information',
  employment: 'Employment setup',
  payroll: 'Compensation & payroll',
  compliance: 'Identity & compliance',
  account: 'Account & access',
  onboarding: 'Workplace onboarding',
};

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasValue);
  }
  return true;
}

function positiveAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

function zeroOrMissing(value: unknown) {
  if (value === null || value === undefined || value === '') return true;
  const count = Number(value);
  return Number.isFinite(count) && count <= 0;
}

function bool(value: unknown) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function check(
  id: string,
  label: string,
  section: EmployeeReadinessSectionId,
  owner: EmployeeReadinessOwner,
  complete: boolean,
  blocking = true,
): EmployeeReadinessCheck {
  return { id, label, section, owner, complete, blocking };
}

/**
 * Calculates whether an employee is operationally ready, rather than merely
 * whether a profile form has been filled in. The result deliberately contains
 * no salary amount, bank number, tax identifier, or other sensitive value.
 */
export function calculateEmployeeReadiness(values: Record<string, unknown>): EmployeeReadiness {
  const employmentType = String(values.employmentType || values.employment_type || '').toLowerCase();
  const employeeStatus = String(values.status || '').toLowerCase();
  const isSubcontract = employmentType === 'subcontract';
  const isFixedTerm = Boolean(employmentType && employmentType !== 'full_time' && employmentType !== 'permanent');
  const isProbation = employeeStatus === 'probation';

  const legalNameReady = hasValue(values.legalName)
    || (hasValue(values.firstName) && hasValue(values.lastName));
  const personalContactReady = hasValue(values.personalPhone) || hasValue(values.phone);
  const bankReady = hasValue(values.bankInformation) || hasValue(values.bankAccountReference);
  const taxReady = hasValue(values.taxInformation) || hasValue(values.taxProfileReference);
  const accountLinked = hasValue(values.accountUserId);
  const accountActive = accountLinked && values.accountIsActive !== false && values.accountIsActive !== 'false';
  const accountSetupComplete = accountActive && !bool(values.accountForcePasswordChange);
  const onboardingAssigned = bool(values.onboardingAssigned) || hasValue(values.onboardingCaseId);
  const onboardingRequiredForStatus = employeeStatus === 'onboarding' || employeeStatus === 'probation';

  const checks: EmployeeReadinessCheck[] = [
    check('legal-name', 'Legal name', 'personal', 'employee', legalNameReady),
    check('personal-contact', 'Personal phone or contact', 'personal', 'employee', personalContactReady),
    check('address', 'Address', 'personal', 'employee', hasValue(values.address)),
    check('emergency-contact', 'Emergency contact', 'personal', 'employee', hasValue(values.emergencyContacts)),

    check('company', 'Company assignment', 'employment', 'people', hasValue(values.companyId)),
    check('department', 'Department assignment', 'employment', 'people', hasValue(values.departmentId)),
    check('position', 'Position or job title', 'employment', 'people', hasValue(values.positionId) || hasValue(values.jobTitle)),
    check('employment-type', 'Employment type', 'employment', 'people', hasValue(values.employmentType)),
    check('employment-status', 'Employment status', 'employment', 'people', hasValue(values.status)),
    check('hire-date', 'Hire / start date', 'employment', 'people', hasValue(values.hireDate)),
    ...(isSubcontract
      ? [check('client', 'Client assignment', 'employment', 'people', hasValue(values.clientId))]
      : []),
    ...(isFixedTerm
      ? [check('end-date', 'Contract end date', 'employment', 'people', hasValue(values.endDate))]
      : []),
    ...(isProbation
      ? [
          check('probation-period', 'Probation period', 'employment', 'people', hasValue(values.probationPeriodDays)),
          check('probation-frequency', 'Probation review frequency', 'employment', 'people', hasValue(values.probationEvaluationFrequencyDays)),
        ]
      : []),

    check('compensation-package', 'Approved compensation package', 'payroll', 'payroll', positiveAmount(values.baseSalary)),
    check('compensation-currency', 'Salary currency', 'payroll', 'payroll', hasValue(values.compensationCurrency) || hasValue(values.currency)),
    check('pay-frequency', 'Pay frequency', 'payroll', 'payroll', hasValue(values.payFrequency)),
    check('compensation-effective-date', 'Compensation effective date', 'payroll', 'payroll', hasValue(values.compensationEffectiveFrom)),
    check('payroll-profile', 'Active payroll profile', 'payroll', 'payroll', hasValue(values.payrollProfileId)),
    check('payroll-group', 'Payroll group', 'payroll', 'payroll', hasValue(values.payrollGroupId)),
    check('payment-method', 'Payment method', 'payroll', 'payroll', hasValue(values.paymentMethod)),
    check('bank-details', 'Bank / payment destination', 'payroll', 'employee', bankReady),
    check('tax-profile', 'Tax setup', 'payroll', 'payroll', taxReady),
    ...(!isSubcontract
      ? [check('statutory-profile', 'Statutory / social-security setup', 'payroll', 'payroll', hasValue(values.statutoryProfileReference))]
      : []),
    check('payroll-start-date', 'Payroll start date', 'payroll', 'payroll', hasValue(values.payrollStartDate)),

    check('government-id', 'Government identification', 'compliance', 'employee', hasValue(values.governmentIdentification)),
    check('required-documents', 'Required document acknowledgements', 'compliance', 'employee', zeroOrMissing(values.requiredDocumentOpenCount)),

    check('account-linked', 'Outborn Account linked', 'account', 'it', accountLinked),
    check('account-active', 'Account active', 'account', 'it', accountActive),
    check('account-setup', 'Invitation / first sign-in completed', 'account', 'employee', accountSetupComplete),

    ...(onboardingRequiredForStatus
      ? [check('onboarding-assigned', 'Onboarding journey assigned', 'onboarding', 'people', onboardingAssigned)]
      : []),
    check('onboarding-required-tasks', 'Required onboarding tasks', 'onboarding', 'people', zeroOrMissing(values.requiredOnboardingOpenCount)),
  ];

  const blocking = checks.filter(item => item.blocking);
  const complete = blocking.filter(item => item.complete).length;
  const total = blocking.length;
  const missing = blocking.filter(item => !item.complete);

  const sectionOrder: EmployeeReadinessSectionId[] = [
    'personal',
    'employment',
    'payroll',
    'compliance',
    'account',
    'onboarding',
  ];
  const sections = sectionOrder.map(id => {
    const sectionChecks = blocking.filter(item => item.section === id);
    const sectionComplete = sectionChecks.filter(item => item.complete).length;
    return {
      id,
      label: SECTION_LABELS[id],
      complete: sectionComplete,
      total: sectionChecks.length,
      percent: sectionChecks.length ? Math.round((sectionComplete / sectionChecks.length) * 100) : 100,
      missing: sectionChecks.length - sectionComplete,
    };
  });

  return {
    ready: missing.length === 0,
    percent: total ? Math.round((complete / total) * 100) : 100,
    complete,
    total,
    missingCount: missing.length,
    missing,
    sections,
  };
}
