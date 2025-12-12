"use client";

import React from 'react';

interface PrintStylesProps {
  isInIframe: boolean;
}

export function PrintStyles({ isInIframe }: PrintStylesProps) {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
        ${!isInIframe ? `
          /* Full page mode - override Sheet styles */
          [data-radix-dialog-content] {
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            border-radius: 0 !important;
          }
        ` : ''}
        @media print {
          @page {
            margin: 1.5cm;
            size: A4;
          }
          
          /* Scale down content for print */
          body {
            transform: scale(0.9);
            transform-origin: top left;
            width: 111.11%; /* compensate for 90% scale */
          }
          
          /* Add print-only container padding */
          .min-h-screen > div {
            padding: 0.5cm !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          /* Hide print button specifically - multiple selectors for reliability */
          button[onClick*="handlePrint"],
          button:has(svg.lucide-printer),
          button:has(.lucide-printer),
          button .lucide-printer {
            display: none !important;
          }
          
          /* Hide any button containing "Print" text */
          button:has(span:contains("Print")) {
            display: none !important;
          }
          
          button {
            pointer-events: none !important;
            cursor: default !important;
          }
          
          input[type="number"] {
            border: none !important;
            background: transparent !important;
            pointer-events: none !important;
            -webkit-appearance: none;
            -moz-appearance: textfield;
          }
          
          .evaluate-card-rounded-top {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
          
          /* Disable responsive behavior - show desktop layout */
          * {
            max-width: none !important;
          }
          
          /* Force desktop grid layouts */
          .grid {
            display: grid !important;
          }
          
          .md\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          
          .lg\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          
          /* Force desktop flex layouts */
          .sm\\:flex-row {
            flex-direction: row !important;
          }
          
          .sm\\:items-center {
            align-items: center !important;
          }
          
          .sm\\:justify-between {
            justify-content: space-between !important;
          }
          
          /* Force desktop text alignment */
          .sm\\:text-right {
            text-align: right !important;
          }
          
          .sm\\:text-left {
            text-align: left !important;
          }
          
          /* Force desktop display */
          .sm\\:inline {
            display: inline !important;
          }
          
          .hidden.sm\\:inline {
            display: inline !important;
          }
          
          /* Reduce padding for print */
          body,
          .min-h-screen {
            padding: 0 !important;
            margin: 0 !important;
          }
          
          [class*="p-8"],
          [class*="p-12"],
          [class*="px-8"],
          [class*="px-12"],
          [class*="py-8"],
          [class*="py-12"] {
            padding: 0.5rem !important;
          }
          
          [class*="space-y-8"] {
            gap: 1rem !important;
          }
          
          [class*="mb-8"],
          [class*="mb-6"] {
            margin-bottom: 0.75rem !important;
          }
          
          [class*="pb-6"],
          [class*="pb-4"] {
            padding-bottom: 0.5rem !important;
          }
          
          [class*="pt-6"],
          [class*="pt-4"] {
            padding-top: 0.5rem !important;
          }
          
          [class*="p-4"],
          [class*="p-6"] {
            padding: 0.75rem !important;
          }
          
          [class*="gap-4"],
          [class*="gap-6"],
          [class*="gap-8"] {
            gap: 0.5rem !important;
          }
          
          /* Reduce card content padding */
          [class*="CardContent"] {
            padding: 0.5rem !important;
          }
          
          /* Reduce spacing in sections */
          .space-y-8 > * + * {
            margin-top: 0.75rem !important;
          }
          
          /* Ensure all groups are visible when printing */
          .border-t.bg-muted\\/20 {
            display: block !important;
          }
          
          /* Show all collapsed groups when printing */
          .border.rounded-md .border-t {
            display: block !important;
          }
          
          /* Remove hover effects */
          * {
            transition: none !important;
          }
          
          /* Ensure proper page breaks */
          .space-y-1 > div,
          .space-y-4 > div {
            page-break-inside: avoid;
          }
          
          /* Print-friendly colors */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Hide chevron icons when printing */
          .lucide-chevron-right,
          .lucide-chevron-down {
            display: none !important;
          }
          
          /* Ensure tables maintain layout when printing */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
          }
          
          th, td {
            padding: 0.5rem !important;
            text-align: left !important;
            border: none !important;
            vertical-align: top !important;
          }
          
          th {
            background-color: transparent !important;
            font-weight: 600 !important;
          }
          
          /* Remove borders from table elements */
          table.border-0,
          table.border-0 th,
          table.border-0 td,
          table.border-0 tr {
            border: none !important;
          }
          
          /* Preserve table column alignment */
          th.text-left,
          td.text-left {
            text-align: left !important;
          }
          
          th.text-right,
          td.text-right {
            text-align: right !important;
          }
          
          th.text-center,
          td.text-center {
            text-align: center !important;
          }
          
          /* Ensure table cells don't break across pages */
          tr {
            page-break-inside: avoid !important;
          }
          
          /* Preserve flex layouts in print */
          .flex {
            display: flex !important;
          }
          
          .items-center {
            align-items: center !important;
          }
          
          .justify-between {
            justify-content: space-between !important;
          }
          
          .justify-end {
            justify-content: flex-end !important;
          }
          
          /* Ensure grid layouts work in print */
          .grid {
            display: grid !important;
          }
          
          /* Preserve table container styles */
          .overflow-auto {
            overflow: visible !important;
          }
          
          /* Ensure table wrapper maintains width */
          [class*="Table"] {
            width: 100% !important;
          }
          
          /* Preserve spacing in table cells */
          .gap-2 {
            gap: 0.5rem !important;
          }
          
          /* Ensure badges and spans in table cells display properly */
          .rounded {
            border-radius: 0.25rem !important;
          }
          
          /* Preserve flex items in table cells */
          .flex.items-center {
            display: flex !important;
            align-items: center !important;
          }
        }
      `
    }} />
  );
}

