const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createExampleData() {
  console.log('🚀 Creating example data for candidates and positions...\n');

  try {
    // 1. Create example positions
    console.log('📋 Creating example positions...');
    
    const positions = await Promise.all([
      prisma.position.create({
        data: {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          description: 'We are looking for a Senior Software Engineer to join our team. The ideal candidate should have 5+ years of experience in full-stack development.',
          matchCriteria: '5+ years of experience, React, Node.js, PostgreSQL, AWS',
          isOpen: true,
          positionLevel: 'Senior',
          customAttributes: {
            location: 'San Francisco, CA',
            salaryMin: 120000,
            salaryMax: 180000,
            requirements: '5+ years of experience, React, Node.js, PostgreSQL, AWS'
          }
        }
      }),
      prisma.position.create({
        data: {
          title: 'Product Manager',
          department: 'Product',
          description: 'Join our product team as a Product Manager. You will be responsible for defining product strategy and working with cross-functional teams.',
          matchCriteria: '3+ years PM experience, Agile, User research, Data analysis',
          isOpen: true,
          positionLevel: 'Mid',
          customAttributes: {
            location: 'New York, NY',
            salaryMin: 100000,
            salaryMax: 150000,
            requirements: '3+ years PM experience, Agile, User research, Data analysis'
          }
        }
      }),
      prisma.position.create({
        data: {
          title: 'UX Designer',
          department: 'Design',
          description: 'We need a creative UX Designer to help us build amazing user experiences. You will work closely with product and engineering teams.',
          matchCriteria: '3+ years UX experience, Figma, User research, Prototyping',
          isOpen: true,
          positionLevel: 'Mid',
          customAttributes: {
            location: 'Remote',
            salaryMin: 80000,
            salaryMax: 120000,
            requirements: '3+ years UX experience, Figma, User research, Prototyping'
          }
        }
      })
    ]);

    console.log(`✅ Created ${positions.length} positions`);

    // 2. Get recruitment stages
    const stages = await prisma.recruitmentStage.findMany();
    const appliedStage = stages.find(s => s.name === 'Applied');
    const interviewStage = stages.find(s => s.name === 'Interview Scheduled');

    if (!appliedStage || !interviewStage) {
      throw new Error('Recruitment stages not found. Please run the seed script first.');
    }

    // 3. Create example candidates
    console.log('👥 Creating example candidates...');
    
    const candidates = await Promise.all([
      prisma.candidate.create({
        data: {
          name: 'John Smith',
          email: 'john.smith@email.com',
          phone: '+1-555-0123',
          positionId: positions[0].id,
          statusId: appliedStage.id,
          fitScore: 85,
          applicationDate: new Date('2024-01-15'),
          parsedData: {
            skills: [
              { skill: 'React', level: 'Expert' },
              { skill: 'Node.js', level: 'Advanced' },
              { skill: 'PostgreSQL', level: 'Intermediate' },
              { skill: 'AWS', level: 'Advanced' }
            ],
            experience: [
              { company: 'Tech Corp', position: 'Senior Developer', duration: '3 years' },
              { company: 'StartupXYZ', position: 'Full Stack Developer', duration: '2 years' }
            ],
            education: [
              { university: 'Stanford University', degree: 'Computer Science', year: '2018' }
            ]
          },
          customAttributes: {
            availability: '2 weeks notice',
            expectedSalary: 150000,
            preferredLocation: 'San Francisco'
          }
        }
      }),
      prisma.candidate.create({
        data: {
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+1-555-0124',
          positionId: positions[1].id,
          statusId: interviewStage.id,
          fitScore: 92,
          applicationDate: new Date('2024-01-10'),
          parsedData: {
            skills: [
              { skill: 'Product Management', level: 'Expert' },
              { skill: 'Agile', level: 'Advanced' },
              { skill: 'User Research', level: 'Expert' },
              { skill: 'Data Analysis', level: 'Advanced' }
            ],
            experience: [
              { company: 'Product Inc', position: 'Senior Product Manager', duration: '4 years' },
              { company: 'Growth Co', position: 'Product Manager', duration: '2 years' }
            ],
            education: [
              { university: 'Harvard Business School', degree: 'MBA', year: '2020' }
            ]
          },
          customAttributes: {
            availability: 'Immediate',
            expectedSalary: 130000,
            preferredLocation: 'New York'
          }
        }
      }),
      prisma.candidate.create({
        data: {
          name: 'Mike Chen',
          email: 'mike.chen@email.com',
          phone: '+1-555-0125',
          positionId: positions[2].id,
          statusId: appliedStage.id,
          fitScore: 78,
          applicationDate: new Date('2024-01-20'),
          parsedData: {
            skills: [
              { skill: 'Figma', level: 'Expert' },
              { skill: 'User Research', level: 'Advanced' },
              { skill: 'Prototyping', level: 'Expert' },
              { skill: 'Design Systems', level: 'Advanced' }
            ],
            experience: [
              { company: 'Design Studio', position: 'Senior UX Designer', duration: '3 years' },
              { company: 'Creative Agency', position: 'UX Designer', duration: '2 years' }
            ],
            education: [
              { university: 'Art Center College', degree: 'Graphic Design', year: '2019' }
            ]
          },
          customAttributes: {
            availability: '1 month notice',
            expectedSalary: 100000,
            preferredLocation: 'Remote'
          }
        }
      }),
      prisma.candidate.create({
        data: {
          name: 'Emily Davis',
          email: 'emily.davis@email.com',
          phone: '+1-555-0126',
          positionId: positions[0].id,
          statusId: appliedStage.id,
          fitScore: 88,
          applicationDate: new Date('2024-01-18'),
          parsedData: {
            skills: [
              { skill: 'React', level: 'Advanced' },
              { skill: 'TypeScript', level: 'Expert' },
              { skill: 'GraphQL', level: 'Intermediate' },
              { skill: 'Docker', level: 'Advanced' }
            ],
            experience: [
              { company: 'Tech Giant', position: 'Software Engineer', duration: '4 years' },
              { company: 'Innovation Lab', position: 'Frontend Developer', duration: '1 year' }
            ],
            education: [
              { university: 'MIT', degree: 'Computer Science', year: '2019' }
            ]
          },
          customAttributes: {
            availability: '3 weeks notice',
            expectedSalary: 160000,
            preferredLocation: 'San Francisco'
          }
        }
      }),
      prisma.candidate.create({
        data: {
          name: 'Alex Rodriguez',
          email: 'alex.rodriguez@email.com',
          phone: '+1-555-0127',
          positionId: positions[1].id,
          statusId: appliedStage.id,
          fitScore: 75,
          applicationDate: new Date('2024-01-22'),
          parsedData: {
            skills: [
              { skill: 'Product Strategy', level: 'Advanced' },
              { skill: 'Market Research', level: 'Expert' },
              { skill: 'Stakeholder Management', level: 'Advanced' },
              { skill: 'Analytics', level: 'Intermediate' }
            ],
            experience: [
              { company: 'Consulting Firm', position: 'Product Consultant', duration: '3 years' },
              { company: 'Startup', position: 'Product Owner', duration: '1 year' }
            ],
            education: [
              { university: 'Wharton School', degree: 'MBA', year: '2021' }
            ]
          },
          customAttributes: {
            availability: '2 weeks notice',
            expectedSalary: 120000,
            preferredLocation: 'New York'
          }
        }
      })
    ]);

    console.log(`✅ Created ${candidates.length} candidates`);

    // 4. Create some example evaluation data
    console.log('📊 Creating example evaluation data...');
    
    // Create expertise groups and skills
    const expertiseGroups = await Promise.all([
      prisma.expertiseGroup.create({
        data: {
          name: 'Technical Skills',
          description: 'Core technical competencies',
          color: '#3B82F6',
          isActive: true,
          sortOrder: 1
        }
      }),
      prisma.expertiseGroup.create({
        data: {
          name: 'Product Management',
          description: 'Product management competencies',
          color: '#10B981',
          isActive: true,
          sortOrder: 2
        }
      })
    ]);

    // Create expertise skills
    const expertiseSkills = await Promise.all([
      prisma.expertiseSkill.create({
        data: {
          name: 'React Development',
          description: 'React.js development skills',
          maxScore: 100,
          skillType: 'hard_skill',
          groupId: expertiseGroups[0].id,
          isActive: true,
          sortOrder: 1
        }
      }),
      prisma.expertiseSkill.create({
        data: {
          name: 'Node.js Backend',
          description: 'Node.js backend development',
          maxScore: 100,
          skillType: 'hard_skill',
          groupId: expertiseGroups[0].id,
          isActive: true,
          sortOrder: 2
        }
      }),
      prisma.expertiseSkill.create({
        data: {
          name: 'Product Strategy',
          description: 'Strategic product planning',
          maxScore: 100,
          skillType: 'hard_skill',
          groupId: expertiseGroups[1].id,
          isActive: true,
          sortOrder: 1
        }
      })
    ]);

    // Create personality groups and traits
    const personalityGroups = await Promise.all([
      prisma.personalityGroup.create({
        data: {
          name: 'Communication',
          description: 'Communication and interpersonal skills',
          color: '#8B5CF6',
          isActive: true,
          sortOrder: 1
        }
      }),
      prisma.personalityGroup.create({
        data: {
          name: 'Leadership',
          description: 'Leadership and management skills',
          color: '#F59E0B',
          isActive: true,
          sortOrder: 2
        }
      })
    ]);

    const personalityTraits = await Promise.all([
      prisma.personalityTrait.create({
        data: {
          name: 'Communication Skills',
          description: 'Ability to communicate effectively',
          groupId: personalityGroups[0].id,
          isActive: true,
          sortOrder: 1
        }
      }),
      prisma.personalityTrait.create({
        data: {
          name: 'Team Collaboration',
          description: 'Ability to work well in teams',
          groupId: personalityGroups[0].id,
          isActive: true,
          sortOrder: 2
        }
      }),
      prisma.personalityTrait.create({
        data: {
          name: 'Leadership Potential',
          description: 'Demonstrated leadership abilities',
          groupId: personalityGroups[1].id,
          isActive: true,
          sortOrder: 1
        }
      })
    ]);

    console.log(`✅ Created ${expertiseGroups.length} expertise groups, ${expertiseSkills.length} skills`);
    console.log(`✅ Created ${personalityGroups.length} personality groups, ${personalityTraits.length} traits`);

    // 5. Assign evaluation criteria to positions
    console.log('🔗 Assigning evaluation criteria to positions...');
    
    // Assign expertise skills to software engineer position
    await prisma.positionExpertiseSkill.createMany({
      data: [
        {
          positionId: positions[0].id,
          skillId: expertiseSkills[0].id,
          isRequired: true,
          weight: 1.0,
          minScore: 70
        },
        {
          positionId: positions[0].id,
          skillId: expertiseSkills[1].id,
          isRequired: true,
          weight: 1.0,
          minScore: 60
        }
      ]
    });

    // Assign expertise skills to product manager position
    await prisma.positionExpertiseSkill.createMany({
      data: [
        {
          positionId: positions[1].id,
          skillId: expertiseSkills[2].id,
          isRequired: true,
          weight: 1.0,
          minScore: 80
        }
      ]
    });

    // Assign personality traits to all positions
    await prisma.positionPersonalityTrait.createMany({
      data: [
        {
          positionId: positions[0].id,
          traitId: personalityTraits[0].id,
          isRequired: true,
          weight: 0.8
        },
        {
          positionId: positions[0].id,
          traitId: personalityTraits[1].id,
          isRequired: true,
          weight: 1.0
        },
        {
          positionId: positions[1].id,
          traitId: personalityTraits[0].id,
          isRequired: true,
          weight: 1.0
        },
        {
          positionId: positions[1].id,
          traitId: personalityTraits[2].id,
          isRequired: true,
          weight: 1.0
        },
        {
          positionId: positions[2].id,
          traitId: personalityTraits[0].id,
          isRequired: true,
          weight: 1.0
        },
        {
          positionId: positions[2].id,
          traitId: personalityTraits[1].id,
          isRequired: true,
          weight: 0.9
        }
      ]
    });

    console.log('✅ Assigned evaluation criteria to positions');

    console.log('\n🎉 Example data creation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${positions.length} positions created`);
    console.log(`   • ${candidates.length} candidates created`);
    console.log(`   • ${expertiseGroups.length} expertise groups created`);
    console.log(`   • ${expertiseSkills.length} expertise skills created`);
    console.log(`   • ${personalityGroups.length} personality groups created`);
    console.log(`   • ${personalityTraits.length} personality traits created`);
    console.log(`   • Evaluation criteria assigned to positions`);
    
    console.log('\n🌐 You can now:');
    console.log('   • View positions at http://localhost:8021/positions');
    console.log('   • View candidates at http://localhost:8021/candidates');
    console.log('   • Configure evaluation settings at http://localhost:8021/settings/evaluation-configuration');
    console.log('   • Test the evaluation system with the created data');

  } catch (error) {
    console.error('❌ Error creating example data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createExampleData()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
