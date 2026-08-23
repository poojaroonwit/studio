import { readFile, writeFile } from 'node:fs/promises';

const contractPath = 'src/lib/hr/shift-attendance-contracts.ts';
let contracts = await readFile(contractPath, 'utf8');
const marker = "    requestedAssignmentId: uuid.optional().nullable(),\n    swapEmployeeId: uuid.optional().nullable(),";
if (contracts.includes(marker)) {
  contracts = contracts.replace(
    marker,
    "    requestedAssignmentId: uuid.optional().nullable(),\n    openShiftId: uuid.optional().nullable(),\n    swapEmployeeId: uuid.optional().nullable(),",
  );
}
await writeFile(contractPath, contracts, 'utf8');

const correctionPath = 'src/components/shift/views/AttendanceCorrectionRequestForm.tsx';
let correction = await readFile(correctionPath, 'utf8');
correction = correction.replace(
  '  }, [currentRecord?.id, form.workDate]);',
  '  }, [currentRecord, form.workDate, initialRequest]);',
);
await writeFile(correctionPath, correction, 'utf8');

console.log('Finalized Time generated mutation types and hook dependencies.');
