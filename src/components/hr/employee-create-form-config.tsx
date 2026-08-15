import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

export const structuredEmployeeFields = [
  ["personalInformation", "Personal information", "{}"],
  ["address", "Address", "{}"],
  ["familyDependents", "Family and dependents", "[]"],
  ["bankInformation", "Bank information", "{}"],
  ["taxInformation", "Tax information", "{}"],
  ["governmentIdentification", "Government identification", "{}"],
  ["education", "Education", "[]"],
  ["workExperience", "Work experience", "[]"],
  ["skills", "Skills", "[]"],
  ["certifications", "Certifications", "[]"],
  ["languages", "Languages", "[]"],
] as const;

export function initialEmployeeDetails() {
  return {
    employeeNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    employmentType: "full_time",
    status: "onboarding",
    hireDate: new Date().toISOString().slice(0, 10),
    location: "",
    preferredName: "",
    departmentId: "",
    managerId: "",
    positionId: "",
    companyId: "",
    clientId: "",
    endDate: "",
    contractNoticeDays: "30",
    probationPeriodDays: "",
    probationEvaluationFrequencyDays: "",
    legalName: "",
    businessUnit: "",
    workPhone: "",
    profilePhotoUrl: "",
    profileCompletion: "35",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    ...Object.fromEntries(
      structuredEmployeeFields.map(([key, , fallback]) => [key, fallback]),
    ),
  } as Record<string, string>;
}

export type CreationSource = "direct" | "applicant";
export type DirectStep = "core" | "work" | "personal" | "compliance" | "review";

export const directSteps: Array<{
  id: DirectStep;
  label: string;
  description: string;
}> = [
  { id: "core", label: "Core record", description: "Required identity" },
  { id: "work", label: "Work assignment", description: "Role and reporting" },
  {
    id: "personal",
    label: "Personal & contact",
    description: "Contact information",
  },
  { id: "compliance", label: "Compliance", description: "Contract and records" },
  { id: "review", label: "Review", description: "Check and create" },
];

export function HorizontalFieldRow({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center">
      <div>
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-red-600"> *</span>}
        </Label>
        {hint && (
          <p className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
