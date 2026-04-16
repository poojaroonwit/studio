const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://fitscan:VrTNc55atSS5tWk5cgs5VFdAdxNzZE3T@localhost:5433/fitscan'
    }
  }
});

async function main() {
  const userId = '18047c90-c6da-4443-bab8-5c9fd6b29e4c'; // admin@ncc.com
  
  const assignments = await prisma.positionInterviewer.findMany({
    where: { userId },
    include: {
      position: {
        include: {
          applicants: true
        }
      }
    }
  });

  console.log('Assignments found:', assignments.length);
  assignments.forEach(a => {
    console.log(`Position: ${a.position.title} (${a.position.id})`);
    console.log(`Applicants count: ${a.position.applicants.length}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
