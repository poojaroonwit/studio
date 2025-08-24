// Test script for auto-close functionality
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAutoClose() {
  try {
    console.log('Testing auto-close functionality...\n');

    // 1. Check current positions and headcounts
    console.log('1. Current positions and headcounts:');
    const positions = await prisma.position.findMany({
      include: {
        headcounts: {
          include: {
            candidate: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      }
    });

    positions.forEach(position => {
      console.log(`\nPosition: ${position.title} (${position.id})`);
      console.log(`  Status: ${position.isOpen ? 'Open' : 'Closed'}`);
      console.log(`  Headcounts: ${position.headcounts.length}`);
      
      position.headcounts.forEach(headcount => {
        const candidateInfo = headcount.candidate 
          ? `${headcount.candidate.name} (${headcount.candidate.status})`
          : 'No candidate assigned';
        console.log(`    - ${headcount.id}: ${headcount.status} - ${candidateInfo}`);
      });
    });

    // 2. Check which positions should be auto-closed
    console.log('\n2. Positions that should be auto-closed:');
    const positionsToCheck = positions.filter(p => p.isOpen);
    
    for (const position of positionsToCheck) {
      const totalHeadcounts = position.headcounts.length;
      const filledHeadcounts = position.headcounts.filter(h => h.status === 'filled').length;
      const vacantHeadcounts = position.headcounts.filter(h => h.status === 'vacant').length;
      
      console.log(`\n${position.title}:`);
      console.log(`  Total: ${totalHeadcounts}, Filled: ${filledHeadcounts}, Vacant: ${vacantHeadcounts}`);
      
      if (totalHeadcounts > 0 && vacantHeadcounts === 0 && filledHeadcounts > 0) {
        console.log(`  ✅ SHOULD BE AUTO-CLOSED`);
      } else if (totalHeadcounts === 0) {
        console.log(`  ⚠️  No headcounts defined`);
      } else {
        console.log(`  ❌ Should remain open (has vacant headcounts)`);
      }
    }

    // 3. Test the auto-close check function
    console.log('\n3. Testing auto-close check function:');
    const { checkPositionHeadcountStatus } = require('../src/lib/headcountUtils.ts');
    
    for (const position of positionsToCheck) {
      try {
        const status = await checkPositionHeadcountStatus(position.id);
        console.log(`\n${position.title}:`);
        console.log(`  Status:`, status);
        
        if (status.isFilled) {
          console.log(`  ✅ Should be auto-closed`);
        } else {
          console.log(`  ❌ Should remain open`);
        }
      } catch (error) {
        console.error(`Error checking ${position.title}:`, error);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAutoClose();
