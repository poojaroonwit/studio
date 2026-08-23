import { readFile, writeFile } from 'node:fs/promises';

const rosterPath = 'src/components/shift/views/RosterView.tsx';
let roster = await readFile(rosterPath, 'utf8');
roster = roster.replace(
  'import { useShiftAttendance } from "../use-shift-attendance";',
  "import { useShiftAttendance } from '../use-shift-attendance';",
);
await writeFile(rosterPath, roster, 'utf8');

const codemodPath = 'scripts/codemods/complete-time-remaining.mjs';
let codemod = await readFile(codemodPath, 'utf8');
codemod = codemod.replace(
  'new Date(\\`${start}T00:00:00Z\\`)',
  'new Date(\\`\\${start}T00:00:00Z\\`)',
);
await writeFile(codemodPath, codemod, 'utf8');

console.log('Normalized Time codemod anchors and literals.');
