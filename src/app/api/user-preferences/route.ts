import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';


// GET /api/user-preferences - Get user preferences
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all user preferences from database with timeout
    const dbStartTime = Date.now();
    const preferences = await Promise.race([
      prisma.userUIDisplayPreference.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        // Add select to only get the fields we need
        select: {
          modelType: true,
          attributeKey: true,
          uiPreference: true,
          createdAt: true
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 8000)
      )
    ]) as any[];
    const dbDuration = Date.now() - dbStartTime;
    // console.log(`User preferences DB query took ${dbDuration}ms for user ${userId}, found ${preferences.length} preferences`);

    // Transform the flat structure to nested preferences
    const transformedPreferences: {
      taskBoard: {
        searchTerm: string;
        filterPriority: string;
        filterAssignee: string;
        selectedStages: any[];
        viewMode: 'kanban' | 'table';
        cardWidth: 'narrow' | 'medium' | 'wide' | 'custom';
        customCardWidth: number;
        visibleCardFields: string[];
        showAvatar: boolean;
        showName: boolean;
        showEmail: boolean;
        showDescription: boolean;
        showFitScore: boolean;
        showAssignee: boolean;
        showPriority: boolean;
        showDueDate: boolean;
        showTags: boolean;
        showSkills: boolean;
        showJobApplied: boolean;
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
        themePreference: 'light' | 'dark' | 'system';
      };
      sidebar: {
        showAssignedPositions: boolean;
      };
      candidates: {
        showCandidateColumn: boolean;
        showAppliedJobColumn: boolean;
        showJobMatchesColumn: boolean;
        showFitScoreColumn: boolean;
        showRecruiterColumn: boolean;
        showSourceColumn: boolean;
        showStatusColumn: boolean;
        showAppliedDateColumn: boolean;
        showLastUpdateColumn: boolean;
        showCreatedDateColumn: boolean;
        columnOrder: string[];
        showFilters: boolean;
        showHorizontalFitScoreFilters: boolean;
        fitScoreType: 'applied' | 'matching';
        fitScoreFilterMode: 'single' | 'multi';
        rowHeight: 'compact' | 'normal' | 'comfortable';
        showPinSection: boolean;
        pageSize: number;
        sortColumn: string;
        sortDirection: 'asc' | 'desc' | null;
      };
    } = {
      taskBoard: {
        searchTerm: '',
        filterPriority: 'all',
        filterAssignee: 'all',
        selectedStages: [],
        viewMode: 'kanban',
        // Card customization defaults
        cardWidth: 'medium',
        customCardWidth: 256,
        visibleCardFields: ['name', 'email', 'fitScore'],
        showAvatar: true,
        showName: true,
        showEmail: true,
        showDescription: true,
        showFitScore: true,
        showAssignee: false,
        showPriority: false,
        showDueDate: false,
        showTags: false,
        showSkills: false,
        showJobApplied: false,
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
        themePreference: 'system',
      },
      sidebar: {
        showAssignedPositions: true,
      },
      candidates: {
        showCandidateColumn: true,
        showAppliedJobColumn: true,
        showJobMatchesColumn: true,
        showFitScoreColumn: true,
        showRecruiterColumn: true,
        showSourceColumn: true,
        showStatusColumn: true,
        showAppliedDateColumn: true,
        showLastUpdateColumn: true,
        showCreatedDateColumn: false,
        columnOrder: [
          'candidate',
          'appliedJob',
          'jobMatches',
          'fitScore',
          'recruiter',
          'source',
          'status',
          'appliedDate',
          'lastUpdate',
          'createdAt'
        ],
        showFilters: true,
        showHorizontalFitScoreFilters: true,
        fitScoreType: 'applied',
        fitScoreFilterMode: 'single',
        rowHeight: 'normal',
        showPinSection: true,
        pageSize: 20,
        sortColumn: 'applicationDate',
        sortDirection: 'desc',
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
          // Card customization fields
          case 'cardWidth':
            transformedPreferences.taskBoard.cardWidth = value as 'narrow' | 'medium' | 'wide' | 'custom';
            break;
          case 'customCardWidth':
            transformedPreferences.taskBoard.customCardWidth = parseInt(value) || 256;
            break;
          case 'visibleCardFields':
            transformedPreferences.taskBoard.visibleCardFields = value ? JSON.parse(value) : ['name', 'email', 'fitScore'];
            break;
          case 'showAvatar':
            transformedPreferences.taskBoard.showAvatar = value === 'true';
            break;
          case 'showName':
            transformedPreferences.taskBoard.showName = value === 'true';
            break;
          case 'showEmail':
            transformedPreferences.taskBoard.showEmail = value === 'true';
            break;
          case 'showDescription':
            transformedPreferences.taskBoard.showDescription = value === 'true';
            break;
          case 'showFitScore':
            transformedPreferences.taskBoard.showFitScore = value === 'true';
            break;
          case 'showAssignee':
            transformedPreferences.taskBoard.showAssignee = value === 'true';
            break;
          case 'showPriority':
            transformedPreferences.taskBoard.showPriority = value === 'true';
            break;
          case 'showDueDate':
            transformedPreferences.taskBoard.showDueDate = value === 'true';
            break;
          case 'showTags':
            transformedPreferences.taskBoard.showTags = value === 'true';
            break;
          case 'showSkills':
            transformedPreferences.taskBoard.showSkills = value === 'true';
            break;
          case 'showJobApplied':
            transformedPreferences.taskBoard.showJobApplied = value === 'true';
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
            case 'themePreference':
              transformedPreferences.appearance.themePreference = value as 'light' | 'dark' | 'system';
              break;
          }
        } else if (pref.modelType === 'candidates') {
          switch (pref.attributeKey) {
            case 'showCandidateColumn':
              transformedPreferences.candidates.showCandidateColumn = value === 'true';
              break;
            case 'showAppliedJobColumn':
              transformedPreferences.candidates.showAppliedJobColumn = value === 'true';
              break;
            case 'showJobMatchesColumn':
              transformedPreferences.candidates.showJobMatchesColumn = value === 'true';
              break;
            case 'showFitScoreColumn':
              transformedPreferences.candidates.showFitScoreColumn = value === 'true';
              break;
            case 'showRecruiterColumn':
              transformedPreferences.candidates.showRecruiterColumn = value === 'true';
              break;
            case 'showSourceColumn':
              transformedPreferences.candidates.showSourceColumn = value === 'true';
              break;
            case 'showStatusColumn':
              transformedPreferences.candidates.showStatusColumn = value === 'true';
              break;
            case 'showAppliedDateColumn':
              transformedPreferences.candidates.showAppliedDateColumn = value === 'true';
              break;
            case 'showLastUpdateColumn':
              transformedPreferences.candidates.showLastUpdateColumn = value === 'true';
              break;
            case 'showCreatedDateColumn':
              transformedPreferences.candidates.showCreatedDateColumn = value === 'true';
              break;
            case 'showFilters':
              transformedPreferences.candidates.showFilters = value === 'true';
              break;
            case 'showHorizontalFitScoreFilters':
              transformedPreferences.candidates.showHorizontalFitScoreFilters = value === 'true';
              break;
            case 'fitScoreType':
              transformedPreferences.candidates.fitScoreType = value as 'applied' | 'matching';
              break;
            case 'fitScoreFilterMode':
              transformedPreferences.candidates.fitScoreFilterMode = value as 'single' | 'multi';
              break;
            case 'rowHeight':
              transformedPreferences.candidates.rowHeight = value as 'compact' | 'normal' | 'comfortable';
              break;
            case 'columnOrder':
              transformedPreferences.candidates.columnOrder = value ? JSON.parse(value) : [
                'candidate',
                'appliedJob',
                'jobMatches',
                'fitScore',
                'recruiter',
                'source',
                'status',
                'appliedDate',
                'lastUpdate'
              ];
              break;
            case 'showPinSection':
              transformedPreferences.candidates.showPinSection = value === 'true';
              break;
            case 'pageSize':
              transformedPreferences.candidates.pageSize = parseInt(value) || 20;
              break;
            case 'sortColumn':
              transformedPreferences.candidates.sortColumn = value || 'applicationDate';
              break;
            case 'sortDirection':
              transformedPreferences.candidates.sortDirection = value === 'null' ? null : value as 'asc' | 'desc' | null;
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

// POST /api/user-preferences - Update user preferences
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { modelType, updates } = body;

    if (!modelType || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: modelType and updates' },
        { status: 400 }
      );
    }

    // Validate modelType
    if (!['taskBoard', 'positions', 'appearance', 'candidates', 'sidebar'].includes(modelType)) {
      return NextResponse.json(
        { error: 'Invalid modelType. Must be "taskBoard", "positions", "appearance", "candidates", or "sidebar"' },
        { status: 400 }
      );
    }

    // Process updates
    const updatePromises = Object.entries(updates).map(async ([key, value]) => {
      const stringValue = value === null ? 'null' : (typeof value === 'object' ? JSON.stringify(value) : String(value));
      
      // Use upsert to create or update the preference
      return prisma.userUIDisplayPreference.upsert({
        where: {
          userId_modelType_attributeKey: {
            userId,
            modelType,
            attributeKey: key,
          }
        },
        update: {
          uiPreference: stringValue,
          updatedAt: new Date(),
        },
        create: {
          userId,
          modelType,
          attributeKey: key,
          uiPreference: stringValue,
        }
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
}

// DELETE /api/user-preferences - Reset user preferences
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const modelType = searchParams.get('modelType');

    if (modelType && !['taskBoard', 'positions', 'appearance', 'candidates', 'sidebar'].includes(modelType)) {
      return NextResponse.json(
        { error: 'Invalid modelType. Must be "taskBoard", "positions", "appearance", "candidates", or "sidebar"' },
        { status: 400 }
      );
    }

    // Delete preferences
    const whereClause = modelType 
      ? { userId, modelType }
      : { userId };

    await prisma.userUIDisplayPreference.deleteMany({
      where: whereClause
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to reset user preferences' },
      { status: 500 }
    );
  }
}
