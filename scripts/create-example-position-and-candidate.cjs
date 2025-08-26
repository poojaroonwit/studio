// Seed a single example Position and a linked Candidate
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function ensureExamplePosition() {
  // Customize these as needed
  const title = 'Example Software Engineer';
  const department = 'Engineering';

  // Try to reuse if it already exists
  const existing = await prisma.position.findFirst({
    where: { title, department }
  });
  if (existing) return existing;

  // Optionally pick a recruiter to attach (if one exists)
  const recruiter = await prisma.user.findFirst({
    where: { role: { in: ['Recruiter', 'Admin'] } },
    select: { id: true }
  });

  const position = await prisma.position.create({
    data: {
      title,
      department,
      description: 'This is an example position created by the seed script.',
      isOpen: true,
      recruiterId: recruiter?.id || null,
      matchCriteria: 'title:Software Engineer\ndepartment:Engineering\nexperience:3+ years',
      customAttributes: { demo: true }
    }
  });
  return position;
}

async function generateCandidateData(index) {
  const firstNames = [
    'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
    'Ivy', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Paul',
    'Quinn', 'Ruby', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xavier',
    'Yara', 'Zoe', 'Alex', 'Blake', 'Casey', 'Drew', 'Emery', 'Finley',
    'Gray', 'Harper', 'Indigo', 'Jordan', 'Kai', 'Luna', 'Morgan', 'Nova',
    'Ocean', 'Parker', 'Quinn', 'River', 'Sage', 'Taylor', 'Unity', 'Val',
    'Winter', 'Xander', 'Yuki', 'Zen', 'Aria', 'Blaze', 'Cedar', 'Dawn',
    'Echo', 'Flint', 'Gale', 'Haven', 'Iris', 'Jade', 'Kestrel', 'Lark',
    'Moss', 'Nyx', 'Orion', 'Phoenix', 'Raven', 'Storm', 'Thunder', 'Vale',
    'Willow', 'Xena', 'Yarrow', 'Zephyr', 'Aurora', 'Breeze', 'Canyon', 'Delta',
    'Ember', 'Frost', 'Glacier', 'Harbor', 'Indigo', 'Jupiter', 'Kodiak', 'Luna',
    'Meadow', 'Nebula', 'Ocean', 'Pine', 'Quartz', 'Ridge', 'Sierra', 'Tundra',
    'Vega', 'Wren', 'Xerxes', 'Yarrow', 'Zinc', 'Aster', 'Birch', 'Cedar',
    'Dune', 'Elm', 'Fir', 'Grove', 'Hickory', 'Ivy', 'Juniper', 'Koa',
    'Larch', 'Maple', 'Oak', 'Pine', 'Redwood', 'Spruce', 'Tamarack', 'Walnut',
    'Yew', 'Zebra', 'Alpine', 'Basin', 'Canyon', 'Desert', 'Estuary', 'Fjord',
    'Gorge', 'Heath', 'Island', 'Jungle', 'Knoll', 'Lagoon', 'Marsh', 'Nook',
    'Oasis', 'Peak', 'Quay', 'Reef', 'Savanna', 'Tundra', 'Upland', 'Valley',
    'Wetland', 'Xeric', 'Yardang', 'Zenith', 'Acacia', 'Bamboo', 'Cactus', 'Dahlia',
    'Eucalyptus', 'Fern', 'Gardenia', 'Hibiscus', 'Iris', 'Jasmine', 'Kale', 'Lavender',
    'Marigold', 'Nasturtium', 'Orchid', 'Petunia', 'Rose', 'Sunflower', 'Tulip', 'Violet',
    'Wisteria', 'Xeranthemum', 'Yarrow', 'Zinnia'
  ];

  const lastNames = [
    'Anderson', 'Brown', 'Clark', 'Davis', 'Evans', 'Fisher', 'Garcia', 'Harris',
    'Ivanov', 'Johnson', 'King', 'Lee', 'Miller', 'Nelson', 'O\'Connor', 'Parker',
    'Quinn', 'Roberts', 'Smith', 'Taylor', 'Upton', 'Vargas', 'Wilson', 'Xavier',
    'Young', 'Zhang', 'Adams', 'Baker', 'Campbell', 'Davis', 'Edwards', 'Foster',
    'Green', 'Hall', 'Irwin', 'Jackson', 'Kelly', 'Lewis', 'Martin', 'Norton',
    'Oliver', 'Patterson', 'Quinn', 'Reed', 'Stewart', 'Thompson', 'Underwood', 'Vance',
    'Walker', 'White', 'Xiong', 'Young', 'Zimmerman', 'Allen', 'Bennett', 'Cooper',
    'Dixon', 'Edwards', 'Fox', 'Gray', 'Hayes', 'Ingram', 'James', 'Knight',
    'Lawrence', 'Mason', 'Newman', 'Owen', 'Phillips', 'Quinn', 'Russell', 'Scott',
    'Turner', 'Upton', 'Vaughn', 'Ward', 'Wood', 'Xavier', 'York', 'Zimmerman',
    'Adams', 'Black', 'Collins', 'Dixon', 'Evans', 'Ford', 'Grant', 'Hill',
    'Jones', 'Klein', 'Lopez', 'Moore', 'Nelson', 'Ortiz', 'Price', 'Quinn',
    'Ross', 'Stewart', 'Turner', 'Upton', 'Vega', 'Wright', 'Xavier', 'Young',
    'Zimmerman', 'Allen', 'Brooks', 'Carter', 'Davis', 'Edwards', 'Flores', 'Gonzalez',
    'Harris', 'Jackson', 'King', 'Lee', 'Miller', 'Nelson', 'O\'Connor', 'Parker',
    'Quinn', 'Roberts', 'Smith', 'Taylor', 'Upton', 'Vargas', 'Wilson', 'Xavier',
    'Young', 'Zhang', 'Adams', 'Baker', 'Campbell', 'Davis', 'Edwards', 'Foster',
    'Green', 'Hall', 'Irwin', 'Jackson', 'Kelly', 'Lewis', 'Martin', 'Norton',
    'Oliver', 'Patterson', 'Quinn', 'Reed', 'Stewart', 'Thompson', 'Underwood', 'Vance',
    'Walker', 'White', 'Xiong', 'Young', 'Zimmerman', 'Allen', 'Bennett', 'Cooper',
    'Dixon', 'Edwards', 'Fox', 'Gray', 'Hayes', 'Ingram', 'James', 'Knight',
    'Lawrence', 'Mason', 'Newman', 'Owen', 'Phillips', 'Quinn', 'Russell', 'Scott',
    'Turner', 'Upton', 'Vaughn', 'Ward', 'Wood', 'Xavier', 'York', 'Zimmerman'
  ];

  const skills = [
    'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'C#', 'Go', 'Rust',
    'TypeScript', 'Angular', 'Vue.js', 'Express.js', 'Django', 'Flask', 'Spring', '.NET',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'MongoDB', 'PostgreSQL', 'MySQL',
    'Redis', 'GraphQL', 'REST API', 'Microservices', 'CI/CD', 'Git', 'Linux', 'Agile',
    'Scrum', 'Kanban', 'JIRA', 'Confluence', 'Figma', 'Adobe Creative Suite', 'Sketch',
    'InVision', 'Zeplin', 'HTML5', 'CSS3', 'Sass', 'Less', 'Webpack', 'Babel',
    'Jest', 'Cypress', 'Selenium', 'Mocha', 'Chai', 'JUnit', 'NUnit', 'PyTest',
    'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn',
    'Tableau', 'Power BI', 'Looker', 'Snowflake', 'Redshift', 'BigQuery', 'Hadoop',
    'Spark', 'Kafka', 'Elasticsearch', 'Logstash', 'Kibana', 'Prometheus', 'Grafana',
    'Datadog', 'New Relic', 'Splunk', 'Ansible', 'Terraform', 'Puppet', 'Chef',
    'Jenkins', 'GitLab CI', 'GitHub Actions', 'CircleCI', 'Travis CI', 'TeamCity',
    'Bamboo', 'SonarQube', 'CodeClimate', 'Coverity', 'Black Duck', 'Snyk', 'OWASP ZAP',
    'Burp Suite', 'Nmap', 'Wireshark', 'Metasploit', 'Nessus', 'Qualys', 'Rapid7',
    'CrowdStrike', 'Carbon Black', 'SentinelOne', 'Cylance', 'FireEye', 'Palo Alto',
    'Cisco', 'Juniper', 'F5', 'Nginx', 'Apache', 'IIS', 'Tomcat', 'JBoss',
    'WebLogic', 'WebSphere', 'Oracle', 'SQL Server', 'DB2', 'Sybase', 'Informix',
    'Cassandra', 'CouchDB', 'Neo4j', 'ArangoDB', 'InfluxDB', 'TimescaleDB', 'ClickHouse',
    'Elasticsearch', 'Solr', 'Algolia', 'Meilisearch', 'Typesense', 'Weaviate', 'Pinecone'
  ];

  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[index % lastNames.length];
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`;
  const phone = `+1-555-${String(index + 1000).padStart(4, '0')}`;
  const fitScore = Math.floor(Math.random() * 40) + 60; // 60-99 range
  const experienceYears = Math.floor(Math.random() * 8) + 1; // 1-8 years
  const selectedSkills = skills.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 5) + 3); // 3-7 skills

  return {
    name,
    email,
    phone,
    fitScore,
    experienceYears,
    skills: selectedSkills
  };
}

async function ensureExampleCandidates(positionId, count = 156) {
  console.log(`🌱 Creating ${count} example candidates...`);

  // Determine a reasonable initial stage
  let appliedStage = 'Applied';
  const firstStage = await prisma.recruitmentStage.findFirst({
    orderBy: { sortOrder: 'asc' }
  });
  if (firstStage?.name) appliedStage = firstStage.name;

  let createdCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < count; i++) {
    const candidateData = generateCandidateData(i);
    
    // Check if candidate already exists
    const existing = await prisma.candidate.findFirst({
      where: { email: candidateData.email }
    });
    
    if (existing) {
      skippedCount++;
      continue;
    }

    try {
      const candidate = await prisma.candidate.create({
        data: {
          name: candidateData.name,
          email: candidateData.email.toLowerCase(),
          phone: candidateData.phone,
          positionId: positionId || null,
          status: appliedStage,
          fitScore: candidateData.fitScore / 100, // Convert to 0-1 range
          parsedData: {
            candidate_info: {
              personal_info: { 
                firstname: candidateData.name.split(' ')[0], 
                lastname: candidateData.name.split(' ')[1] || candidateData.name.split(' ')[0]
              },
              contact_info: { 
                email: candidateData.email, 
                phone: candidateData.phone 
              },
              status: appliedStage,
              experience: `${candidateData.experienceYears} years`,
              skills: candidateData.skills
            },
            job_applied: positionId ? { 
              jobId: positionId, 
              fitScore: candidateData.fitScore 
            } : undefined
          },
          customAttributes: { 
            demo: true,
            experienceYears: candidateData.experienceYears,
            skills: candidateData.skills
          }
        }
      });

      // Create an initial transition record
      await prisma.transitionRecord.create({
        data: {
          candidateId: candidate.id,
          positionId: positionId || null,
          stage: appliedStage,
          notes: `Initial creation via example seed script (candidate ${i + 1}/${count}).`
        }
      });

      createdCount++;
      
      if (createdCount % 10 === 0) {
        console.log(`  ✅ Created ${createdCount} candidates...`);
      }
    } catch (error) {
      console.error(`❌ Error creating candidate ${candidateData.name}:`, error.message);
    }
  }

  console.log(`\n📊 Candidate creation summary:`);
  console.log(`  • Created: ${createdCount}`);
  console.log(`  • Skipped (already existed): ${skippedCount}`);
  console.log(`  • Total processed: ${createdCount + skippedCount}`);

  return { createdCount, skippedCount };
}

async function main() {
  console.log('🌱 Creating example Position and Candidates...');
  const position = await ensureExamplePosition();
  console.log(`✅ Position ready: ${position.title} (${position.id})`);

  const result = await ensureExampleCandidates(position.id, 156);
  console.log(`✅ Candidates ready: ${result.createdCount} created, ${result.skippedCount} skipped`);

  console.log('\n🎉 Example data created successfully.');
  console.log(`📈 Total candidates for position: ${result.createdCount + result.skippedCount}`);
}

if (require.main === module) {
  main()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      return prisma.$disconnect().finally(() => process.exit(1));
    });
}

module.exports = { main };


