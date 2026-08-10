import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { employeeContext } from '@/lib/privacy-support';
import { handlePrivacySupportApi } from '@/lib/privacy-support-api';
import { getServiceDeskCategories } from '@/lib/service-desk-categories';

async function listCategories() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const employee = await employeeContext(session.user);
  const categories = await getServiceDeskCategories(employee.companyId);
  return NextResponse.json({
    categories: categories.map(({ key, label, aiEnabled }) => ({ key, label, aiEnabled })),
  });
}

export function GET() {
  return handlePrivacySupportApi('Loading service desk categories', listCategories);
}
