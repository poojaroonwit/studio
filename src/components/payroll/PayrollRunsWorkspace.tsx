"use client";

import * as React from "react";
import { toast } from "react-hot-toast";

import { PayrollSettlementBoundary } from "./PayrollSettlementBoundary";
import { PayrollWorkspace } from "./PayrollWorkspace";

function downloadName(response: Response) {
  const disposition = response.headers.get("content-disposition") || "";
  return (
    disposition.match(/filename="?([^";]+)"?/i)?.[1] ||
    "payroll-register.csv"
  );
}

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
      const response = await fetch("/api/payroll/v1/reports/register", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error?.message || "Payroll register export failed.",
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadName(response);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

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
