import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
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
