const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function generateAllWarnings() {
  console.log('🔧 Generating warnings for all existing entities...\n');
  
  try {
    // Get all warning configurations
    const configs = await prisma.warningConfiguration.findMany({
      where: { isActive: true }
    });
    
    console.log(`Found ${configs.length} active warning configurations`);
    
    // Get all candidates
    const candidates = await prisma.candidate.findMany({
      select: { id: true, name: true, email: true }
    });
    
    console.log(`Found ${candidates.length} candidates to check`);
    
    // Get all positions
    const positions = await prisma.position.findMany({
      select: { id: true, title: true }
    });
    
    console.log(`Found ${positions.length} positions to check`);
    
    // Get all headcounts
    const headcounts = await prisma.headcount.findMany({
      select: { id: true }
    });
    
    console.log(`Found ${headcounts.length} headcounts to check`);
    
    let totalWarningsCreated = 0;
    
    // Check candidates
    console.log('\n🔍 Checking candidates...');
    for (const candidate of candidates) {
      try {
        const results = await checkEntityWarnings('candidate', candidate.id);
        for (const result of results) {
          if (result.hasWarning && result.configurationId) {
            await createOrUpdateWarning('candidate', candidate.id, result);
            totalWarningsCreated++;
            console.log(`   ✅ Created warning for candidate ${candidate.name}: ${result.message}`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Error checking candidate ${candidate.name}:`, error.message);
      }
    }
    
    // Check positions
    console.log('\n🔍 Checking positions...');
    for (const position of positions) {
      try {
        const results = await checkEntityWarnings('position', position.id);
        for (const result of results) {
          if (result.hasWarning && result.configurationId) {
            await createOrUpdateWarning('position', position.id, result);
            totalWarningsCreated++;
            console.log(`   ✅ Created warning for position ${position.title}: ${result.message}`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Error checking position ${position.title}:`, error.message);
      }
    }
    
    // Check headcounts
    console.log('\n🔍 Checking headcounts...');
    for (const headcount of headcounts) {
      try {
        const results = await checkEntityWarnings('headcount', headcount.id);
        for (const result of results) {
          if (result.hasWarning && result.configurationId) {
            await createOrUpdateWarning('headcount', headcount.id, result);
            totalWarningsCreated++;
            console.log(`   ✅ Created warning for headcount ${headcount.id}: ${result.message}`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Error checking headcount ${headcount.id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Warning generation completed!`);
    console.log(`📊 Total warnings created: ${totalWarningsCreated}`);
    
  } catch (error) {
    console.error('❌ Error generating warnings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkEntityWarnings(entityType, entityId) {
  // Get user's accessible configurations
  const configs = await prisma.warningConfiguration.findMany({
    where: {
      entityType,
      isActive: true,
      OR: [
        { isPublic: true }
      ]
    }
  });
  
  const results = [];
  
  for (const config of configs) {
    try {
      const result = await checkWarning(config, entityType, entityId);
      if (result.hasWarning) {
        results.push(result);
      }
    } catch (error) {
      console.error(`Error checking config ${config.name}:`, error.message);
    }
  }
  
  return results;
}

async function checkWarning(config, entityType, entityId) {
  // Get entity data
  const entity = await getEntityData(entityType, entityId);
  if (!entity) {
    return { hasWarning: false };
  }
  
  const hasWarning = await evaluateCondition(config, entity);
  
  if (hasWarning) {
    const message = generateWarningMessage(config, entity);
    return {
      hasWarning: true,
      message,
      currentValue: 'null',
      expectedValue: 'not null',
      severity: config.severity,
      configurationId: config.id
    };
  }
  
  return { hasWarning: false };
}

async function getEntityData(entityType, entityId) {
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

async function evaluateCondition(config, entity) {
  const { conditionGroups } = config;
  
  if (conditionGroups && Array.isArray(conditionGroups) && conditionGroups.length > 0) {
    return evaluateConditionGroups(conditionGroups, entity);
  }
  
  return false;
}

function evaluateConditionGroups(conditionGroups, entity) {
  if (!conditionGroups || conditionGroups.length === 0) return false;
  
  const groupResults = conditionGroups.map(group => {
    const { logicalOperator = 'AND', conditions = [] } = group;
    
    if (!conditions || conditions.length === 0) return true;
    
    const conditionResults = conditions.map(condition => {
      const fieldValue = getFieldValue(entity, condition.field);
      return evaluateSingleCondition(condition, fieldValue, entity);
    });
    
    switch (logicalOperator?.toUpperCase()) {
      case 'AND':
        return conditionResults.every(result => result);
      case 'OR':
        return conditionResults.some(result => result);
      case 'NOT':
        return conditionResults.length === 1 ? !conditionResults[0] : false;
      default:
        return conditionResults.every(result => result);
    }
  });
  
  return groupResults.every(result => result);
}

function getFieldValue(entity, field) {
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

function evaluateSingleCondition(conditionConfig, fieldValue, entity) {
  const { condition } = conditionConfig;
  
  switch (condition) {
    case 'is_empty':
      return checkEmpty(fieldValue);
    case 'is_not_empty':
      return !checkEmpty(fieldValue);
    case 'equals':
      return checkEquals(fieldValue, conditionConfig.value);
    default:
      return false;
  }
}

function checkEmpty(value) {
  return value === null || value === undefined || value === '' || 
         (Array.isArray(value) && value.length === 0);
}

function checkEquals(value, expectedValue) {
  return value === expectedValue;
}

function generateWarningMessage(config, entity) {
  switch (config.name) {
    case 'Candidate No Source':
      return `Candidate ${entity.name} has no source assigned`;
    case 'Candidate No Recruiter Assigned':
      return `Candidate ${entity.name} has no recruiter assigned`;
    case 'Candidate No Email':
      return `Candidate ${entity.name} has no email address`;
    case 'Position No Recruiter Assigned':
      return `Position ${entity.title} has no recruiter assigned`;
    case 'Position No Grade Assigned':
      return `Position ${entity.title} has no grade assigned`;
    case 'Position No Start Date':
      return `Position ${entity.title} has no start date`;
    default:
      return config.description || 'Warning condition met';
  }
}

async function createOrUpdateWarning(entityType, entityId, result) {
  if (!result.configurationId) return;
  
  const existingWarning = await prisma.warning.findFirst({
    where: {
      configuration_id: result.configurationId,
      entityType,
      entityId
    }
  });
  
  if (existingWarning) {
    await prisma.warning.update({
      where: { id: existingWarning.id },
      data: {
        currentValue: result.currentValue,
        expectedValue: result.expectedValue,
        message: result.message || '',
        severity: result.severity || 'warning',
        updated_at: new Date()
      }
    });
  } else {
    await prisma.warning.create({
      data: {
        configuration_id: result.configurationId,
        entityType,
        entityId,
        field: 'sourceId', // Default field
        currentValue: result.currentValue,
        expectedValue: result.expectedValue,
        message: result.message || '',
        severity: result.severity || 'warning',
        updated_at: new Date()
      }
    });
  }
}

// Run the script
if (require.main === module) {
  generateAllWarnings().catch(console.error);
}

module.exports = { generateAllWarnings };
