const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const sourcePath = path.join(process.cwd(), 'src/app/learning/LearningPageClient.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');
const sourceFile = ts.createSourceFile(
  sourcePath,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

const candidateNames = new Set(['LegacyCourseCatalog', 'CourseGrid', 'CourseList']);
const candidateRanges = [];

for (const statement of sourceFile.statements) {
  if (
    ts.isFunctionDeclaration(statement) &&
    statement.name &&
    candidateNames.has(statement.name.text)
  ) {
    candidateRanges.push({
      name: statement.name.text,
      start: statement.getFullStart(),
      end: statement.getEnd(),
    });
  }
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

if (candidateRanges.length === 0) {
  assert(
    source.includes('from "./LegacyCourseCatalog"'),
    'Inline legacy catalog declarations are gone but LearningPageClient does not import LegacyCourseCatalog',
  );
  console.log('Legacy Learning catalog reference check passed: fallback subtree is extracted.');
  process.exit(0);
}

assert(
  candidateRanges.length === candidateNames.size,
  `Expected ${candidateNames.size} legacy catalog declarations, found ${candidateRanges.length}`,
);

const insideCandidateRange = (position) =>
  candidateRanges.some((range) => position >= range.start && position <= range.end);

const externalReferences = [];

function visit(node) {
  if (ts.isIdentifier(node) && candidateNames.has(node.text)) {
    const position = node.getStart(sourceFile);
    if (!insideCandidateRange(position)) {
      externalReferences.push({
        name: node.text,
        line: sourceFile.getLineAndCharacterOfPosition(position).line + 1,
      });
    }
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);

const legacyRefs = externalReferences.filter((ref) => ref.name === 'LegacyCourseCatalog');
const privateChildRefs = externalReferences.filter((ref) => ref.name !== 'LegacyCourseCatalog');

assert(
  legacyRefs.length === 1,
  `Expected exactly one live LegacyCourseCatalog fallback reference, found ${legacyRefs.length}`,
);
assert(
  privateChildRefs.length === 0,
  `Legacy CourseGrid/CourseList must remain private to the fallback subtree: ${privateChildRefs
    .map((ref) => `${ref.name}@${ref.line}`)
    .join(', ')}`,
);

console.log(
  `Legacy Learning fallback is safe to extract: one live LegacyCourseCatalog reference at line ${legacyRefs[0].line}; CourseGrid and CourseList have no external references.`,
);
