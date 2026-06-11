import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatApplicantNameWithLang } from '@/lib/applicantUtils';
import type { Applicant } from '@/lib/types';
import {
  getApplicantInfoFieldValue,
  getApplicantPersonalInfo,
} from './applicant-info-tab-utils';

export function ApplicantInfoDisplayCard({ applicant }: { applicant: Applicant }) {
  const nameInfo = formatApplicantNameWithLang(applicant);
  const personalInfo = getApplicantPersonalInfo(applicant.parsedData);
  const titleHonorific = getApplicantInfoFieldValue(personalInfo?.title_honorific);
  const nickname = getApplicantInfoFieldValue(personalInfo?.nickname);
  const location = getApplicantInfoFieldValue(personalInfo?.location);
  const introduction = getApplicantInfoFieldValue(personalInfo?.introduction_aboutme);

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {titleHonorific && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Title</span>
                <p className="text-sm">{titleHonorific}</p>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-muted-foreground">Name</span>
              <p
                className={`text-sm ${nameInfo.fontClass}`}
                lang={nameInfo.lang}
              >
                {nameInfo.name}
              </p>
            </div>
            {nickname && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Nickname</span>
                <p className="text-sm">{nickname}</p>
              </div>
            )}
            {location && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Location</span>
                <p className="text-sm">{location}</p>
              </div>
            )}
          </div>
          {introduction && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">About Me</span>
              <p className="text-sm mt-1">{introduction}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
