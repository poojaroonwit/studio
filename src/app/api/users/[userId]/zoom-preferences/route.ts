import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET user's zoom preferences
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can only access their own preferences
    if (session.user.id !== params.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get zoom preferences from SystemPreference table
    const preferences = await prisma.systemPreference.findMany({
      where: {
        userId: params.userId,
        key: {
          startsWith: 'zoom_'
        }
      }
    });

    // Convert to object format
    const zoomPreferences = {
      zoomLevel: 1.0,
      autoZoom: false,
      rememberZoom: true,
      mobileZoom: 0.9,
    };

    preferences.forEach(pref => {
      switch (pref.key) {
        case 'zoom_level':
          zoomPreferences.zoomLevel = parseFloat(pref.value || '1.0');
          break;
        case 'zoom_auto':
          zoomPreferences.autoZoom = pref.value === 'true';
          break;
        case 'zoom_remember':
          zoomPreferences.rememberZoom = pref.value === 'true';
          break;
        case 'zoom_mobile':
          zoomPreferences.mobileZoom = parseFloat(pref.value || '0.9');
          break;
      }
    });

    return NextResponse.json(zoomPreferences);
  } catch (error) {
    console.error('Error fetching zoom preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update user's zoom preferences
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can only update their own preferences
    if (session.user.id !== params.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { zoomLevel, autoZoom, rememberZoom, mobileZoom } = body;

    // Validate input
    if (typeof zoomLevel !== 'number' || zoomLevel < 0.5 || zoomLevel > 1.5) {
      return NextResponse.json(
        { error: 'Invalid zoom level' },
        { status: 400 }
      );
    }

    if (typeof mobileZoom !== 'number' || mobileZoom < 0.7 || mobileZoom > 1.0) {
      return NextResponse.json(
        { error: 'Invalid mobile zoom level' },
        { status: 400 }
      );
    }

    // Update preferences using upsert
    const preferences = [
      { key: 'zoom_level', value: zoomLevel.toString() },
      { key: 'zoom_auto', value: autoZoom.toString() },
      { key: 'zoom_remember', value: rememberZoom.toString() },
      { key: 'zoom_mobile', value: mobileZoom.toString() },
    ];

    await Promise.all(
      preferences.map(pref =>
        prisma.systemPreference.upsert({
          where: {
            userId_key: {
              userId: params.userId,
              key: pref.key,
            },
          },
          update: {
            value: pref.value,
            updatedAt: new Date(),
          },
          create: {
            userId: params.userId,
            key: pref.key,
            value: pref.value,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating zoom preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
