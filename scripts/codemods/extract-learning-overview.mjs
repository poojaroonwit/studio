import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = resolve(root, "src/app/learning/LearningPageClient.tsx");
const targetPath = resolve(root, "src/app/learning/LearningOverview.tsx");

let source = await readFile(sourcePath, "utf8");
const sourceFile = ts.createSourceFile(
  sourcePath,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

const overview = sourceFile.statements.find(
  (statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === "LearningOverview",
);

if (!overview) {
  if (source.includes('from "./LearningOverview"')) {
    console.log("LearningOverview is already extracted.");
    process.exit(0);
  }
  throw new Error("LearningOverview function declaration was not found");
}

const functionSource = source
  .slice(overview.getStart(sourceFile), overview.getEnd())
  .replace(/^function LearningOverview\(/, "export function LearningOverview(");

const targetSource = `import Image from "next/image";\nimport Link from "next/link";\nimport {\n  ArrowRightIcon,\n  BookmarkIcon,\n  CheckIcon,\n  ChevronRightIcon,\n  ClockIcon,\n  MapPinIcon,\n  QueueListIcon,\n  SparklesIcon,\n} from "@heroicons/react/24/outline";\nimport { FireIcon as FireIconSolid } from "@heroicons/react/24/solid";\nimport { UsersRound as CourseUsersIcon } from "lucide-react";\n\nimport { Button } from "@/components/ui/button";\nimport { cn } from "@/lib/utils";\nimport {\n  displayLearningValue as text,\n  isActiveLearningCourse as isCourseActive,\n  learningNumberValue as numberValue,\n  learningRecordValue as recordValue,\n  normalizeLearningStatus as normalizeStatus,\n} from "@/lib/learning/record-utils";\nimport type { LearningRecord } from "./learning-workspace-model";\n\n${functionSource}\n`;

// Remove using AST offsets from the unmodified source first. Adding imports before
// this step would shift those offsets and could cut into adjacent JSX/components.
source = `${source.slice(0, overview.getFullStart())}${source.slice(overview.getEnd())}`;

const importAnchor = 'import { TrustedCertificatesWorkspace } from "./TrustedCertificatesWorkspace";\n';
const overviewImport = 'import { LearningOverview } from "./LearningOverview";\n';
if (!source.includes(overviewImport.trim())) {
  if (!source.includes(importAnchor)) {
    throw new Error("LearningOverview import anchor was not found");
  }
  source = source.replace(importAnchor, `${importAnchor}${overviewImport}`);
}

await writeFile(targetPath, targetSource, "utf8");
await writeFile(sourcePath, source, "utf8");

console.log("LearningOverview extracted from LearningPageClient.tsx");
