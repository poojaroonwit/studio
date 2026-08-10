import { HrEmployeeProfilePage } from '@/components/hr/HrEmployeeProfilePage';

interface PeopleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PeopleDetailPage({ params }: PeopleDetailPageProps) {
  const { id } = await params;
  return (
    <div className="flex min-h-full w-full flex-1">
      <HrEmployeeProfilePage employeeId={id} />
    </div>
  );
}
