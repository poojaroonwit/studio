"use client";

import * as React from "react";
import { toast } from "react-hot-toast";

import { downloadControlledPayrollExport } from "@/lib/payroll/client-export";
import { PayrollSettlementBoundary } from "./PayrollSettlementBoundary";
import { PayrollWorkspace } from "./PayrollWorkspace";

/**
 * Keeps the Payroll Runs register on the same controlled export boundary as
 * Payroll Reports. PayrollWorkspace still contains the historical in-browser
 * register export implementation, so this wrapper intercepts only that single
 * Download/Export action before its legacy handler can run and replaces it
 * with the authenticated, company-scoped, audit-logged server export.
 *
 * This compatibility bridge can be removed once the Runs register is split
 * out of PayrollWorkspace into its own component.
 */
export function PayrollRunsWorkspace() {
  const [exporting, setExporting] = React.useState(false);

  const exportRegister = React.useCallback(async () => {
    if (exporting) return;
    setExporting(true);

    try {
      await downloadControlledPayrollExport(
        "/api/payroll/v1/reports/register",
        "payroll-register.csv",
      );
      toast.success("Payroll register exported and audit logged.");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Payroll register export failed.",
      );
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  const interceptLegacyRegisterExport = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("button");
      if (!button) return;

      const label = button.textContent?.trim() || "";
      const isRunsRegisterExport =
        Boolean(button.querySelector("svg.lucide-download")) &&
        (label === "Export" || label === "ส่งออก");

      if (!isRunsRegisterExport) return;

      event.preventDefault();
      event.stopPropagation();
      void exportRegister();
    },
    [exportRegister],
  );

  return (
    <div onClickCapture={interceptLegacyRegisterExport}>
      <PayrollSettlementBoundary />
      <PayrollWorkspace resource="runs" />
    </div>
  );
}
