export interface EmailServerTabProps {
  emailServiceEnabled: boolean;
  setEmailServiceEnabled: (val: boolean) => void;
  emailSmtpHost: string;
  setEmailSmtpHost: (val: string) => void;
  emailSmtpPort: number;
  setEmailSmtpPort: (val: number) => void;
  emailSmtpSecure: boolean;
  setEmailSmtpSecure: (val: boolean) => void;
  emailSmtpUser: string;
  setEmailSmtpUser: (val: string) => void;
  emailSmtpPassword: string;
  setEmailSmtpPassword: (val: string) => void;
  emailFromAddress: string;
  setEmailFromAddress: (val: string) => void;
  emailFromName: string;
  setEmailFromName: (val: string) => void;
  showSmtpPassword: boolean;
  setShowSmtpPassword: (val: boolean) => void;
  isSaving: boolean;
  testingEmail: boolean;
  setTestingEmail: (val: boolean) => void;
}

export interface EmailConnectionSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

export interface TestEmailResponse {
  success?: boolean;
  error?: string;
}
