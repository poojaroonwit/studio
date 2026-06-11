"use client";

import { Accordion } from "@/components/ui/accordion";
import { AiApiKeysAddSection } from "./AiApiKeysAddSection";
import { AiApiKeysFooter, AiApiKeysLoadingState } from "./AiApiKeysFooterState";
import { AiApiKeysInfoSection } from "./AiApiKeysInfoSection";
import { AiApiKeysListSection } from "./AiApiKeysListSection";
import type { AiApiKeysAccordionProps } from "./AiApiKeysTabTypes";

export function AiApiKeysAccordion(props: AiApiKeysAccordionProps) {
  return (
    <Accordion type="multiple" defaultValue={["add", "list", "info"]} className="w-full">
      <AiApiKeysAddSection {...props} />
      <AiApiKeysListSection {...props} />
      <AiApiKeysInfoSection />
    </Accordion>
  );
}

export { AiApiKeysFooter, AiApiKeysLoadingState };
