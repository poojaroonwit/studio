#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const schema = process.env.PRISMA_SCHEMA || 'prisma/schema.prisma';
const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// These indexes are intentionally maintained as raw SQL because Prisma cannot
// fully represent their semantics (GIN / partial indexes) or because they are
// preserved performance structures outside the generated baseline.
const allowedDropIndexes = new Set([
  'Applicant_fitScore_statusId_idx',
  'Applicant_parsedData_gin_idx',
  'Applicant_fitScore_not_null_idx',
  'Applicant_fitScore_null_idx',
  'JobMatch_applicant_id_fitScore_idx',
]);

function fail(message, details = '') {
  console.error(`ERROR: ${message}`);
  if (details.trim()) console.error(details.trim());
  process.exit(1);
}

const result = spawnSync(
  executable,
  [
    'prisma',
    'migrate',
    'diff',
    '--from-schema-datasource', schema,
    '--to-schema-datamodel', schema,
    '--script',
  ],
  {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  },
);

if (result.error) fail('Unable to execute Prisma schema drift check.', result.error.message);
if (result.status !== 0) {
  fail('Prisma schema drift command failed.', `${result.stdout || ''}\n${result.stderr || ''}`);
}

const sql = (result.stdout || '').trim();
if (!sql || /^-- This is an empty migration\.?$/m.test(sql)) {
  console.log('Database matches prisma/schema.prisma.');
  process.exit(0);
}

const statements = sql
  .split(';')
  .map(statement => statement.trim())
  .filter(Boolean)
  .map(statement => statement
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .trim())
  .filter(Boolean);

const unexpected = [];
const allowed = [];

for (const statement of statements) {
  const match = statement.match(/^DROP INDEX\s+"([^"]+)"$/i);
  if (match && allowedDropIndexes.has(match[1])) {
    allowed.push(match[1]);
    continue;
  }
  unexpected.push(statement);
}

if (unexpected.length > 0) {
  fail(
    'Database has Prisma-managed schema drift.',
    `Unexpected migration diff:\n${unexpected.map(item => `${item};`).join('\n\n')}`,
  );
}

console.log(
  `Database matches the Prisma-managed schema; ignored ${allowed.length} documented raw-SQL index difference${allowed.length === 1 ? '' : 's'}: ${allowed.join(', ') || 'none'}.`,
);
