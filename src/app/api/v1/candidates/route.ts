import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    const { 
      firstName, 
      lastName, 
      email, 
      phone,
      positionId,
      status = 'Applied'
    } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    // Check if candidate with same email already exists
    const existingCandidate = await prisma.candidate.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (existingCandidate) {
      return NextResponse.json(
        { error: 'Candidate with this email already exists' },
        { status: 409 }
      );
    }

    // Create candidate with basic information
    const candidate = await prisma.candidate.create({
      data: {
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        positionId: positionId || null,
        recruiterId: session.user.id,
        status: status,
      },
      include: {
        position: {
          select: {
            id: true,
            title: true,
            department: true
          }
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        positionId: candidate.positionId,
        recruiterId: candidate.recruiterId,
        fitScore: candidate.fitScore,
        status: candidate.status,
        applicationDate: candidate.applicationDate,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        position: candidate.position,
        recruiter: candidate.recruiter
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating candidate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    // Get candidates with pagination
    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          position: {
            select: {
              id: true,
              title: true,
              department: true
            }
          },
          recruiter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.candidate.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: candidates.map(candidate => ({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        positionId: candidate.positionId,
        recruiterId: candidate.recruiterId,
        fitScore: candidate.fitScore,
        status: candidate.status,
        applicationDate: candidate.applicationDate,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        position: candidate.position,
        recruiter: candidate.recruiter
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  return new Response(null, { status: 200, headers });
} 