
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        const { url, userAgent } = data;

        await prisma.userActivityLog.create({
            data: {
                userId: session.user.id,
                action: 'SCREENSHOT_ATTEMPT',
                details: {
                    url,
                    userAgent,
                    timestamp: new Date().toISOString()
                },
                ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                userAgent: userAgent || req.headers.get('user-agent') || 'unknown',
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error logging screenshot attempt:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
