export interface Interviewer {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  positionTitle?: string;
  createdAt: string;
}

export interface InterviewerUser {
  id: string;
  name: string;
  email: string;
  role: string;
  positionTitle?: string;
}
