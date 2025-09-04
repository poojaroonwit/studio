import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';
import { broadcastPositionUpdate, broadcastPositionListUpdated, broadcastPositionStatisticsUpdated } from '@/lib/simple-broadcaster';
import { v4 as uuidv4 } from 'uuid';
import { getRecruitmentStageByName } from './recruitmentStageUtils';

/**
 * Safely update a Position using Prisma with fallback to raw SQL if primary key error occurs
 * This handles the "attributes of key 'public."Position"."Position_pkey"' are missing in result set" error
 */
async function safeUpdatePosition(positionId: string, updateData: { isOpen: boolean }) {
  try {
    return await prisma.position.update({
      where: { id: positionId },
      data: updateData,
      select: {
        id: true,
        title: true,
        department: true,
        isOpen: true,
        customAttributes: true,
        updatedAt: true,
      },
    });
  } catch (prismaError: any) {
    // If Prisma fails with primary key error, try alternative approach
    if (prismaError.message && prismaError.message.includes('attributes of key')) {
      console.warn('Prisma primary key error detected, using alternative update approach');
      // Use raw SQL as fallback
      const { getPool } = await import('@/lib/db');
      const client = await getPool().connect();
      try {
        const result = await client.query(
          'UPDATE "Position" SET "isOpen" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING id, title, department, "isOpen", "customAttributes", "updatedAt"',
          [updateData.isOpen, positionId]
        );
        return result.rows[0];
      } finally {
        client.release();
      }
    } else {
      throw prismaError;
    }
  }
}

/**
 * Check if all headcounts for a position are filled
 * @param positionId - The position ID to check
 * @returns Object with isFilled boolean and headcount details
 */
export async function checkPositionHeadcountStatus(positionId: string) {
  try {
    // Get all headcounts for the position
    const headcounts = await prisma.headcount.findMany({
      where: { positionId },
      select: {
        id: true,
        status: true,
        candidateId: true,
      },
    });

    if (headcounts.length === 0) {
      return {
        isFilled: false,
        totalHeadcounts: 0,
        filledHeadcounts: 0,
        vacantHeadcounts: 0,
        hasHeadcounts: false,
      };
    }

    // A headcount is only considered filled if it has status 'filled' AND has a candidate assigned
    const filledHeadcounts = headcounts.filter(h => h.status === 'filled' && h.candidateId !== null).length;
    const vacantHeadcounts = headcounts.filter(h => h.status === 'vacant' || h.candidateId === null).length;
    const isFilled = vacantHeadcounts === 0 && filledHeadcounts > 0;

    // Position headcount status logged

    return {
      isFilled,
      totalHeadcounts: headcounts.length,
      filledHeadcounts,
      vacantHeadcounts,
      hasHeadcounts: true,
    };
  } catch (error) {
    console.error('Error checking position headcount status:', error);
    throw error;
  }
}

/**
 * Automatically close a position if all headcounts are filled
 * @param positionId - The position ID to potentially close
 * @param actingUserId - The user ID performing the action (for audit logging)
 * @param actingUserName - The user name performing the action (for audit logging)
 * @returns Object with success status and details
 */
export async function autoClosePositionIfHeadcountFilled(
  positionId: string,
  actingUserId: string,
  actingUserName: string
) {
  try {
    // Check current headcount status
    const headcountStatus = await checkPositionHeadcountStatus(positionId);
    
    if (!headcountStatus.hasHeadcounts) {
      return {
        success: false,
        message: 'Position has no headcounts defined',
        action: 'none',
      };
    }

    if (!headcountStatus.isFilled) {
      return {
        success: false,
        message: 'Position still has vacant headcounts',
        action: 'none',
        headcountStatus,
      };
    }

    // Get current position details
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: {
        id: true,
        title: true,
        isOpen: true,
        department: true,
        customAttributes: true,
      },
    });

    if (!position) {
      console.error(`Position ${positionId} not found`);
      return {
        success: false,
        message: 'Position not found',
        action: 'none',
      };
    }

    // If position is already closed, no action needed
    if (!position.isOpen) {
      return {
        success: true,
        message: 'Position is already closed',
        action: 'none',
        headcountStatus,
      };
    }

    // Close the position - using a more robust approach to ensure primary key is included
    let updatedPosition;
    try {
      updatedPosition = await prisma.position.update({
        where: { id: positionId },
        data: { isOpen: false },
        select: {
          id: true,
          title: true,
          department: true,
          isOpen: true,
          customAttributes: true,
          updatedAt: true,
        },
      });
    } catch (prismaError: any) {
      // If Prisma fails with primary key error, try alternative approach
      if (prismaError.message && prismaError.message.includes('attributes of key')) {
        console.warn('Prisma primary key error detected, using alternative update approach');
        // Use raw SQL as fallback
        const { getPool } = await import('@/lib/db');
        const client = await getPool().connect();
        try {
          const result = await client.query(
            'UPDATE "Position" SET "isOpen" = false, "updatedAt" = NOW() WHERE id = $1 RETURNING id, title, department, "isOpen", "customAttributes", "updatedAt"',
            [positionId]
          );
          updatedPosition = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        throw prismaError;
      }
    }

    // console.log(`Position ${positionId} successfully closed`);

    // Log the automatic closure
    await logAudit(
      'AUDIT',
      `Position '${position.title}' automatically closed due to all headcounts being filled. Total headcounts: ${headcountStatus.totalHeadcounts}, Filled: ${headcountStatus.filledHeadcounts}`,
      'SYSTEM:AutoClosePosition',
      actingUserId,
      { 
        positionId, 
        headcountStatus,
        previousStatus: 'open',
        newStatus: 'closed'
      }
    );

    // Prepare position data for webhook and broadcast
    const positionWithCustomAttrs = {
      ...updatedPosition,
      custom_attributes: updatedPosition.customAttributes || {},
    };

    // Dispatch webhook for position update
    // try {
    //   await dispatchWebhooks.positionUpdated(positionWithCustomAttrs);
    // } catch (webhookError) {
    //   console.error('Failed to dispatch position update webhook:', webhookError);
    // }

    // Broadcast position update to SSE clients
    broadcastPositionUpdate(positionWithCustomAttrs, actingUserId);

    // Broadcast position list update to SSE clients
    broadcastPositionListUpdated();

    // Broadcast statistics update to SSE clients
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "isOpen" = TRUE THEN 1 END) as open,
        COUNT(CASE WHEN "isOpen" = FALSE THEN 1 END) as closed
      FROM "Position"
    `;
    const { getPool } = await import('@/lib/db');
    const statsResult = await getPool().query(statsQuery);
    const stats = statsResult.rows[0];
    const statistics = { 
      total: parseInt(stats.total, 10), 
      open: parseInt(stats.open, 10), 
      closed: parseInt(stats.closed, 10) 
    };
    broadcastPositionStatisticsUpdated(statistics);

    return {
      success: true,
      message: 'Position automatically closed successfully',
      action: 'closed',
      headcountStatus,
      position: positionWithCustomAttrs,
    };

  } catch (error) {
    console.error('Error auto-closing position:', error);
    await logAudit(
      'ERROR',
      `Failed to auto-close position ${positionId}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'SYSTEM:AutoClosePosition',
      actingUserId,
      { positionId, error: error instanceof Error ? error.message : 'Unknown error' }
    );
    throw error;
  }
}

/**
 * Automatically reopen a position if headcount becomes available again
 * @param positionId - The position ID to potentially reopen
 * @param actingUserId - The user ID performing the action (for audit logging)
 * @param actingUserName - The user name performing the action (for audit logging)
 * @returns Object with success status and details
 */
export async function reopenPositionIfHeadcountAvailable(
  positionId: string,
  actingUserId: string,
  actingUserName: string
) {
  try {
    // Check current headcount status
    const headcountStatus = await checkPositionHeadcountStatus(positionId);
    
    if (!headcountStatus.hasHeadcounts) {
      return {
        success: false,
        message: 'Position has no headcounts defined',
        action: 'none',
      };
    }

    if (headcountStatus.isFilled) {
      return {
        success: false,
        message: 'Position still has all headcounts filled',
        action: 'none',
        headcountStatus,
      };
    }

    // Get current position details
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: {
        id: true,
        title: true,
        isOpen: true,
        department: true,
        customAttributes: true,
      },
    });

    if (!position) {
      console.error(`Position ${positionId} not found`);
      return {
        success: false,
        message: 'Position not found',
        action: 'none',
      };
    }

    // If position is already open, no action needed
    if (position.isOpen) {
      return {
        success: true,
        message: 'Position is already open',
        action: 'none',
        headcountStatus,
      };
    }

    // Reopen the position - using a more robust approach to ensure primary key is included
    let updatedPosition;
    try {
      updatedPosition = await prisma.position.update({
        where: { id: positionId },
        data: { isOpen: true },
        select: {
          id: true,
          title: true,
          department: true,
          isOpen: true,
          customAttributes: true,
          updatedAt: true,
        },
      });
    } catch (prismaError: any) {
      // If Prisma fails with primary key error, try alternative approach
      if (prismaError.message && prismaError.message.includes('attributes of key')) {
        console.warn('Prisma primary key error detected, using alternative update approach');
        // Use raw SQL as fallback
        const { getPool } = await import('@/lib/db');
        const client = await getPool().connect();
        try {
          const result = await client.query(
            'UPDATE "Position" SET "isOpen" = true, "updatedAt" = NOW() WHERE id = $1 RETURNING id, title, department, "isOpen", "customAttributes", "updatedAt"',
            [positionId]
          );
          updatedPosition = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        throw prismaError;
      }
    }

    // Log the automatic reopening
    await logAudit(
      'AUDIT',
      `Position '${position.title}' automatically reopened due to headcount becoming available. Total headcounts: ${headcountStatus.totalHeadcounts}, Vacant: ${headcountStatus.vacantHeadcounts}`,
      'SYSTEM:AutoReopenPosition',
      actingUserId,
      { 
        positionId, 
        headcountStatus,
        previousStatus: 'closed',
        newStatus: 'open'
      }
    );

    // Prepare position data for webhook and broadcast
    const positionWithCustomAttrs = {
      ...updatedPosition,
      custom_attributes: updatedPosition.customAttributes || {},
    };

    // Broadcast position update to SSE clients
    broadcastPositionUpdate(positionWithCustomAttrs, actingUserId);

    // Broadcast position list update to SSE clients
    broadcastPositionListUpdated();

    // Broadcast statistics update to SSE clients
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "isOpen" = TRUE THEN 1 END) as open,
        COUNT(CASE WHEN "isOpen" = FALSE THEN 1 END) as closed
      FROM "Position"
    `;
    const { getPool } = await import('@/lib/db');
    const statsResult = await getPool().query(statsQuery);
    const stats = statsResult.rows[0];
    const statistics = { 
      total: parseInt(stats.total, 10), 
      open: parseInt(stats.open, 10), 
      closed: parseInt(stats.closed, 10) 
    };
    broadcastPositionStatisticsUpdated(statistics);

    return {
      success: true,
      message: 'Position automatically reopened successfully',
      action: 'reopened',
      headcountStatus,
      position: positionWithCustomAttrs,
    };

  } catch (error) {
    console.error('Error auto-reopening position:', error);
    await logAudit(
      'ERROR',
      `Failed to auto-reopen position ${positionId}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'SYSTEM:AutoReopenPosition',
      actingUserId,
      { positionId, error: error instanceof Error ? error.message : 'Unknown error' }
    );
    throw error;
  }
}

/**
 * Check and auto-close positions that have all headcounts filled
 * This can be used as a background job or manual trigger
 * @param actingUserId - The user ID performing the action (for audit logging)
 * @param actingUserName - The user name performing the action (for audit logging)
 * @returns Array of results for each position processed
 */
export async function checkAndAutoCloseAllPositions(
  actingUserId: string,
  actingUserName: string
) {
  try {
    // Get all open positions with headcounts
    const openPositions = await prisma.position.findMany({
      where: { isOpen: true },
      select: { id: true, title: true },
    });

    const results = [];

    for (const position of openPositions) {
      try {
        const result = await autoClosePositionIfHeadcountFilled(
          position.id,
          actingUserId,
          actingUserName
        );
        results.push({
          positionId: position.id,
          positionTitle: position.title,
          ...result,
        });
        // console.log(`Position ${position.title} result:`, result);
      } catch (error) {
        console.error(`Error processing position ${position.title} (${position.id}):`, error);
        results.push({
          positionId: position.id,
          positionTitle: position.title,
          success: false,
          message: `Error processing position: ${error instanceof Error ? error.message : 'Unknown error'}`,
          action: 'error',
        });
      }
    }

    const closedCount = results.filter(r => r.action === 'closed').length;
    const errorCount = results.filter(r => r.action === 'error').length;
    const noActionCount = results.filter(r => r.action === 'none').length;

    // Auto-close check completed

    return results;
  } catch (error) {
    console.error('Error checking and auto-closing positions:', error);
    throw error;
  }
}

/**
 * Validate if a candidate can be set to "Hired" status based on headcount availability
 * @param candidateId - The candidate ID to validate
 * @param positionId - The position ID to check headcounts for
 * @returns Object with validation result and details
 */
export async function validateCandidateHiringStatus(candidateId: string, positionId: string) {
  try {
    // Check if position has any headcounts
    const headcounts = await prisma.headcount.findMany({
      where: { positionId },
      select: {
        id: true,
        status: true,
        candidateId: true,
      },
    });

    if (headcounts.length === 0) {
      return {
        canHire: false,
        reason: 'NO_HEADCOUNT',
        message: 'This position has no headcount defined. Cannot hire candidate without available headcount.',
        headcountStatus: {
          hasHeadcounts: false,
          totalHeadcounts: 0,
          vacantHeadcounts: 0,
          filledHeadcounts: 0,
        },
      };
    }

    // A headcount is only considered filled if it has status 'filled' AND has a candidate assigned
    const vacantHeadcounts = headcounts.filter(h => h.status === 'vacant' || h.candidateId === null);
    const filledHeadcounts = headcounts.filter(h => h.status === 'filled' && h.candidateId !== null);

    if (vacantHeadcounts.length === 0) {
      return {
        canHire: false,
        reason: 'NO_VACANT_HEADCOUNT',
        message: 'All headcounts for this position are already filled. Cannot hire candidate without available headcount.',
        headcountStatus: {
          hasHeadcounts: true,
          totalHeadcounts: headcounts.length,
          vacantHeadcounts: 0,
          filledHeadcounts: filledHeadcounts.length,
        },
      };
    }

    // Check if candidate is already assigned to a headcount
    const existingAssignment = headcounts.find(h => h.candidateId === candidateId);
    if (existingAssignment) {
      return {
        canHire: true,
        reason: 'ALREADY_ASSIGNED',
        message: 'Candidate is already assigned to a headcount.',
        headcountId: existingAssignment.id,
        headcountStatus: {
          hasHeadcounts: true,
          totalHeadcounts: headcounts.length,
          vacantHeadcounts: vacantHeadcounts.length,
          filledHeadcounts: filledHeadcounts.length,
        },
      };
    }

    return {
      canHire: true,
      reason: 'VACANT_HEADCOUNT_AVAILABLE',
      message: 'Vacant headcount available for hiring.',
      availableHeadcountId: vacantHeadcounts[0].id, // Return the first available headcount
      headcountStatus: {
        hasHeadcounts: true,
        totalHeadcounts: headcounts.length,
        vacantHeadcounts: vacantHeadcounts.length,
        filledHeadcounts: filledHeadcounts.length,
      },
    };
  } catch (error) {
    console.error('Error validating candidate hiring status:', error);
    throw error;
  }
}

/**
 * Check if unassigning a candidate from headcount would affect their status
 * @param headcountId - The headcount ID to check
 * @returns Object with warning details if applicable
 */
export async function checkHeadcountUnassignWarning(headcountId: string) {
  try {
    const headcount = await prisma.headcount.findUnique({
      where: { id: headcountId },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        position: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!headcount || !headcount.candidate) {
      return {
        hasWarning: false,
      };
    }

    // Check if candidate status is "Hired" and this is their only headcount assignment
    const hiredStageId = await getRecruitmentStageByName('Hired');
    if (hiredStageId && headcount.candidate.statusId === hiredStageId) {
      const candidateHeadcounts = await prisma.headcount.findMany({
        where: {
          candidateId: headcount.candidate.id,
          status: 'filled',
        },
      });

      if (candidateHeadcounts.length <= 1) {
        return {
          hasWarning: true,
          warningType: 'CANDIDATE_STATUS_WILL_CHANGE',
          message: `Unassigning this candidate will change their status from "Hired" to "Applied" since they will no longer have an active headcount assignment.`,
          candidate: headcount.candidate,
          position: headcount.position,
        };
      }
    }

    return {
      hasWarning: false,
    };
  } catch (error) {
    console.error('Error checking headcount unassign warning:', error);
    throw error;
  }
}

/**
 * Automatically assign candidate to headcount when status changes to "Hired"
 * @param candidateId - The candidate ID
 * @param positionId - The position ID
 * @param actingUserId - The user ID performing the action
 * @param actingUserName - The user name performing the action
 * @returns Object with assignment result
 */
export async function assignCandidateToHeadcount(
  candidateId: string,
  positionId: string,
  actingUserId: string,
  actingUserName: string
) {
  try {
    // Find vacant headcount for this position (status is vacant OR no candidate assigned)
    const vacantHeadcount = await prisma.headcount.findFirst({
      where: {
        positionId,
        OR: [
          { status: 'vacant' },
          { candidateId: null }
        ],
      },
      orderBy: {
        createdAt: 'asc', // Get the oldest vacant headcount
      },
    });

    if (!vacantHeadcount) {
      return {
        success: false,
        message: 'No vacant headcount available for this position',
      };
    }

    // Update the headcount to assign this candidate
    await prisma.headcount.update({
      where: { id: vacantHeadcount.id },
      data: {
        status: 'filled',
        candidateId: candidateId,
      },
    });

    // Log the assignment
    await logAudit('AUDIT', `Candidate assigned to headcount automatically when status changed to "Hired" by ${actingUserName}.`, 'Headcount:AutoAssign', actingUserId, {
      candidateId,
      headcountId: vacantHeadcount.id,
      positionId,
    });

    // Check if all headcounts are now filled and auto-close position if needed
    let autoCloseResult = null;
    try {
      autoCloseResult = await autoClosePositionIfHeadcountFilled(
        positionId,
        actingUserId,
        actingUserName
      );
    } catch (autoCloseError) {
      console.error('Error auto-closing position:', autoCloseError);
      // Don't fail the headcount assignment if auto-close fails
    }

    // Broadcast real-time updates for headcount changes
    try {
      const { broadcastPositionListUpdated, broadcastPositionStatisticsUpdated } = await import('@/lib/simple-broadcaster');
      
      // Broadcast position list update (includes headcount changes)
      broadcastPositionListUpdated();
      
      // Broadcast updated statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "isOpen" = TRUE THEN 1 END) as open,
          COUNT(CASE WHEN "isOpen" = FALSE THEN 1 END) as closed
        FROM "Position"
      `;
      const { getPool } = await import('@/lib/db');
      const statsResult = await getPool().query(statsQuery);
      const stats = statsResult.rows[0];
      const statistics = { 
        total: parseInt(stats.total, 10), 
        open: parseInt(stats.open, 10), 
        closed: parseInt(stats.closed, 10) 
      };
      broadcastPositionStatisticsUpdated(statistics);
    } catch (broadcastError) {
      console.error('Failed to broadcast real-time updates:', broadcastError);
      // Don't fail the request if broadcasting fails
    }

    return {
      success: true,
      message: 'Candidate automatically assigned to headcount',
      headcountId: vacantHeadcount.id,
      autoCloseResult,
    };
  } catch (error) {
    console.error('Error assigning candidate to headcount:', error);
    throw error;
  }
}

/**
 * Unassign candidate from headcount and update their status if needed
 * @param headcountId - The headcount ID
 * @param actingUserId - The user ID performing the action
 * @param actingUserName - The user name performing the action
 * @returns Object with unassign result
 */
export async function unassignCandidateFromHeadcount(
  headcountId: string,
  actingUserId: string,
  actingUserName: string
) {
  try {
    const headcount = await prisma.headcount.findUnique({
      where: { id: headcountId },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        position: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!headcount || !headcount.candidate) {
      return {
        success: false,
        message: 'Headcount not found or no candidate assigned',
      };
    }

    const candidateId = headcount.candidate.id;
    const hiredStageId = await getRecruitmentStageByName('Hired');
    const wasHired = hiredStageId && headcount.candidate.statusId === hiredStageId;

    // Update the headcount to remove candidate assignment
    await prisma.headcount.update({
      where: { id: headcountId },
      data: {
        status: 'vacant',
        candidateId: null,
      },
    });

    // Check if candidate has any other headcount assignments
    const remainingHeadcounts = await prisma.headcount.findMany({
      where: {
        candidateId,
        status: 'filled',
      },
    });

    let statusUpdateResult = null;
    // If candidate was "Hired" and has no other headcount assignments, change status to "Applied"
    if (wasHired && remainingHeadcounts.length === 0) {
      const appliedStageId = await getRecruitmentStageByName('Applied');
      if (appliedStageId) {
        await prisma.candidate.update({
          where: { id: candidateId },
          data: { recruitmentStage: { connect: { id: appliedStageId } } },
        });

      // Create transition record for status change
      const newTransitionId = uuidv4();
      await prisma.transitionRecord.create({
        data: {
          id: newTransitionId,
          candidate: { connect: { id: candidateId } },
          position: { connect: { id: headcount.position.id } },
          stage: appliedStageId,
          notes: 'Status automatically changed from "Hired" to "Applied" due to headcount unassignment',
          actingUser: { connect: { id: actingUserId } },
          date: new Date(),
        },
      });

      statusUpdateResult = {
        statusChanged: true,
        oldStatus: 'Hired',
        newStatus: 'Applied',
        transitionId: newTransitionId,
      };
      } else {
        console.error('Could not find Applied stage for status update');
      }
    }

    // Log the unassignment
    await logAudit('AUDIT', `Candidate unassigned from headcount by ${actingUserName}.`, 'Headcount:Unassign', actingUserId, {
      candidateId,
      headcountId,
      positionId: headcount.position.id,
      statusUpdateResult,
    });

    // Broadcast real-time updates for headcount changes
    try {
      const { broadcastPositionListUpdated, broadcastPositionStatisticsUpdated } = await import('@/lib/simple-broadcaster');
      
      // Broadcast position list update (includes headcount changes)
      broadcastPositionListUpdated();
      
      // Broadcast updated statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "isOpen" = TRUE THEN 1 END) as open,
          COUNT(CASE WHEN "isOpen" = FALSE THEN 1 END) as closed
        FROM "Position"
      `;
      const { getPool } = await import('@/lib/db');
      const statsResult = await getPool().query(statsQuery);
      const stats = statsResult.rows[0];
      const statistics = { 
        total: parseInt(stats.total, 10), 
        open: parseInt(stats.open, 10), 
        closed: parseInt(stats.closed, 10) 
      };
      broadcastPositionStatisticsUpdated(statistics);
    } catch (broadcastError) {
      console.error('Failed to broadcast real-time updates:', broadcastError);
      // Don't fail the request if broadcasting fails
    }

    return {
      success: true,
      message: 'Candidate unassigned from headcount successfully',
      statusUpdateResult,
    };
  } catch (error) {
    console.error('Error unassigning candidate from headcount:', error);
    throw error;
  }
}
