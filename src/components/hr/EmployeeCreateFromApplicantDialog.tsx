"use client";

import * as React from "react";
import {
  CheckIcon,
  ChevronUpDownIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useDropdownOptions } from "@/hooks/use-dropdown-options";
import { defaultDropdownOptions } from "@/lib/dropdown-option-catalog";
import { cn } from "@/lib/utils";

import {
  createEmployeeFromSelectedApplicant,
  fetchEligibleEmployeeApplicants,
  type EligibleEmployeeApplicant,
} from "./employee-applicant-api";

interface EmployeeCreateFromApplicantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void> | void;
}

const structuredEmployeeFields = [
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

function initialEmployeeDetails() {
  return {
    phone: "", jobTitle: "", employmentType: "full_time", status: "onboarding",
    hireDate: new Date().toISOString().slice(0, 10), location: "", preferredName: "",
    departmentId: "", managerId: "", positionId: "", companyId: "", clientId: "",
    endDate: "", contractNoticeDays: "30", probationPeriodDays: "", probationEvaluationFrequencyDays: "",
    legalName: "", businessUnit: "", workPhone: "", profilePhotoUrl: "",
    profileCompletion: "35", emergencyName: "", emergencyRelationship: "", emergencyPhone: "",
    ...Object.fromEntries(structuredEmployeeFields.map(([key, , fallback]) => [key, fallback])),
  } as Record<string, string>;
}

export function EmployeeCreateFromApplicantDialog({
  open,
  onOpenChange,
  onCreated,
}: EmployeeCreateFromApplicantDialogProps) {
  const employmentTypes = useDropdownOptions('employment_types', defaultDropdownOptions('employment_types'));
  const { error: toastError, success: toastSuccess } = useToast();
  const [applicants, setApplicants] = React.useState<EligibleEmployeeApplicant[]>([]);
  const [selectedApplicantId, setSelectedApplicantId] = React.useState("");
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [details, setDetails] = React.useState<Record<string, string>>(initialEmployeeDetails);
  const selectedApplicant = applicants.find(
    (applicant) => applicant.id === selectedApplicantId,
  );

  React.useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setSelectedApplicantId("");
    setDetails(initialEmployeeDetails());
    setLoadError(null);
    setIsLoading(true);

    void fetchEligibleEmployeeApplicants(controller.signal)
      .then(setApplicants)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setApplicants([]);
        setLoadError(
          error instanceof Error ? error.message : "Unable to load eligible applicants.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [open]);

  const handleCreate = async () => {
    if (!selectedApplicantId || isCreating) return;

    setIsCreating(true);
    try {
      const structuredValues = Object.fromEntries(structuredEmployeeFields.map(([key, label]) => {
        try {
          return [key, JSON.parse(details[key])];
        } catch {
          throw new Error(`${label} must contain valid JSON.`);
        }
      }));
      const emergencyContacts = details.emergencyName.trim() || details.emergencyPhone.trim()
        ? [{
            name: details.emergencyName.trim(),
            relationship: details.emergencyRelationship.trim(),
            phone: details.emergencyPhone.trim(),
          }]
        : [];
      const nullable = (key: string) => details[key]?.trim() || null;
      const optional = (key: string) => details[key]?.trim() || undefined;
      const result = await createEmployeeFromSelectedApplicant(selectedApplicantId, {
        phone: nullable("phone"),
        jobTitle: nullable("jobTitle"),
        employmentType: details.employmentType,
        status: details.status,
        hireDate: nullable("hireDate"),
        location: nullable("location"),
        preferredName: nullable("preferredName"),
        departmentId: optional("departmentId"),
        managerId: optional("managerId"),
        positionId: optional("positionId"),
        companyId: optional("companyId"),
        clientId: details.employmentType === "subcontract" ? nullable("clientId") : null,
        endDate: nullable("endDate"),
        contractNoticeDays: Number(details.contractNoticeDays || 30),
        probationPeriodDays: details.probationPeriodDays === "" ? null : Number(details.probationPeriodDays),
        probationEvaluationFrequencyDays: details.probationEvaluationFrequencyDays === "" ? null : Number(details.probationEvaluationFrequencyDays),
        legalName: nullable("legalName"),
        businessUnit: nullable("businessUnit"),
        workPhone: nullable("workPhone"),
        profilePhotoUrl: nullable("profilePhotoUrl"),
        profileCompletion: Number(details.profileCompletion || 0),
        emergencyContacts,
        ...structuredValues,
      });
      await onCreated();
      toastSuccess(
        result.created === false
          ? result.message || "Applicant is already linked to an employee"
          : result.employee?.employeeNumber
          ? `Employee ${result.employee.employeeNumber} created with login ${result.account?.loginEmail || ""}`.trim()
          : result.message || "Employee created",
      );
      if (result.account?.setupEmail?.sent === false) {
        toastError(
          `Account created, but the password setup email was not sent: ${result.account.setupEmail.error || "email delivery failed"}`,
        );
      }
      onOpenChange(false);
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Unable to create employee.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[8px]">
        <DialogHeader>
          <DialogTitle>Create new employee</DialogTitle>
          <DialogDescription>
            Select the applicant this employee record is related to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Applicant relation <span className="text-red-600">*</span>
            </Label>
            <Popover open={selectorOpen} onOpenChange={setSelectorOpen} modal>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={selectorOpen}
                  className="h-10 w-full justify-between px-3 font-normal"
                  disabled={isLoading}
                >
                  <span className={cn("truncate", !selectedApplicant && "text-muted-foreground")}>
                    {isLoading
                      ? "Loading eligible applicants..."
                      : selectedApplicant?.name || "Select an applicant"}
                  </span>
                  <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Search name, email, or position..." />
                  <CommandList>
                    <CommandEmpty>No eligible applicants found.</CommandEmpty>
                    <CommandGroup>
                      {applicants.map((applicant) => (
                        <CommandItem
                          key={applicant.id}
                          value={`${applicant.name} ${applicant.email} ${applicant.positionTitle || ""}`}
                          onSelect={() => {
                            setSelectedApplicantId(applicant.id);
                            setDetails(current => ({
                              ...current,
                              phone: applicant.phone || current.phone,
                              jobTitle: applicant.positionTitle || current.jobTitle,
                            }));
                            setSelectorOpen(false);
                          }}
                          className="gap-3 py-2.5"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                            {getApplicantInitials(applicant.name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{applicant.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {applicant.email}
                              {applicant.positionTitle ? ` - ${applicant.positionTitle}` : ""}
                            </span>
                          </span>
                          <CheckIcon
                            className={cn(
                              "h-4 w-4 text-blue-600",
                              selectedApplicantId === applicant.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {loadError && <p className="text-xs text-red-600">{loadError}</p>}
          </div>

          {selectedApplicant && (
            <div className="rounded-[6px] border border-blue-100 bg-blue-50/60 p-3">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {getApplicantInitials(selectedApplicant.name)}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-slate-900">{selectedApplicant.name}</p>
                  <p className="truncate text-xs text-slate-600">{selectedApplicant.email}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedApplicant.positionTitle || "No position assigned"} - {selectedApplicant.statusName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedApplicant && (
            <div className="space-y-5 border-t border-slate-200 pt-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Employee details</h3>
                <p className="text-xs text-slate-500">Complete the employment and personal record before creating the employee.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["phone", "Phone", "text"], ["jobTitle", "Job title", "text"],
                  ["hireDate", "Hire date", "date"], ["location", "Location", "text"],
                  ["preferredName", "Preferred name", "text"], ["legalName", "Legal name", "text"],
                  ["businessUnit", "Business unit", "text"], ["workPhone", "Work phone", "text"],
                  ["departmentId", "Department ID", "text"], ["managerId", "Manager ID", "text"],
                  ["positionId", "Position ID", "text"], ["companyId", "Company ID", "text"],
                  ["endDate", details.employmentType === 'full_time' ? "End date" : "Contract end date *", "date"], ["contractNoticeDays", "Contract end notice (days)", "number"], ["probationPeriodDays", "Probation period (days)", "number"],
                  ["probationEvaluationFrequencyDays", "Evaluation frequency (days)", "number"],
                  ["profilePhotoUrl", "Profile photo URL", "url"], ["profileCompletion", "Profile completion (%)", "number"],
                ].map(([key, label, type]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`new-employee-${key}`}>{label}</Label>
                    <Input id={`new-employee-${key}`} type={type} value={details[key] || ""} onChange={event => setDetails(current => ({ ...current, [key]: event.target.value }))} />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label htmlFor="new-employee-type">Employment type</Label>
                  <select id="new-employee-type" value={details.employmentType} onChange={event => setDetails(current => ({ ...current, employmentType: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {employmentTypes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-employee-status">Status</Label>
                  <select id="new-employee-status" value={details.status} onChange={event => setDetails(current => ({ ...current, status: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {['onboarding', 'probation', 'active', 'inactive'].map(value => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
                {details.employmentType === 'subcontract' && <div className="space-y-2"><Label htmlFor="new-employee-client">Client ID *</Label><Input id="new-employee-client" value={details.clientId} onChange={event => setDetails(current => ({ ...current, clientId: event.target.value }))} /></div>}
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div><h3 className="text-sm font-semibold text-slate-900">Emergency contact</h3><p className="text-xs text-slate-500">Add the employee&apos;s primary emergency contact.</p></div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[['emergencyName', 'Contact name'], ['emergencyRelationship', 'Relationship'], ['emergencyPhone', 'Phone']].map(([key, label]) => <div key={key} className="space-y-2"><Label htmlFor={`new-${key}`}>{label}</Label><Input id={`new-${key}`} value={details[key]} onChange={event => setDetails(current => ({ ...current, [key]: event.target.value }))} /></div>)}
                </div>
              </div>

              <details className="rounded-lg border border-slate-200 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">All structured attributes</summary>
                <p className="mt-1 text-xs text-slate-500">Enter JSON objects or arrays for the remaining employee attributes.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {structuredEmployeeFields.map(([key, label]) => <div key={key} className="space-y-2"><Label htmlFor={`new-${key}`}>{label}</Label><Textarea id={`new-${key}`} className="min-h-24 font-mono text-xs" value={details[key]} onChange={event => setDetails(current => ({ ...current, [key]: event.target.value }))} /></div>)}
                </div>
              </details>
            </div>
          )}

          <div className="flex gap-3 rounded-[6px] bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <UserPlusIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p>
              The standalone person profile was initialized when this person entered recruitment
              and will be shared with the employee. The job application, attachments, and hiring
              history remain separate recruitment records.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleCreate()} disabled={!selectedApplicantId || isCreating || (details.employmentType === 'subcontract' && !details.clientId.trim()) || (details.employmentType !== 'full_time' && !details.endDate)}>
            <UserPlusIcon className="mr-1.5 h-4 w-4" />
            {isCreating ? "Creating..." : "Create employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getApplicantInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";
}
