import { ServiceDeskPage } from '@/components/privacy-support/ServiceDeskPage';
import { parseServiceDeskIntent } from '@/lib/service-desk-contract';

export const metadata = { title: 'Service Desk | hrive' };

export default async function Page({ searchParams }: { searchParams: Promise<{ new?: string; ticket?: string }> }) {
  const params = await searchParams;
  const ticketId = params.ticket && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(params.ticket) ? params.ticket : null;
  return <ServiceDeskPage initialIntent={parseServiceDeskIntent(params.new)} initialTicketId={ticketId} />;
}
