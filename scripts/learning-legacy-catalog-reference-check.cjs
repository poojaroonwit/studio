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

assert(
  externalReferences.length === 0,
  `Legacy catalog still has external references: ${externalReferences
    .map((ref) => `${ref.name}@${ref.line}`)
    .join(', ')}`,
);

console.log(
  `Legacy Learning catalog is isolated: ${candidateRanges
    .map((range) => range.name)
    .join(', ')} have no references outside their legacy subtree.`,
);
