import { describe, expect, it } from 'vitest';

import { calculateEmployeeReadiness } from './employee-readiness';

const completeEmployee = {
  employeeNumber: 'EMP-1',
  firstName: 'Mika',
  lastName: 'Chen',
  legalName: 'Mika Chen',
  phone: '0800000000',
  address: { city: 'Bangkok' },
  emergencyContacts: [{ name: 'Pat' }],
  companyId: 'company',
  departmentId: 'department',
  positionId: 'position',
  jobTitle: 'Engineer',
  employmentType: 'full_time',
  status: 'active',
  hireDate: '2026-01-01',
  bankInformation: { bank: 'SCB' },
  taxInformation: { taxId: 'masked' },
  governmentIdentification: { nationalId: 'masked' },
  baseSalary: 50000,
  compensationCurrency: 'THB',
  payFrequency: 'monthly',
  compensationEffectiveFrom: '2026-01-01',
  payrollProfileId: 'payroll-profile',
  payrollGroupId: 'monthly-th',
  paymentMethod: 'bank_transfer',
  taxProfileReference: 'tax-profile',
  statutoryProfileReference: 'social-security-profile',
  payrollStartDate: '2026-01-01',
  accountUserId: 'user',
  accountIsActive: true,
  accountForcePasswordChange: false,
  requiredDocumentOpenCount: 0,
  requiredOnboardingOpenCount: 0,
};

describe('employee readiness', () => {
  it('treats salary and payroll setup as blocking readiness requirements', () => {
    const result = calculateEmployeeReadiness({
      ...completeEmployee,
      baseSalary: 0,
      payrollGroupId: null,
    });

    expect(result.ready).toBe(false);
    expect(result.missing.map(item => item.id)).toEqual(
      expect.arrayContaining(['compensation-package', 'payroll-group']),
    );
  });

  it('does not expose sensitive source values in the readiness result', () => {
    const result = calculateEmployeeReadiness(completeEmployee);
    expect(JSON.stringify(result)).not.toContain('50000');
    expect(JSON.stringify(result)).not.toContain('0800000000');
    expect(result.ready).toBe(true);
  });

  it('requires onboarding assignment while an employee is onboarding', () => {
    const result = calculateEmployeeReadiness({
      ...completeEmployee,
      status: 'onboarding',
      onboardingAssigned: false,
    });
    expect(result.missing.some(item => item.id === 'onboarding-assigned')).toBe(true);
  });

  it('requires client and contract end date for subcontract employees', () => {
    const result = calculateEmployeeReadiness({
      ...completeEmployee,
      employmentType: 'subcontract',
      clientId: null,
      endDate: null,
      statutoryProfileReference: null,
    });
    expect(result.missing.map(item => item.id)).toEqual(
      expect.arrayContaining(['client', 'end-date']),
    );
    expect(result.missing.some(item => item.id === 'statutory-profile')).toBe(false);
  });
});
