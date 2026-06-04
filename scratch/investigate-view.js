const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://fitscan:CHANGE_ME_STRONG_PASSWORD@localhost:5433/fitscan'
    }
  }
});

async function main() {
  const email = 'admin@ncc.com';
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }

  console.log(`User: ${user.name} (${user.id})`);

  // Check positions where user is recruiter
  const recruiterPositions = await prisma.position.findMany({
    where: { recruiterId: user.id }
  });
  console.log('Positions as Recruiter:', recruiterPositions.length);

  // Check positions where user is interviewer
  const interviewerPositions = await prisma.positionInterviewer.findMany({
    where: { userId: user.id }
  });
  console.log('Positions as Interviewer:', interviewerPositions.length);

  // Check total positions
  const totalPositions = await prisma.position.count();
  console.log('Total positions in DB:', totalPositions);

  // Check total applicants
  const totalApplicants = await prisma.applicant.count();
  console.log('Total applicants in DB:', totalApplicants);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
