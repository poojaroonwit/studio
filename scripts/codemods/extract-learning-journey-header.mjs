import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

// Deterministic extraction: CI verifies the exact transformation before push.
const root = process.cwd();
const sourcePath = resolve(root, "src/app/learning/LearningPageClient.tsx");
const targetPath = resolve(root, "src/app/learning/LearningJourneyHeader.tsx");

let source = await readFile(sourcePath, "utf8");
const sourceFile = ts.createSourceFile(
  sourcePath,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

const findVariable = (name) =>
  sourceFile.statements.find(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name,
      ),
  );

const learningView = sourceFile.statements.find(
  (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === "LearningView",
);
const learningViewHeaders = findVariable("learningViewHeaders");
const learningJourneyStops = findVariable("learningJourneyStops");
const learningJourneyCopy = findVariable("learningJourneyCopy");
const learningJourneyHeader = sourceFile.statements.find(
  (statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === "LearningJourneyHeader",
);

const declarations = [
  learningView,
  learningViewHeaders,
  learningJourneyStops,
  learningJourneyCopy,
  learningJourneyHeader,
];

if (declarations.some((statement) => !statement)) {
  if (source.includes('from "./LearningJourneyHeader"')) {
    console.log("LearningJourneyHeader is already extracted.");
    process.exit(0);
  }
  throw new Error("One or more Learning journey declarations were not found");
}

const slice = (statement) => source.slice(statement.getStart(sourceFile), statement.getEnd());

const typeSource = slice(learningView);
const headersSource = slice(learningViewHeaders).replace(
  /^const learningViewHeaders/,
  "export const learningViewHeaders",
);
const stopsSource = slice(learningJourneyStops);
const copySource = slice(learningJourneyCopy);
const headerSource = slice(learningJourneyHeader).replace(
  /^function LearningJourneyHeader\(/,
  "export function LearningJourneyHeader(",
);

const targetSource = `import Image from "next/image";\nimport Link from "next/link";\nimport * as React from "react";\nimport {\n  ArrowRightIcon,\n  BookOpenIcon,\n  CheckBadgeIcon,\n  CheckIcon,\n  MapPinIcon,\n  PlusIcon,\n  SparklesIcon,\n  TrophyIcon,\n  UserGroupIcon,\n} from "@heroicons/react/24/outline";\n\nimport { Button } from "@/components/ui/button";\nimport { cn } from "@/lib/utils";\n\n${typeSource}\n\n${headersSource}\n\n${stopsSource}\n\n${copySource}\n\n${headerSource}\n`;

const removals = declarations
  .map((statement) => ({ start: statement.getFullStart(), end: statement.getEnd() }))
  .sort((a, b) => b.start - a.start);

for (const removal of removals) {
  source = `${source.slice(0, removal.start)}${source.slice(removal.end)}`;
}

const importAnchor = 'import { EmptyInline, EmptyState, StatusPill } from "./LearningUiPrimitives";\n';
const journeyImport =
  'import { LearningJourneyHeader, learningViewHeaders, type LearningView } from "./LearningJourneyHeader";\n';

if (!source.includes('from "./LearningJourneyHeader"')) {
  if (!source.includes(importAnchor)) {
    throw new Error("Learning journey import anchor was not found");
  }
  source = source.replace(importAnchor, `${importAnchor}${journeyImport}`);
}

await writeFile(targetPath, targetSource, "utf8");
await writeFile(sourcePath, source, "utf8");

console.log("Learning journey header and metadata extracted.");
