// sync-fit-score.js
// Script to sync Candidate.fitScore with parsedData.job_applied.fitScore

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  let updatedCount = 0;
  const candidates = await prisma.candidate.findMany({
    select: { id: true, fitScore: true, parsedData: true },
  });

  for (const candidate of candidates) {
    let newScore = undefined;
    if (candidate.parsedData && candidate.parsedData.job_applied && typeof candidate.parsedData.job_applied.fitScore === 'number') {
      newScore = candidate.parsedData.job_applied.fitScore;
    }
    if (typeof newScore === 'number' && newScore !== candidate.fitScore) {
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { fitScore: Math.round(newScore) },
      });
      updatedCount++;
      console.log(`Updated candidate ${candidate.id}: fitScore set to ${newScore}`);
    }
  }
  console.log(`\nDone. Updated ${updatedCount} candidates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 