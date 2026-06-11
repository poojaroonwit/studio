import { ScrollArea } from '@/components/ui/scroll-area';
import { BrandingContentCard } from './BrandingTabSections';
import type { BrandingTabProps } from './BrandingTabTypes';

export function BrandingTab(props: BrandingTabProps) {
    return (
        <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
                <BrandingContentCard {...props} />
            </div>
        </ScrollArea>
    );
}
