import { ScrollArea } from '@/components/ui/scroll-area';
import { BrandingContentCard } from './BrandingTabSections';
import type { BrandingTabProps } from './BrandingTabTypes';

export function BrandingTab(props: BrandingTabProps) {
    return (
        <ScrollArea className="h-full min-h-0">
            <div className="mx-auto w-full max-w-[1040px] pb-4 pr-3">
                <BrandingContentCard {...props} />
            </div>
        </ScrollArea>
    );
}
