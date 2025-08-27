// Simple example data creation script
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createExamplePosition() {
  console.log('🌱 Creating example position...');
  
  const title = 'Example Software Engineer';
  const department = 'Engineering';

  // Check if position already exists
  const existing = await prisma.position.findFirst({
    where: { title, department }
  });
  
  if (existing) {
    console.log(`✅ Position already exists: ${existing.title} (${existing.id})`);
    return existing;
  }

  // Find a recruiter
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
  
  console.log(`✅ Created position: ${position.title} (${position.id})`);
  return position;
}

async function createExampleCandidates(positionId, count = 345) {
  console.log(`🌱 Creating ${count} example candidates...`);
  
  const firstNames = [
    'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack',
    'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Ruby', 'Sam', 'Tara',
    'Uma', 'Victor', 'Wendy', 'Xavier', 'Yara', 'Zoe', 'Alex', 'Blake', 'Casey', 'Drew',
    'Emery', 'Finley', 'Gray', 'Harper', 'Indigo', 'Jordan', 'Kai', 'Luna', 'Morgan', 'Nova',
    'Ocean', 'Parker', 'River', 'Sage', 'Taylor', 'Unity', 'Val', 'Winter', 'Xander', 'Yuki',
    'Zen', 'Aria', 'Blaze', 'Cedar', 'Dawn', 'Echo', 'Flint', 'Gale', 'Haven', 'Iris',
    'Jade', 'Kestrel', 'Lark', 'Moss', 'Nyx', 'Orion', 'Phoenix', 'Raven', 'Storm', 'Thunder',
    'Vale', 'Willow', 'Xena', 'Yarrow', 'Zephyr', 'Aurora', 'Breeze', 'Canyon', 'Delta', 'Ember',
    'Frost', 'Glacier', 'Harbor', 'Jupiter', 'Kodiak', 'Meadow', 'Nebula', 'Pine', 'Quartz', 'Ridge',
    'Sierra', 'Tundra', 'Vega', 'Wren', 'Xerxes', 'Zinc', 'Aster', 'Birch', 'Dune', 'Elm',
    'Fir', 'Grove', 'Hickory', 'Juniper', 'Koa', 'Larch', 'Maple', 'Oak', 'Redwood', 'Spruce',
    'Tamarack', 'Walnut', 'Yew', 'Zebra', 'Alpine', 'Basin', 'Desert', 'Estuary', 'Fjord', 'Gorge',
    'Heath', 'Island', 'Jungle', 'Knoll', 'Lagoon', 'Marsh', 'Nook', 'Oasis', 'Peak', 'Quay',
    'Reef', 'Savanna', 'Upland', 'Valley', 'Wetland', 'Xeric', 'Yardang', 'Zenith', 'Acacia', 'Bamboo',
    'Cactus', 'Dahlia', 'Eucalyptus', 'Fern', 'Gardenia', 'Hibiscus', 'Jasmine', 'Kale', 'Lavender', 'Marigold',
    'Nasturtium', 'Orchid', 'Petunia', 'Rose', 'Sunflower', 'Tulip', 'Violet', 'Wisteria', 'Xeranthemum', 'Zinnia'
  ];
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Lopez',
    'Lee', 'Gonzalez', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall', 'Young',
    'Allen', 'Sanchez', 'Wright', 'King', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
    'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez',
    'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart',
    'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson',
    'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Torres', 'Peterson',
    'Gray', 'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood',
    'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson', 'Hughes',
    'Flores', 'Washington', 'Butler', 'Simmons', 'Foster', 'Gonzales', 'Bryant', 'Alexander', 'Russell', 'Griffin',
    'Diaz', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham', 'Sullivan', 'Wallace', 'Woods', 'Cole',
    'West', 'Jordan', 'Owens', 'Reynolds', 'Fisher', 'Ellis', 'Harrison', 'Gibson', 'McDonald', 'Cruz',
    'Marshall', 'Ortiz', 'Gomez', 'Murray', 'Freeman', 'Wells', 'Webb', 'Simpson', 'Stevens', 'Tucker',
    'Porter', 'Hunter', 'Hicks', 'Crawford', 'Henry', 'Boyd', 'Mason', 'Morales', 'Kennedy', 'Warren',
    'Dixon', 'Ramos', 'Reyes', 'Burns', 'Gordon', 'Shaw', 'Holmes', 'Rice', 'Robertson', 'Hunt',
    'Black', 'Daniels', 'Palmer', 'Mills', 'Nichols', 'Grant', 'Knight', 'Ferguson', 'Rose', 'Stone',
    'Hawkins', 'Dunn', 'Perkins', 'Hudson', 'Spencer', 'Gardner', 'Stephens', 'Payne', 'Pierce', 'Berry',
    'Matthews', 'Arnold', 'Wagner', 'Willis', 'Ray', 'Watkins', 'Olson', 'Carroll', 'Duncan', 'Snyder',
    'Hart', 'Cunningham', 'Bradley', 'Lane', 'Andrews', 'Ruiz', 'Harper', 'Fox', 'Riley', 'Armstrong',
    'Carpenter', 'Weaver', 'Greene', 'Lawrence', 'Elliott', 'Chavez', 'Sims', 'Austin', 'Peters', 'Kelley',
    'Franklin', 'Lawson', 'Fields', 'Gutierrez', 'Ryan', 'Schmidt', 'Carr', 'Vasquez', 'Castillo', 'Wheeler',
    'Chapman', 'Oliver', 'Montgomery', 'Richards', 'Williamson', 'Johnston', 'Banks', 'Meyer', 'Bishop', 'McCoy',
    'Howell', 'Alvarez', 'Morrison', 'Hansen', 'Fernandez', 'Garza', 'Harvey', 'Little', 'Burton', 'Stanley',
    'Nguyen', 'George', 'Jacobs', 'Reid', 'Kim', 'Fuller', 'Lynch', 'Dean', 'Gilbert', 'Garrett',
    'Romero', 'Welch', 'Larson', 'Frazier', 'Burke', 'Hanson', 'Day', 'Mendoza', 'Moreno', 'Bowman',
    'Medina', 'Fowler', 'Brewer', 'Hoffman', 'Carlson', 'Silva', 'Pearson', 'Holland', 'Douglas', 'Fleming',
    'Jensen', 'Vargas', 'Byrd', 'Davidson', 'Hopkins', 'May', 'Terry', 'Herrera', 'Wade', 'Soto',
    'Walters', 'Curtis', 'Neal', 'Caldwell', 'Lowe', 'Jennings', 'Barnett', 'Graves', 'Jimenez', 'Horton',
    'Shelton', 'Barrett', 'Obrien', 'Castro', 'Sutton', 'Gregory', 'McKinney', 'Lucas', 'Miles', 'Craig',
    'Rodriquez', 'Chambers', 'Holt', 'Lambert', 'Fletcher', 'Watts', 'Bates', 'Hale', 'Rhodes', 'Pena',
    'Beck', 'Newman', 'Haynes', 'McDaniel', 'Mendez', 'Bush', 'Vaughn', 'Parks', 'Dawson', 'Santiago',
    'Norris', 'Hardy', 'Love', 'Steele', 'Curry', 'Powers', 'Schultz', 'Barker', 'Guzman', 'Page',
    'Munoz', 'Ball', 'Keller', 'Chandler', 'Weber', 'Leonard', 'Walsh', 'Lyons', 'Ramsey', 'Wolfe',
    'Schneider', 'Mullins', 'Benson', 'Sharp', 'Bowen', 'Daniel', 'Barber', 'Cummings', 'Hines', 'Baldwin'
  ];
  const skills = ['JavaScript', 'React', 'Node.js', 'Python', 'Java', 'TypeScript', 'Docker', 'AWS', 'Git', 'Agile'];
  
  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const phone = `+1-555-${String(1000 + i).padStart(4, '0')}`;
    const fitScore = (Math.floor(Math.random() * 40) + 60) / 100; // 0.6-1.0 range
    const experienceYears = Math.floor(Math.random() * 8) + 1;
    const selectedSkills = skills.slice(0, Math.floor(Math.random() * 5) + 3);
    
    // Check if candidate already exists
    const existing = await prisma.candidate.findFirst({
      where: { email }
    });
    
    if (existing) {
      skippedCount++;
      continue;
    }

    try {
      const candidate = await prisma.candidate.create({
        data: {
          name,
          email: email.toLowerCase(),
          phone,
          positionId: positionId || null,
          status: 'Applied',
          fitScore,
          parsedData: {
            candidate_info: {
              personal_info: { 
                firstname: firstName, 
                lastname: lastName
              },
              contact_info: { 
                email, 
                phone 
              },
              status: 'Applied',
              experience: `${experienceYears} years`,
              skills: selectedSkills
            },
            job_applied: positionId ? { 
              jobId: positionId, 
              fitScore: fitScore * 100
            } : undefined
          },
          customAttributes: { 
            demo: true,
            experienceYears,
            skills: selectedSkills
          }
        }
      });

      // Create transition record
      await prisma.transitionRecord.create({
        data: {
          candidateId: candidate.id,
          positionId: positionId || null,
          stage: 'Applied',
          notes: `Initial creation via example seed script (candidate ${i + 1}/${count}).`
        }
      });

      createdCount++;
      
      if (createdCount % 50 === 0) {
        console.log(`  ✅ Created ${createdCount} candidates...`);
      }
      
    } catch (error) {
      console.error(`❌ Error creating candidate ${name}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Candidate creation summary:`);
  console.log(`  • Created: ${createdCount}`);
  console.log(`  • Skipped (already existed): ${skippedCount}`);
  console.log(`  • Errors: ${errorCount}`);
  console.log(`  • Total processed: ${createdCount + skippedCount + errorCount}`);

  return { createdCount, skippedCount, errorCount };
}

async function main() {
  console.log('🚀 Starting example data creation...');
  
  try {
    const position = await createExamplePosition();
    const result = await createExampleCandidates(position.id, 345);
    
    console.log('\n🎉 Example data creation completed!');
    console.log(`📈 Summary:`);
    console.log(`  • Position: ${position.title}`);
    console.log(`  • Candidates: ${result.createdCount} created, ${result.skippedCount} skipped`);
    
  } catch (error) {
    console.error('❌ Failed to create example data:', error);
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Script completed successfully');
      return prisma.$disconnect();
    })
    .catch((err) => {
      console.error('❌ Script failed:', err);
      return prisma.$disconnect().finally(() => process.exit(1));
    });
}

module.exports = { main };
