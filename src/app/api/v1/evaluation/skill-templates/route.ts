import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/v1/evaluation/skill-templates - Get all skill templates
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.skillTemplate.findMany({
      include: {
        templateGroups: {
          include: {
            group: true
          }
        },
        templateSkills: {
          include: {
            skill: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching skill templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skill templates' },
      { status: 500 }
    );
  }
}

// POST /api/v1/evaluation/skill-templates - Create new skill template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, groupIds = [], skillIds = [] } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    const template = await prisma.skillTemplate.create({
      data: {
        name,
        description,
        templateGroups: {
          create: groupIds.map((groupId: string) => ({
            groupId
          }))
        },
        templateSkills: {
          create: skillIds.map((skillId: string) => ({
            skillId
          }))
        }
      },
      include: {
        templateGroups: {
          include: {
            group: true
          }
        },
        templateSkills: {
          include: {
            skill: true
          }
        }
      }
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating skill template:', error);
    return NextResponse.json(
      { error: 'Failed to create skill template' },
      { status: 500 }
    );
  }
}
