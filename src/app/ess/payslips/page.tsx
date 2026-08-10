import { redirect } from 'next/navigation';

export default function EssPayslipsPage() {
  redirect('/ess/documents?tab=payslips');
}
