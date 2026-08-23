const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const learningClientPath = path.join(root, 'src/app/learning/LearningPageClient.tsx');
const learningOverviewPath = path.join(root, 'src/app/learning/LearningOverview.tsx');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const learningClient = fs.readFileSync(learningClientPath, 'utf8');

assert(
  fs.existsSync(learningOverviewPath),
  'LearningOverview must be extracted to src/app/learning/LearningOverview.tsx',
);
assert(
  learningClient.includes('from "./LearningOverview"'),
  'LearningPageClient must import the extracted LearningOverview component',
);
assert(
  !learningClient.includes('function LearningOverview('),
  'LearningPageClient must not keep an inline LearningOverview implementation',
);

console.log('Learning component decomposition regression checks passed.');
