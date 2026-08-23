import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = resolve(root, "src/app/learning/LearningPageClient.tsx");
const legacyPath = resolve(root, "src/app/learning/LegacyCourseCatalog.tsx");
const primitivesPath = resolve(root, "src/app/learning/LearningUiPrimitives.tsx");

let source = await readFile(sourcePath, "utf8");
const sourceFile = ts.createSourceFile(
  sourcePath,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function declaration(name) {
  return sourceFile.statements.find(
    (statement) =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === name,
  );
}

const legacyNames = ["LegacyCourseCatalog", "CourseGrid", "CourseList"];
const primitiveNames = ["StatusPill", "EmptyInline", "EmptyState"];
const declarations = new Map(
  [...legacyNames, ...primitiveNames].map((name) => [name, declaration(name)]),
);

const missing = [...declarations.entries()]
  .filter(([, statement]) => !statement)
  .map(([name]) => name);

if (missing.length) {
  if (
    source.includes('from "./LegacyCourseCatalog"') &&
    source.includes('from "./LearningUiPrimitives"')
  ) {
    console.log("Legacy Learning catalog is already extracted.");
    process.exit(0);
  }
  throw new Error(`Missing Learning declarations: ${missing.join(", ")}`);
}

function declarationSource(name, exported = false) {
  const statement = declarations.get(name);
  const text = source.slice(statement.getStart(sourceFile), statement.getEnd());
  if (!exported) return text;
  return text.replace(new RegExp(`^function ${name}\\(`), `export function ${name}(`);
}

const primitivesSource = `import * as React from "react";\nimport { PlusIcon } from "@heroicons/react/24/outline";\n\nimport { HrisStatusBadge } from "@/components/hris/HrisWorkspacePrimitives";\nimport { Button } from "@/components/ui/button";\n\n${declarationSource("StatusPill", true)}\n\n${declarationSource("EmptyInline", true)}\n\n${declarationSource("EmptyState", true)}\n`;

const legacySource = `"use client";\n\nimport Link from "next/link";\nimport * as React from "react";\nimport {\n  AcademicCapIcon,\n  BookOpenIcon,\n  ChevronRightIcon,\n  ClockIcon,\n  ListBulletIcon,\n  MagnifyingGlassIcon,\n  PlusIcon,\n  RectangleGroupIcon,\n  ShieldCheckIcon,\n  SparklesIcon,\n  TrashIcon,\n  UserGroupIcon,\n} from "@heroicons/react/24/outline";\n\nimport { Button } from "@/components/ui/button";\nimport { Input } from "@/components/ui/input";\nimport { cn } from "@/lib/utils";\nimport {\n  displayLearningValue as text,\n  isActiveLearningCourse as isCourseActive,\n  learningBooleanValue as booleanValue,\n  learningCourseColor as courseColor,\n  learningRecordValue as recordValue,\n} from "@/lib/learning/record-utils";\nimport type { LearningRecord } from "./learning-workspace-model";\nimport { EmptyInline, EmptyState, StatusPill } from "./LearningUiPrimitives";\n\n${declarationSource("LegacyCourseCatalog", true)}\n\n${declarationSource("CourseGrid")}\n\n${declarationSource("CourseList")}\n`;

const removals = [...declarations.values()]
  .map((statement) => ({ start: statement.getFullStart(), end: statement.getEnd() }))
  .sort((a, b) => b.start - a.start);
for (const removal of removals) {
  source = `${source.slice(0, removal.start)}${source.slice(removal.end)}`;
}

const importAnchor = 'import { LearningOverview } from "./LearningOverview";\n';
const newImports =
  'import { LegacyCourseCatalog } from "./LegacyCourseCatalog";\n' +
  'import { EmptyInline, EmptyState, StatusPill } from "./LearningUiPrimitives";\n';
if (!source.includes('from "./LegacyCourseCatalog"')) {
  if (!source.includes(importAnchor)) {
    throw new Error("Legacy Learning catalog import anchor not found");
  }
  source = source.replace(importAnchor, `${importAnchor}${newImports}`);
}

await writeFile(legacyPath, legacySource, "utf8");
await writeFile(primitivesPath, primitivesSource, "utf8");
await writeFile(sourcePath, source, "utf8");

console.log("Legacy Learning catalog and shared UI primitives extracted.");
