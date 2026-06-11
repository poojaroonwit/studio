import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApplicantContactInfo } from './ContactTabTypes';

interface ContactInfoCardProps {
  contactInfo?: ApplicantContactInfo;
}

export function ContactInfoCard({ contactInfo }: ContactInfoCardProps) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contactInfo?.email && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Email</span>
              <p className="text-sm">{contactInfo.email}</p>
            </div>
          )}
          {contactInfo?.phone && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Phone</span>
              <p className="text-sm">{contactInfo.phone}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
