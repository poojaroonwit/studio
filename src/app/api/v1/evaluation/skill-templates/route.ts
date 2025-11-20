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
        },
        templatePersonalityGroups: {
          include: {
            group: true
          }
        },
        templatePersonalityTraits: {
          include: {
            trait: true
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
    const { 
      name, 
      description, 
      groupIds = [], 
      skillIds = [],
      personalityGroupIds = [],
      personalityTraitIds = []
    } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    // Validate arrays are actually arrays
    const validGroupIds = Array.isArray(groupIds) ? groupIds.filter((id: any) => typeof id === 'string' && id.trim() !== '') : [];
    const validSkillIds = Array.isArray(skillIds) ? skillIds.filter((id: any) => typeof id === 'string' && id.trim() !== '') : [];
    const validPersonalityGroupIds = Array.isArray(personalityGroupIds) ? personalityGroupIds.filter((id: any) => typeof id === 'string' && id.trim() !== '') : [];
    const validPersonalityTraitIds = Array.isArray(personalityTraitIds) ? personalityTraitIds.filter((id: any) => typeof id === 'string' && id.trim() !== '') : [];

    // Validate that referenced IDs exist (optional - can be removed if performance is a concern)
    if (validGroupIds.length > 0) {
      const existingGroups = await prisma.expertiseGroup.findMany({
        where: { id: { in: validGroupIds } },
        select: { id: true }
      });
      const existingGroupIds = existingGroups.map(g => g.id);
      const invalidGroupIds = validGroupIds.filter(id => !existingGroupIds.includes(id));
      if (invalidGroupIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid expertise group IDs: ${invalidGroupIds.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (validSkillIds.length > 0) {
      const existingSkills = await prisma.expertiseSkill.findMany({
        where: { id: { in: validSkillIds } },
        select: { id: true }
      });
      const existingSkillIds = existingSkills.map(s => s.id);
      const invalidSkillIds = validSkillIds.filter(id => !existingSkillIds.includes(id));
      if (invalidSkillIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid expertise skill IDs: ${invalidSkillIds.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (validPersonalityGroupIds.length > 0) {
      const existingPersonalityGroups = await prisma.personalityGroup.findMany({
        where: { id: { in: validPersonalityGroupIds } },
        select: { id: true }
      });
      const existingPersonalityGroupIds = existingPersonalityGroups.map(g => g.id);
      const invalidPersonalityGroupIds = validPersonalityGroupIds.filter(id => !existingPersonalityGroupIds.includes(id));
      if (invalidPersonalityGroupIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid personality group IDs: ${invalidPersonalityGroupIds.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (validPersonalityTraitIds.length > 0) {
      const existingPersonalityTraits = await prisma.personalityTrait.findMany({
        where: { id: { in: validPersonalityTraitIds } },
        select: { id: true }
      });
      const existingPersonalityTraitIds = existingPersonalityTraits.map(t => t.id);
      const invalidPersonalityTraitIds = validPersonalityTraitIds.filter(id => !existingPersonalityTraitIds.includes(id));
      if (invalidPersonalityTraitIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid personality trait IDs: ${invalidPersonalityTraitIds.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const template = await prisma.skillTemplate.create({
      data: {
        name: name.trim(),
        description: description || null,
        templateGroups: validGroupIds.length > 0 ? {
          create: validGroupIds.map((groupId: string) => ({
            groupId
          }))
        } : undefined,
        templateSkills: validSkillIds.length > 0 ? {
          create: validSkillIds.map((skillId: string) => ({
            skillId
          }))
        } : undefined,
        templatePersonalityGroups: validPersonalityGroupIds.length > 0 ? {
          create: validPersonalityGroupIds.map((groupId: string) => ({
            groupId
          }))
        } : undefined,
        templatePersonalityTraits: validPersonalityTraitIds.length > 0 ? {
          create: validPersonalityTraitIds.map((traitId: string) => ({
            traitId
          }))
        } : undefined
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
        },
        templatePersonalityGroups: {
          include: {
            group: true
          }
        },
        templatePersonalityTraits: {
          include: {
            trait: true
          }
        }
      }
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error('Error creating skill template:', error);
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference: One or more referenced IDs do not exist' },
        { status: 400 }
      );
    }

    // Return more detailed error message if available
    const errorMessage = error.message || 'Failed to create skill template';
    return NextResponse.json(
      { error: errorMessage },
      { status: error.status || 500 }
    );
  }
}
