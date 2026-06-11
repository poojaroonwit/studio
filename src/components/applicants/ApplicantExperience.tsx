import type { ExperienceEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ApplicantExperienceTimeline } from './ApplicantExperienceTimeline';
import {
  calculateTotalExperienceDuration,
  sortExperienceByTimeline,
} from './applicant-experience-utils';

interface ApplicantExperienceProps {
  experience: ExperienceEntry[];
}

export default function ApplicantExperience({ experience }: ApplicantExperienceProps) {
  const safeExperience = Array.isArray(experience) ? experience : [];
  const sortedExperience = sortExperienceByTimeline(safeExperience);
  const totalDuration = calculateTotalExperienceDuration(safeExperience);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Work Experience
          {totalDuration && ` (${totalDuration})`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedExperience.length > 0 ? (
          <ApplicantExperienceTimeline experience={sortedExperience} />
        ) : (
          <div className="text-muted-foreground text-center py-8">
            No work experience available.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
