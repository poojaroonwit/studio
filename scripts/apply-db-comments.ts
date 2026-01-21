
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const rootDir = process.cwd();
const commentsFile = path.join(rootDir, 'prisma/migrations/comments.sql');

console.log('Generating database comments...');
try {
    // Generate the SQL file by running prisma generate
    // This triggers the prisma-db-comments-generator defined in schema.prisma
    execSync('npx prisma generate', { stdio: 'inherit', cwd: rootDir });

    // Check if file exists
    if (fs.existsSync(commentsFile)) {
        console.log(`Applying database comments from ${commentsFile}...`);
        // Execute the SQL file against the database
        // We use --schema to be explicit, though it might default correctly
        execSync(`npx prisma db execute --file "${commentsFile}" --schema prisma/schema.prisma`, { stdio: 'inherit', cwd: rootDir });
        console.log('Database comments applied successfully.');
    } else {
        console.warn(`Warning: ${commentsFile} not found after generation. Verify prisma-db-comments-generator config.`);
        // Don't fail the build, just warn
    }
} catch (error) {
    console.error('Failed to apply database comments:', error);
    // We exit with error to make sure deployment fails if this critical step fails (if desired)
    // Or we can allow it to pass. User asked to "fource run", implying it's important.
    process.exit(1);
}
