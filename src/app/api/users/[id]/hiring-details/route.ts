
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Fetch the User to get their details
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Prepare search criteria
        const searchCriteria = {
            employeeId: user.employeeId,
            emails: [user.email],
            phones: [] as string[],
        };

        // Extract additional emails and phones from contactInfo if available
        if (user.contactInfo && typeof user.contactInfo === 'object') {
            const contactInfo = user.contactInfo as any;

            if (Array.isArray(contactInfo.otherEmails)) {
                searchCriteria.emails.push(...contactInfo.otherEmails);
            }

            if (contactInfo.mobilePhone) searchCriteria.phones.push(contactInfo.mobilePhone);
            if (contactInfo.businessPhone) searchCriteria.phones.push(contactInfo.businessPhone);
        }

        if (user.phoneNumber) {
            searchCriteria.phones.push(user.phoneNumber);
        }

        // Filter out potential duplicates and nulls
        searchCriteria.emails = [...new Set(searchCriteria.emails.filter(Boolean))];
        searchCriteria.phones = [...new Set(searchCriteria.phones.filter(Boolean))];

        // 3. Find associated Headcount
        let headcount = null;
        if (searchCriteria.employeeId) {
            headcount = await prisma.headcount.findFirst({
                where: {
                    employeeId: searchCriteria.employeeId,
                },
                include: {
                    position: {
                        select: {
                            id: true,
                            title: true,
                            department: true,
                        }
                    }
                }
            });
        }

        // 4. Find associated Candidate
        let candidate = null;

        // Build OR conditions for candidate search
        const candidateOrConditions = [];

        if (searchCriteria.emails.length > 0) {
            candidateOrConditions.push({
                email: { in: searchCriteria.emails, mode: 'insensitive' as const }
            });
        }

        if (searchCriteria.phones.length > 0) {
            candidateOrConditions.push({
                phone: { in: searchCriteria.phones }
            });
        }

        if (candidateOrConditions.length > 0) {
            candidate = await prisma.candidate.findFirst({
                where: {
                    OR: candidateOrConditions
                },
                include: {
                    position: {
                        select: {
                            id: true,
                            title: true,
                            department: true,
                        }
                    },
                    recruitmentStage: true,
                },
                orderBy: {
                    updatedAt: 'desc' // Get the most recent one if multiple match
                }
            });
        }

        return NextResponse.json({
            headcount,
            candidate,
            matchCriteria: {
                matchedByEmployeeId: !!headcount,
                matchedByEmail: candidate ? searchCriteria.emails.includes(candidate.email) : false,
                matchedByPhone: candidate?.phone ? searchCriteria.phones.includes(candidate.phone) : false,
            }
        });

    } catch (error) {
        console.error('Error fetching hiring details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch hiring details' },
            { status: 500 }
        );
    }
}
