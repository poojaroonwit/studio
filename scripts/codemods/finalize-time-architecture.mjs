import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

function functionRange(source, name) {
  const file = ts.createSourceFile('file.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let match = null;
  const visit = node => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) match = node;
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (!match) throw new Error(`Function ${name} not found`);
  return { start: match.getFullStart(), end: match.getEnd() };
}

function removeFunction(source, name) {
  const { start, end } = functionRange(source, name);
  return `${source.slice(0, start)}\n${source.slice(end)}`;
}

function compactBlankLines(source, count) {
  const lines = source.split('\n');
  let removed = 0;
  const output = lines.filter((line, index) => {
    if (removed >= count || line.trim() !== '' || index === 0 || index === lines.length - 1) return true;
    const previous = lines[index - 1]?.trim();
    const next = lines[index + 1]?.trim();
    if (previous && next) {
      removed += 1;
      return false;
    }
    return true;
  });
  if (removed < count) throw new Error(`Only found ${removed} safe blank lines; need ${count}`);
  return output.join('\n');
}

const servicePath = 'src/lib/hr/shift-attendance-service.ts';
let service = await readFile(servicePath, 'utf8');
if (!service.includes("from './time-workspace-data'")) {
  service = service.replace(
    "import { mutateTimeSetup } from './time-setup-actions';",
    "import { mutateTimeSetup } from './time-setup-actions';\nimport { listTimeOvertime, listTimeRequests } from './time-workspace-data';",
  );
}
service = removeFunction(service, 'listRequests');
service = removeFunction(service, 'listOvertime');
service = service.replace("if (view === 'requests') return listRequests(actor, searchParams);", "if (view === 'requests') return listTimeRequests(actor, searchParams);");
service = service.replace("if (view === 'overtime') return listOvertime(actor, searchParams);", "if (view === 'overtime') return listTimeOvertime(actor, searchParams);");
await writeFile(servicePath, service, 'utf8');

for (const [path, count] of [
  ['src/components/shift/views/OvertimeView.tsx', 13],
  ['src/components/shift/views/RosterView.tsx', 7],
  ['src/components/shift/views/TimesheetCommandCenter.tsx', 6],
]) {
  const source = await readFile(path, 'utf8');
  await writeFile(path, compactBlankLines(source, count), 'utf8');
}

console.log('Time architecture extraction and UI line compaction applied.');
