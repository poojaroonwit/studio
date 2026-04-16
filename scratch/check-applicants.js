const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://fitscan:VrTNc55atSS5tWk5cgs5VFdAdxNzZE3T@localhost:5433/fitscan'
    }
  }
});

async function main() {
  const count = await prisma.applicant.count();
  console.log('Applicant count:', count);

  if (count > 0) {
    const samples = await prisma.applicant.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        statusId: true,
        recruiterId: true
      }
    });
    console.log('Sample applicants:');
    console.log(JSON.stringify(samples, null, 2));

    // Check if any have statusId or recruiterId
    const withStatus = await prisma.applicant.count({ where: { NOT: { statusId: null } } });
    const withRecruiter = await prisma.applicant.count({ where: { NOT: { recruiterId: null } } });
    console.log('Applicants with status:', withStatus);
    console.log('Applicants with recruiter:', withRecruiter);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
