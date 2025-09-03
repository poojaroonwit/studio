import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, hasAnyPermission } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';


// GET /api/user-preferences/[userId] - Get user preferences for a specific user (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or accessing their own preferences
    const { userId } = await params;
    const isOwnPreferences = session.user.id === userId;
    
    // Allow access if user has USERS_EDIT permission or is accessing their own preferences
    if (!hasAnyPermission(session.user, ['USERS_EDIT', 'USERS_VIEW']) && !isOwnPreferences) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions or can only access own preferences' }, { status: 403 });
    }

    // Get all user preferences from database
    const preferences = await prisma.userUIDisplayPreference.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    // Transform the flat structure to nested preferences
    const transformedPreferences: {
      taskBoard: {
        searchTerm: string;
        filterPriority: string;
        filterAssignee: string;
        selectedStages: any[];
        viewMode: 'kanban' | 'table';
      };
      positions: {
        searchTerm: string;
        departmentFilter: string;
        statusFilter: string;
        selectedRecruiterId: string | null;
        pageSize: number;
        sortBy: string;
        sortOrder: 'asc' | 'desc';
      };
      appearance: {
        personalColor: string;
      };
      sidebar: {
        showAssignedPositions: boolean;
      };
    } = {
      taskBoard: {
        searchTerm: '',
        filterPriority: 'all',
        filterAssignee: 'all',
        selectedStages: [],
        viewMode: 'kanban',
      },
      positions: {
        searchTerm: '',
        departmentFilter: 'all',
        statusFilter: 'all',
        selectedRecruiterId: null,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      appearance: {
        personalColor: '#3B82F6',
      },
      sidebar: {
        showAssignedPositions: false,
      }
    };

    // Map database records to preferences structure
    preferences.forEach((pref: any) => {
      const value = pref.uiPreference;
      
      if (pref.modelType === 'taskBoard') {
        switch (pref.attributeKey) {
          case 'searchTerm':
            transformedPreferences.taskBoard.searchTerm = value;
            break;
          case 'filterPriority':
            transformedPreferences.taskBoard.filterPriority = value;
            break;
          case 'filterAssignee':
            transformedPreferences.taskBoard.filterAssignee = value;
            break;
          case 'selectedStages':
            transformedPreferences.taskBoard.selectedStages = value ? JSON.parse(value) : [];
            break;
          case 'viewMode':
            transformedPreferences.taskBoard.viewMode = value as 'kanban' | 'table';
            break;
        }
      } else if (pref.modelType === 'positions') {
        switch (pref.attributeKey) {
          case 'searchTerm':
            transformedPreferences.positions.searchTerm = value;
            break;
          case 'departmentFilter':
            transformedPreferences.positions.departmentFilter = value;
            break;
          case 'statusFilter':
            transformedPreferences.positions.statusFilter = value;
            break;
          case 'selectedRecruiterId':
            transformedPreferences.positions.selectedRecruiterId = value === 'null' ? null : value;
            break;
          case 'pageSize':
            transformedPreferences.positions.pageSize = parseInt(value) || 20;
            break;
          case 'sortBy':
            transformedPreferences.positions.sortBy = value;
            break;
          case 'sortOrder':
            transformedPreferences.positions.sortOrder = value as 'asc' | 'desc';
            break;
        }
      } else if (pref.modelType === 'appearance') {
        switch (pref.attributeKey) {
          case 'personalColor':
            transformedPreferences.appearance.personalColor = value;
            break;
        }
      } else if (pref.modelType === 'sidebar') {
        switch (pref.attributeKey) {
          case 'showAssignedPositions':
            transformedPreferences.sidebar.showAssignedPositions = value === 'true';
            break;
        }
      }
    });

    return NextResponse.json(transformedPreferences);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user preferences' },
      { status: 500 }
    );
  }
}

// POST /api/user-preferences/[userId] - Update user preferences for a specific user (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or updating their own preferences
    const { userId } = await params;
    const isOwnPreferences = session.user.id === userId;
    
    // Allow access if user has USERS_EDIT permission or is updating their own preferences
    if (!hasAnyPermission(session.user, ['USERS_EDIT']) && !isOwnPreferences) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions or can only update own preferences' }, { status: 403 });
    }
    const body = await request.json();
    const { taskBoard, positions, appearance } = body;

    // Process task board preferences
    if (taskBoard) {
      const taskBoardPromises = Object.entries(taskBoard).map(async ([key, value]) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        return prisma.userUIDisplayPreference.upsert({
          where: {
            userId_modelType_attributeKey: {
              userId,
              modelType: 'taskBoard',
              attributeKey: key,
            }
          },
          update: {
            uiPreference: stringValue,
            updatedAt: new Date(),
          },
          create: {
            userId,
            modelType: 'taskBoard',
            attributeKey: key,
            uiPreference: stringValue,
          }
        });
      });
      await Promise.all(taskBoardPromises);
    }

    // Process positions preferences
    if (positions) {
      const positionsPromises = Object.entries(positions).map(async ([key, value]) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        return prisma.userUIDisplayPreference.upsert({
          where: {
            userId_modelType_attributeKey: {
              userId,
              modelType: 'positions',
              attributeKey: key,
            }
          },
          update: {
            uiPreference: stringValue,
            updatedAt: new Date(),
          },
          create: {
            userId,
            modelType: 'positions',
            attributeKey: key,
            uiPreference: stringValue,
          }
        });
      });
      await Promise.all(positionsPromises);
    }

    // Process appearance preferences
    if (appearance) {
      const appearancePromises = Object.entries(appearance).map(async ([key, value]) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        return prisma.userUIDisplayPreference.upsert({
          where: {
            userId_modelType_attributeKey: {
              userId,
              modelType: 'appearance',
              attributeKey: key,
            }
          },
          update: {
            uiPreference: stringValue,
            updatedAt: new Date(),
          },
          create: {
            userId,
            modelType: 'appearance',
            attributeKey: key,
            uiPreference: stringValue,
          }
        });
      });
      await Promise.all(appearancePromises);
    }

    // Process sidebar preferences
    if (body.sidebar) {
      const sidebarPromises = Object.entries(body.sidebar).map(async ([key, value]) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        return prisma.userUIDisplayPreference.upsert({
          where: {
            userId_modelType_attributeKey: {
              userId,
              modelType: 'sidebar',
              attributeKey: key,
            }
          },
          update: {
            uiPreference: stringValue,
            updatedAt: new Date(),
          },
          create: {
            userId,
            modelType: 'sidebar',
            attributeKey: key,
            uiPreference: stringValue,
          }
        });
      });
      await Promise.all(sidebarPromises);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
}
