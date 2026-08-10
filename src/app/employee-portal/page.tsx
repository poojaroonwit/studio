import { CompanyPortalExperience } from '@/components/company-portal/CompanyPortalExperience';

export default function EmployeePortalPage() {
  return (
    <CompanyPortalExperience
      apiPath="/api/employee-portal"
      fullPageHref="/employee-portal/public"
      footerLabel="Employee portal intranet"
      portalVariant="employee"
    />
  );
}
