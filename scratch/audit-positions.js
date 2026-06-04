const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://fitscan:CHANGE_ME_STRONG_PASSWORD@localhost:5433/fitscan'
    }
  }
});

async function main() {
  const positions = await prisma.position.findMany({
    include: {
      applicants: true,
      interviewers: {
        include: {
          user: true
        }
      }
    }
  });

  console.log('Total Positions:', positions.length);
  positions.forEach(p => {
    console.log(`\nPosition: ${p.title} (${p.id})`);
    console.log(`Applicants: ${p.applicants.length}`);
    console.log(`Interviewers: ${p.interviewers.length}`);
    p.interviewers.forEach(pi => {
      console.log(`- ${pi.user.name} (${pi.user.role})`);
    });
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
