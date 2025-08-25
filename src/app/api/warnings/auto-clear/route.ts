import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actingUserId = session.user.id;
    const actingUserName = session.user.name || 'Unknown User';

    // console.log('🔍 Starting automatic warning resolution check...');
    
    // Get all active warnings
    const allWarnings = await prisma.warning.findMany({
      include: {
        configuration: true
      } as any
    });

    // console.log(`📋 Found ${allWarnings.length} total warnings to check`);

    let resolvedCount = 0;
    let errorCount = 0;

    for (const warning of allWarnings) {
      try {
        // Check if the warning condition is still valid
        const entity = await getEntityData(warning.entityType, warning.entityId);
        
        if (!entity) {
          // Entity no longer exists, clear the warning
          await prisma.warning.delete({
            where: { id: warning.id }
          });
          resolvedCount++;
          continue;
        }

        // Evaluate the condition
        const isStillValid = await evaluateWarningCondition((warning as any).configuration, warning.entityType, warning.entityId, entity);
        
        if (!isStillValid) {
          // Condition is no longer valid, clear the warning
          await prisma.warning.delete({
            where: { id: warning.id }
          });
          // console.log(`✅ Cleared resolved warning ${warning.id} for ${warning.configuration.name}`);
          resolvedCount++;
        }
      } catch (error) {
        console.error(`❌ Error checking warning ${warning.id}:`, error);
        errorCount++;
      }
    }


    await logAudit('AUDIT', `Automatic warning resolution completed by ${actingUserName}`, 'API:Warnings:AutoClear', actingUserId, {
      totalWarnings: allWarnings.length,
      warningsResolved: resolvedCount,
      errorsEncountered: errorCount
    });

    return NextResponse.json({ 
      success: true, 
      message: `Automatic warning resolution completed`,
      totalWarnings: allWarnings.length,
      warningsResolved: resolvedCount,
      errorsEncountered: errorCount
    });

  } catch (error) {
    console.error('Error in automatic warning resolution:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getEntityData(entityType: string, entityId: string) {
  switch (entityType) {
    case 'position':
      return await prisma.position.findUnique({
        where: { id: entityId },
        include: { grade: true }
      });
    case 'candidate':
      return await prisma.candidate.findUnique({
        where: { id: entityId },
        include: { 
          position: {
            include: {
              grade: true
            }
          }
        }
      });
    case 'headcount':
      return await prisma.headcount.findUnique({
        where: { id: entityId },
        include: { position: true, candidate: true }
      });
    default:
      return null;
  }
}

async function evaluateWarningCondition(config: any, entityType: string, entityId: string, entity: any): Promise<boolean> {
  const { logicalOperator, conditions, crossEntityConditions } = config;

  // 1. Cross-Entity Conditions
  if (crossEntityConditions && Array.isArray(crossEntityConditions) && crossEntityConditions.length > 0) {
    return await evaluateCrossEntityConditions(crossEntityConditions, logicalOperator, entity);
  }

  // 2. Complex Conditions
  if (conditions && Array.isArray(conditions) && conditions.length > 0) {
    return evaluateComplexCondition(conditions, logicalOperator, entity);
  }

  // 3. Simple Condition
  return evaluateSimpleCondition(config, getFieldValue(entity, config.field), entity);
}

function getFieldValue(entity: any, field: string): any {
  const fieldPath = field.split('.');
  let value = entity;

  for (const path of fieldPath) {
    if (value && typeof value === 'object' && path in value) {
      value = value[path];
    } else {
      return null;
    }
  }

  return value;
}

function evaluateSimpleCondition(config: any, fieldValue: any, entity: any): boolean {
  const { condition, operator, value, threshold } = config;

  switch (condition) {
    case 'overdue':
      return checkOverdue(fieldValue, threshold, entity);
    case 'empty':
      return checkEmpty(fieldValue);
    case 'threshold':
      return checkThreshold(fieldValue, operator, value);
    case 'date_range':
      return checkDateRange(fieldValue, operator, value);
    case 'custom':
      return checkCustom(fieldValue, operator, value);
    default:
      return false;
  }
}

function evaluateComplexCondition(conditions: any[], logicalOperator: string, entity: any): boolean {
  if (!conditions || conditions.length === 0) return false;

  const results = conditions.map(conditionConfig => {
    const fieldValue = getFieldValue(entity, conditionConfig.field);
    return evaluateSingleCondition(conditionConfig, fieldValue, entity);
  });

  switch (logicalOperator?.toUpperCase()) {
    case 'AND':
      return results.every(result => result);
    case 'OR':
      return results.some(result => result);
    case 'NOT':
      return results.length === 1 ? !results[0] : false;
    default:
      return results.every(result => result);
  }
}

function evaluateSingleCondition(conditionConfig: any, fieldValue: any, entity: any): boolean {
  const { condition, operator, value, threshold } = conditionConfig;

  switch (condition) {
    case 'overdue':
      return checkOverdue(fieldValue, threshold, entity);
    case 'empty':
      return checkEmpty(fieldValue);
    case 'threshold':
      return checkThreshold(fieldValue, operator, value);
    case 'date_range':
      return checkDateRange(fieldValue, operator, value);
    case 'custom':
      return checkCustom(fieldValue, operator, value);
    default:
      return false;
  }
}

async function evaluateCrossEntityConditions(conditions: any[], logicalOperator: string, mainEntity: any): Promise<boolean> {
  const results = await Promise.all(conditions.map(async condition => {
    const { entityType, field, condition: conditionType, operator, value, threshold } = condition;
    
    let targetEntity = null;

    switch (entityType) {
      case 'candidate':
        targetEntity = mainEntity.entityType === 'candidate' ? mainEntity : mainEntity.candidate;
        break;
      case 'position':
        targetEntity = mainEntity.entityType === 'position' ? mainEntity : mainEntity.position;
        break;
      case 'headcount':
        targetEntity = mainEntity.entityType === 'headcount' ? mainEntity : mainEntity.headcount;
        break;
      case 'grade':
        targetEntity = mainEntity.grade || mainEntity.position?.grade;
        break;
      case 'recruiter':
        targetEntity = mainEntity.recruiter || mainEntity.position?.recruiter;
        break;
      case 'source':
        targetEntity = mainEntity.source;
        break;
    }

    if (!targetEntity) return false;
    
    const fieldValue = getFieldValue(targetEntity, field);
    return evaluateSingleCondition({ condition: conditionType, operator, value, threshold }, fieldValue, targetEntity);
  }));

  switch (logicalOperator?.toUpperCase()) {
    case 'AND':
      return results.every(result => result);
    case 'OR':
      return results.some(result => result);
    case 'NOT':
      return results.length === 1 ? !results[0] : false;
    default:
      return results.every(result => result);
  }
}

function checkOverdue(fieldValue: any, threshold: number | null, entity: any): boolean {
  if (!fieldValue) return false;
  
  const date = new Date(fieldValue);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  // Use threshold if provided, otherwise use grade SLA
  let slaDays = threshold;
  if (!slaDays && entity?.grade?.slaDays) {
    slaDays = entity.grade.slaDays;
  }
  
  return daysDiff > (slaDays || 30);
}

function checkEmpty(fieldValue: any): boolean {
  return !fieldValue || fieldValue === '' || fieldValue === null || fieldValue === undefined;
}

function checkThreshold(fieldValue: any, operator: string, value: string): boolean {
  if (fieldValue === null || fieldValue === undefined) return false;
  
  const numValue = parseFloat(value);
  const numFieldValue = parseFloat(fieldValue);
  
  if (isNaN(numValue) || isNaN(numFieldValue)) return false;
  
  switch (operator) {
    case 'gt': return numFieldValue > numValue;
    case 'lt': return numFieldValue < numValue;
    case 'eq': return numFieldValue === numValue;
    case 'ne': return numFieldValue !== numValue;
    case 'gte': return numFieldValue >= numValue;
    case 'lte': return numFieldValue <= numValue;
    default: return false;
  }
}

function checkDateRange(fieldValue: any, operator: string, value: string): boolean {
  if (!fieldValue) return false;
  
  const date = new Date(fieldValue);
  const compareDate = new Date(value);
  
  switch (operator) {
    case 'lt': return date < compareDate;
    case 'gt': return date > compareDate;
    case 'eq': return date.getTime() === compareDate.getTime();
    case 'ne': return date.getTime() !== compareDate.getTime();
    default: return false;
  }
}

function checkCustom(fieldValue: any, operator: string, value: string): boolean {
  if (fieldValue === null || fieldValue === undefined) return false;
  
  const fieldStr = String(fieldValue).toLowerCase();
  const valueStr = String(value).toLowerCase();
  
  switch (operator) {
    case 'eq': return fieldStr === valueStr;
    case 'ne': return fieldStr !== valueStr;
    case 'contains': return fieldStr.includes(valueStr);
    case 'startsWith': return fieldStr.startsWith(valueStr);
    case 'endsWith': return fieldStr.endsWith(valueStr);
    default: return false;
  }
}
