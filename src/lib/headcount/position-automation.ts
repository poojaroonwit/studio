/**
 * Position Automation Functions
 * Functions for automatically opening/closing positions based on headcount
 */

import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';
import { broadcastPositionUpdate, broadcastPositionListUpdated } from '@/lib/simple-broadcaster';
import { checkPositionHeadcountStatus } from './status';
import { broadcastPositionStats } from './broadcast';
import type { PositionActionResult, BatchCloseResult } from './types';

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
): Promise<PositionActionResult> {
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

    // Prepare position data for broadcast
    const positionWithCustomAttrs = {
      ...updatedPosition,
      custom_attributes: updatedPosition.customAttributes || {},
    };

    // Broadcast updates
    broadcastPositionUpdate(positionWithCustomAttrs, actingUserId);
    broadcastPositionListUpdated();
    await broadcastPositionStats();

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
): Promise<PositionActionResult> {
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

    // Reopen the position
    const updatedPosition = await prisma.position.update({
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

    // Prepare position data for broadcast
    const positionWithCustomAttrs = {
      ...updatedPosition,
      custom_attributes: updatedPosition.customAttributes || {},
    };

    // Broadcast updates
    broadcastPositionUpdate(positionWithCustomAttrs, actingUserId);
    broadcastPositionListUpdated();
    await broadcastPositionStats();

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
 * Automatically open a position when a new headcount is added to a closed position
 * @param positionId - The position ID to potentially open
 * @param actingUserId - The user ID performing the action (for audit logging)
 * @param actingUserName - The user name performing the action (for audit logging)
 * @returns Object with success status and details
 */
export async function autoOpenPositionIfNewHeadcountAdded(
  positionId: string,
  actingUserId: string,
  actingUserName: string
): Promise<PositionActionResult> {
  try {
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
      };
    }

    // Check current headcount status
    const headcountStatus = await checkPositionHeadcountStatus(positionId);

    if (!headcountStatus.hasHeadcounts) {
      return {
        success: false,
        message: 'Position has no headcounts defined',
        action: 'none',
      };
    }

    // Open the position
    const updatedPosition = await prisma.position.update({
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

    // Log the automatic opening
    await logAudit(
      'AUDIT',
      `Position '${position.title}' automatically opened due to new headcount being added. Total headcounts: ${headcountStatus.totalHeadcounts}`,
      'SYSTEM:AutoOpenPosition',
      actingUserId,
      {
        positionId,
        headcountStatus,
        previousStatus: 'closed',
        newStatus: 'open'
      }
    );

    // Prepare position data for broadcast
    const positionWithCustomAttrs = {
      ...updatedPosition,
      custom_attributes: updatedPosition.customAttributes || {},
    };

    // Broadcast updates
    broadcastPositionUpdate(positionWithCustomAttrs, actingUserId);
    broadcastPositionListUpdated();
    await broadcastPositionStats();

    return {
      success: true,
      message: 'Position automatically opened successfully',
      action: 'opened',
      headcountStatus,
      position: positionWithCustomAttrs,
    };

  } catch (error) {
    console.error('Error auto-opening position:', error);
    await logAudit(
      'ERROR',
      `Failed to auto-open position ${positionId}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'SYSTEM:AutoOpenPosition',
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
): Promise<BatchCloseResult[]> {
  try {
    // Get all open positions with headcounts
    const openPositions = await prisma.position.findMany({
      where: { isOpen: true },
      select: { id: true, title: true },
    });

    const results: BatchCloseResult[] = [];

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

    return results;
  } catch (error) {
    console.error('Error checking and auto-closing positions:', error);
    throw error;
  }
}
