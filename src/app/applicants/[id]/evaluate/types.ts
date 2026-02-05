import type { Applicant, Position } from '@/lib/types';

export interface EvaluationQuestion {
  id: string;
  traitId: string;
  traitName: string;
  groupName: string;
  description: string;
  shortDescription?: string;
  score: number;
  notes: string;
}

export interface EvaluationFormData {
  Applicant: Applicant;
  position?: Position;
  questions: EvaluationQuestion[];
  currentQuestionIndex: number;
  overallScore: number;
  comments: string;
}

export interface Interviewer {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  avatarUrl?: string | null;
  positionTitle?: string;
}

export interface TestingResult {
  id: string;
  assignmentId?: string; // Assignment ID for deletion
  groupAssignmentId?: string; // Assignment ID for deletion of entire group
  groupName?: string; // Name of the group for confirmation message
  label: string;
  score: number;
  maxScore: number;
}

