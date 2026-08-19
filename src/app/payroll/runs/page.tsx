import { PayrollSettlementBoundary } from '@/components/payroll/PayrollSettlementBoundary';
import { PayrollWorkspace } from '@/components/payroll/PayrollWorkspace';

export default function PayrollRunsPage() {
  return (
    <>
      <PayrollSettlementBoundary />
      <PayrollWorkspace resource="runs" />
    </>
  );
}
