#!/usr/bin/env tsx

/**
 * Fit Score Performance Optimization Script
 * 
 * This script:
 * 1. Applies database indexes for fit score queries
 * 2. Optimizes database performance for Applicant matching
 * 3. Analyzes and reports on fit score query performance
 */

import 'dotenv/config';
import { getPool } from '@/lib/db';

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
};

function log(message: string, color: keyof typeof colors = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message: string) {
    log(`✅ ${message}`, 'green');
}

function logWarning(message: string) {
    log(`⚠️  ${message}`, 'yellow');
}

function logError(message: string) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message: string) {
    log(`ℹ️  ${message}`, 'blue');
}

/**
 * Apply database indexes for fit score optimization
 */
async function applyFitScoreIndexes() {
    const client = await getPool().connect();
    
    try {
        logInfo('Applying fit score performance indexes...');
        
        // Check if indexes already exist
        const existingIndexesResult = await client.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'Applicant' 
            AND indexname LIKE '%fit_score%'
        `);
        
        const existingIndexes = existingIndexesResult.rows.map((row: any) => row.indexname);
        logInfo(`Found ${existingIndexes.length} existing fit score indexes`);
        
        // Define the indexes we want to create
        const indexes = [
            {
                name: 'idx_Applicant_fit_score_position',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_Applicant_fit_score_position ON "Applicant" ("fitScore", "positionId") WHERE "fitScore" IS NOT NULL'
            },
            {
                name: 'idx_Applicant_fit_score_updated',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_Applicant_fit_score_updated ON "Applicant" ("fitScore", "updatedAt") WHERE "fitScore" IS NOT NULL'
            },
            {
                name: 'idx_Applicant_position_fit_score',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_Applicant_position_fit_score ON "Applicant" ("positionId", "fitScore") WHERE "fitScore" IS NOT NULL'
            },
            {
                name: 'idx_Applicant_status_fit_score',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_Applicant_status_fit_score ON "Applicant" ("status", "fitScore") WHERE "fitScore" IS NOT NULL'
            }
        ];
        
        let createdIndexes = 0;
        let skippedIndexes = 0;
        
        for (const index of indexes) {
            if (existingIndexes.includes(index.name)) {
                logInfo(`Index ${index.name} already exists, skipping`);
                skippedIndexes++;
                continue;
            }
            
            try {
                await client.query(index.sql);
                logSuccess(`Created index: ${index.name}`);
                createdIndexes++;
            } catch (error: any) {
                if (error.message.includes('already exists')) {
                    logInfo(`Index ${index.name} already exists, skipping`);
                    skippedIndexes++;
                } else {
                    logWarning(`Failed to create index ${index.name}: ${error.message}`);
                }
            }
        }
        
        logSuccess(`Index creation completed: ${createdIndexes} created, ${skippedIndexes} skipped`);
        
        return true;
        
    } catch (error: any) {
        logError(`Failed to apply fit score indexes: ${error.message}`);
        console.error(error);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Analyze fit score query performance
 */
async function analyzeFitScorePerformance() {
    const client = await getPool().connect();
    
    try {
        logInfo('Analyzing fit score query performance...');
        
        // Get statistics about fit scores
        const statsResult = await client.query(`
            SELECT 
                COUNT(*) as total_Applicants,
                COUNT("fitScore") as applicantS_with_fit_score,
                ROUND(AVG("fitScore")::numeric, 2) as avg_fit_score,
                MIN("fitScore") as min_fit_score,
                MAX("fitScore") as max_fit_score,
                COUNT(DISTINCT "positionId") as unique_positions
            FROM "Applicant"
            WHERE "fitScore" IS NOT NULL
        `);
        
        const stats = statsResult.rows[0];
        logInfo(`Fit Score Statistics:`);
        logInfo(`  - Total Applicants with fit scores: ${stats.applicantS_with_fit_score}`);
        logInfo(`  - Average fit score: ${stats.avg_fit_score}`);
        logInfo(`  - Fit score range: ${stats.min_fit_score} - ${stats.max_fit_score}`);
        logInfo(`  - Unique positions: ${stats.unique_positions}`);
        
        // Check for fit score distribution (database stores scores in 0-1 decimal format)
        const distributionResult = await client.query(`
            SELECT 
                CASE 
                    WHEN "fitScore" >= 0.9 THEN '90-100 (Excellent)'
                    WHEN "fitScore" >= 0.8 THEN '80-89 (Very Good)'
                    WHEN "fitScore" >= 0.7 THEN '70-79 (Good)'
                    WHEN "fitScore" >= 0.6 THEN '60-69 (Fair)'
                    WHEN "fitScore" >= 0.5 THEN '50-59 (Poor)'
                    ELSE '0-49 (Very Poor)'
                END as score_range,
                COUNT(*) as count
            FROM "Applicant"
            WHERE "fitScore" IS NOT NULL
            GROUP BY score_range
            ORDER BY MIN("fitScore") DESC
        `);
        
        logInfo(`Fit Score Distribution:`);
        for (const row of distributionResult.rows) {
            logInfo(`  - ${row.score_range}: ${row.count} Applicants`);
        }
        
        // Check for positions with many Applicants
        const topPositionsResult = await client.query(`
            SELECT 
                p.title as position_title,
                COUNT(c.id) as Applicant_count,
                ROUND(AVG(c."fitScore")::numeric, 2) as avg_fit_score
            FROM "Applicant" c
            JOIN "Position" p ON c."positionId" = p.id
            WHERE c."fitScore" IS NOT NULL
            GROUP BY p.id, p.title
            ORDER BY Applicant_count DESC
            LIMIT 10
        `);
        
        logInfo(`Top 10 Positions by Applicant Count:`);
        for (const row of topPositionsResult.rows) {
            logInfo(`  - ${row.position_title}: ${row.Applicant_count} Applicants (avg: ${row.avg_fit_score})`);
        }
        
        logSuccess('Fit score performance analysis completed');
        return true;
        
    } catch (error: any) {
        logError(`Failed to analyze fit score performance: ${error.message}`);
        console.error(error);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Optimize fit score calculations
 */
async function optimizeFitScoreCalculations() {
    const client = await getPool().connect();
    
    try {
        logInfo('Optimizing fit score calculations...');
        
        // Update statistics for better query planning
        await client.query('ANALYZE "Applicant"');
        await client.query('ANALYZE "Position"');
        
        logSuccess('Updated table statistics for better query planning');
        
        // Check for Applicants with outdated fit scores
        // Note: Since there's no fitScoreUpdatedAt column, we'll check if fit scores exist
        const outdatedResult = await client.query(`
            SELECT COUNT(*) as count
            FROM "Applicant" c
            WHERE c."fitScore" IS NOT NULL
        `);
        
        const fitScoreCount = outdatedResult.rows[0].count;
        if (fitScoreCount > 0) {
            logInfo(`Found ${fitScoreCount} Applicants with fit scores`);
            logInfo('Note: Cannot determine if fit scores are outdated without fitScoreUpdatedAt column');
        } else {
            logInfo('No Applicants with fit scores found');
        }
        
        return true;
        
    } catch (error: any) {
        logError(`Failed to optimize fit score calculations: ${error.message}`);
        console.error(error);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Main execution function
 */
async function main() {
    log('⚡ Starting fit score performance optimization...', 'cyan');
    
    try {
        // Step 1: Apply database indexes
        logInfo('Step 1: Applying database indexes...');
        const indexesSuccess = await applyFitScoreIndexes();
        
        // Step 2: Analyze performance
        logInfo('Step 2: Analyzing fit score performance...');
        const analysisSuccess = await analyzeFitScorePerformance();
        
        // Step 3: Optimize calculations
        logInfo('Step 3: Optimizing fit score calculations...');
        const optimizationSuccess = await optimizeFitScoreCalculations();
        
        if (indexesSuccess && analysisSuccess && optimizationSuccess) {
            process.exit(0);
        } else {
            logWarning('Some optimization steps failed, but continuing...');
            process.exit(0); // Don't fail deployment for optimization issues
        }
        
    } catch (error: any) {
        logError(`Fit score optimization failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Export functions for use in other scripts
export {
    applyFitScoreIndexes,
    analyzeFitScorePerformance,
    optimizeFitScoreCalculations
};

// Run if called directly
if (require.main === module) {
    main().catch((error: any) => {
        logError(`Unexpected error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}

