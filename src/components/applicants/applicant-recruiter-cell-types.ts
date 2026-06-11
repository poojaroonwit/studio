export interface ApplicantRecruiterOption {
  id: string;
  name: string;
  avatarUrl?: string;
  personalColor?: string;
}

export interface ApplicantRecruiterCellApplicant {
  id: string;
  recruiterId?: string | null;
  recruiter?: ApplicantRecruiterOption | null;
}
