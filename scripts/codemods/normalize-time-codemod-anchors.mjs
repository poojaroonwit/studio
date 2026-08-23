import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/components/shift/views/RosterView.tsx';
let source = await readFile(path, 'utf8');
source = source.replace(
  'import { useShiftAttendance } from "../use-shift-attendance";',
  "import { useShiftAttendance } from '../use-shift-attendance';",
);
await writeFile(path, source, 'utf8');
console.log('Normalized Time codemod anchors.');
