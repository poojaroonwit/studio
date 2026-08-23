import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();

function removeTopLevelDeclarations(source, fileName, declarationNames) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const removals = [];

  for (const statement of sourceFile.statements) {
    let name = null;
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      name = statement.name.text;
    } else if (ts.isInterfaceDeclaration(statement)) {
      name = statement.name.text;
    } else if (ts.isTypeAliasDeclaration(statement)) {
      name = statement.name.text;
    }

    if (name && declarationNames.has(name)) {
      removals.push({ start: statement.getFullStart(), end: statement.getEnd() });
    }
  }

  for (const removal of removals.sort((a, b) => b.start - a.start)) {
    source = `${source.slice(0, removal.start)}${source.slice(removal.end)}`;
  }

  return source;
}

async function refactorLearning() {
  const target = resolve(root, "src/app/learning/LearningPageClient.tsx");
  let source = await readFile(target, "utf8");

  const importAnchor = 'import { cn } from "@/lib/utils";\n';
  const helperImport = `import {\n  displayLearningValue as text,\n  formatLearningDate as formatDate,\n  isActiveLearningCourse as isCourseActive,\n  isTrustedLearningCertificate as isTrustedCertificate,\n  learningBooleanValue as booleanValue,\n  learningCourseColor as courseColor,\n  learningDaysUntil as daysUntil,\n  learningNumberValue as numberValue,\n  learningRecordValue as recordValue,\n  learningRecordsFromResponse as getRecords,\n  learningStringArrayValue as stringArrayValue,\n  normalizeLearningStatus as normalizeStatus,\n  withoutEmptyLearningValues as withoutEmptyValues,\n} from "@/lib/learning/record-utils";\n`;

  if (!source.includes('from "@/lib/learning/record-utils"')) {
    if (!source.includes(importAnchor)) {
      throw new Error("Learning refactor: import anchor not found");
    }
    source = source.replace(importAnchor, `${importAnchor}${helperImport}`);
  }

  const helperStart = source.indexOf("function text(value: unknown");
  const clientStart = source.indexOf("export function LearningPageClient");

  if (helperStart !== -1) {
    if (clientStart === -1 || clientStart <= helperStart) {
      throw new Error("Learning refactor: client boundary not found after helper block");
    }
    source = `${source.slice(0, helperStart)}${source.slice(clientStart)}`;
  }

  await writeFile(target, source, "utf8");
  console.log("Learning record helpers are wired to src/lib/learning/record-utils.ts");
}

async function refactorPayroll() {
  const target = resolve(root, "src/components/payroll/PayrollWorkspace.tsx");
  let source = await readFile(target, "utf8");

  const oldWorkflowImport = `import {\n  payrollPeriodDatesAreValid,\n  payslipTimelineStep,\n} from "@/lib/payroll/workflow-rules";`;
  const newWorkflowImport = `import { payslipTimelineStep } from "@/lib/payroll/workflow-rules";`;
  if (source.includes(oldWorkflowImport)) {
    source = source.replace(oldWorkflowImport, newWorkflowImport);
  }

  const importAnchor = `${newWorkflowImport}\n`;
  const helperImport = `import {\n  approvalStepStyle,\n  initialsFromName,\n  parseApprovalSteps,\n  payrollPeriodIsRunnable,\n  payrollProgressCursor,\n  payrollProgressStepState,\n  payrollReviewerFromSteps,\n  reviewerRoleLabel,\n  type PayrollApprovalStep,\n  type PayrollWorkspaceRow,\n} from "@/lib/payroll/workspace-model";\n`;

  if (!source.includes('from "@/lib/payroll/workspace-model"')) {
    if (!source.includes(importAnchor)) {
      throw new Error("Payroll refactor: workflow import anchor not found");
    }
    source = source.replace(importAnchor, `${importAnchor}${helperImport}`);
  }

  const helperStart = source.indexOf("type Row = Record<string, unknown>;");
  const clientStart = source.indexOf("export function PayrollWorkspace");
  if (helperStart !== -1) {
    if (clientStart === -1 || clientStart <= helperStart) {
      throw new Error("Payroll refactor: workspace boundary not found after helper block");
    }
    source = `${source.slice(0, helperStart)}type Row = PayrollWorkspaceRow;\n\n${source.slice(clientStart)}`;
  }

  await writeFile(target, source, "utf8");
  console.log("Payroll workspace rules are wired to src/lib/payroll/workspace-model.ts");
}

async function refactorEmployeeProfile() {
  const target = resolve(root, "src/components/hr/HrEmployeeProfilePage.tsx");
  let source = await readFile(target, "utf8");

  const importAnchor = 'import type { HrCrudRecord } from "@/lib/hr/hr-crud";\n';
  const helperImport = `import {\n  accountAccessStatus,\n  accountLinkStatus,\n  compactValue,\n  employeeDisplayName,\n  employeeEditForm,\n  employeeRecordReference,\n  employmentTenure,\n  formatLabel,\n  formatValue,\n  jsonItems,\n  normalizedHttpUrl,\n  objectEntries,\n  readableJsonValue,\n  type EmployeeEditForm,\n} from "@/lib/hr/employee-profile-model";\n`;

  if (!source.includes('from "@/lib/hr/employee-profile-model"')) {
    if (!source.includes(importAnchor)) {
      throw new Error("Employee profile refactor: HrCrudRecord import anchor not found");
    }
    source = source.replace(importAnchor, `${importAnchor}${helperImport}`);
  }

  source = removeTopLevelDeclarations(
    source,
    target,
    new Set([
      "EmployeeEditForm",
      "employeeRecordReference",
      "formatLabel",
      "formatValue",
      "compactValue",
      "employmentTenure",
      "jsonItems",
      "objectEntries",
      "readableJsonValue",
      "normalizedHttpUrl",
      "accountLinkStatus",
      "accountAccessStatus",
      "employeeDisplayName",
      "employeeEditForm",
    ]),
  );

  await writeFile(target, source, "utf8");
  console.log("Employee profile helpers are wired to src/lib/hr/employee-profile-model.ts");
}

await refactorLearning();
await refactorPayroll();
await refactorEmployeeProfile();
