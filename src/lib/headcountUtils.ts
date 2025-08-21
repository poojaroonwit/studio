import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';
import { broadcastPositionUpdate, broadcastPositionListUpdate, broadcastPositionStatisticsUpdate } from '@/lib/candidateSse';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';

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

    const filledHeadcounts = headcounts.filter(h => h.status === 'filled').length;
    const vacantHeadcounts = headcounts.filter(h => h.status === 'vacant').length;
    const isFilled = vacantHeadcounts === 0 && filledHeadcounts > 0;

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

    // Close the position
    const updatedPosition = await prisma.position.update({
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
    try {
      await dispatchWebhooks.positionUpdated(positionWithCustomAttrs);
    } catch (webhookError) {
      console.error('Failed to dispatch position update webhook:', webhookError);
    }

    // Broadcast real-time updates
    try {
      broadcastPositionUpdate(positionWithCustomAttrs);
      broadcastPositionListUpdate();
      
      // Broadcast statistics update
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
      broadcastPositionStatisticsUpdate(statistics);
    } catch (broadcastError) {
      console.error('Failed to broadcast position updates:', broadcastError);
    }

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
      } catch (error) {
        results.push({
          positionId: position.id,
          positionTitle: position.title,
          success: false,
          message: `Error processing position: ${error instanceof Error ? error.message : 'Unknown error'}`,
          action: 'error',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error checking and auto-closing positions:', error);
    throw error;
  }
}
