/**
 * Headcount Assignment Functions
 * Functions for assigning/unassigning candidates to headcounts
 */

import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';
import { getRecruitmentStageByName } from '../recruitmentStageUtils';
import { autoClosePositionIfHeadcountFilled } from './position-automation';
import { broadcastPositionUpdates } from './broadcast';
import type { AssignmentResult, UnassignmentResult } from './types';

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
): Promise<AssignmentResult> {
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
    await logAudit(
      'AUDIT', 
      `Candidate assigned to headcount automatically when status changed to "Hired" by ${actingUserName}.`, 
      'Headcount:AutoAssign', 
      actingUserId, 
      {
        candidateId,
        headcountId: vacantHeadcount.id,
        positionId,
      }
    );

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
    await broadcastPositionUpdates();

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
): Promise<UnassignmentResult> {
  try {
    const headcount = await prisma.headcount.findUnique({
      where: { id: headcountId },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            statusId: true,
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
    await logAudit(
      'AUDIT', 
      `Candidate unassigned from headcount by ${actingUserName}.`, 
      'Headcount:Unassign', 
      actingUserId, 
      {
        candidateId,
        headcountId,
        positionId: headcount.position.id,
        statusUpdateResult,
      }
    );

    // Broadcast real-time updates for headcount changes
    await broadcastPositionUpdates();

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
