// src/app/page.tsx (Server Component)
import { auth } from '@/auth';
import DashboardPageClient from '@/components/dashboard/DashboardPageClient';
import { getRootDashboardInitialData } from './root-dashboard-initial-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EMPTY_DASHBOARD_PROPS = {
  initialApplicants: [],
  initialPositions: [],
  initialUsers: [],
  initialStageIds: {},
  initialStageNames: {},
};

export default async function DashboardPageServer() {
  try {
    const session = await auth();
    if (!session?.user) {
      return <DashboardPageClient {...EMPTY_DASHBOARD_PROPS} authError={true} />;
    }

    const initialData = await getRootDashboardInitialData();
    return <DashboardPageClient {...initialData} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load initial dashboard data.';

    return (
      <DashboardPageClient
        {...EMPTY_DASHBOARD_PROPS}
        initialFetchError={message}
      />
    );
  }
}
