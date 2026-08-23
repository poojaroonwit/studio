import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/lib/hr/shift-attendance-contracts.ts';
let source = await readFile(path, 'utf8');
const marker = "    requestedAssignmentId: uuid.optional().nullable(),\n    swapEmployeeId: uuid.optional().nullable(),";
if (source.includes(marker)) {
  source = source.replace(
    marker,
    "    requestedAssignmentId: uuid.optional().nullable(),\n    openShiftId: uuid.optional().nullable(),\n    swapEmployeeId: uuid.optional().nullable(),",
  );
}
await writeFile(path, source, 'utf8');
console.log('Finalized Time generated mutation types.');
