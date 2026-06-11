import { Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  EvaluateHeaderBackgroundTypeSelect,
  EvaluateHeaderGradientSection,
  EvaluateHeaderImageSection,
  EvaluateHeaderSolidColorSection,
  EvaluateHeaderTextColorSection,
} from './EvaluateTabParts';
import {
  getDefaultEvaluateHeaderGradient,
  getEvaluateHeaderPreviewImageSrc,
} from './evaluate-tab-utils';
import type { EvaluateTabProps } from './EvaluateTabTypes';

export function EvaluateTab({
  canEdit,
  evaluateHeaderBackgroundType,
  setEvaluateHeaderBackgroundType,
  evaluateHeaderImagePreviewUrl,
  savedEvaluateHeaderImageDataUrl,
  removeSelectedEvaluateHeaderImage,
  handleEvaluateHeaderImageFileChange,
  evaluateHeaderBackgroundGradient,
  setEvaluateHeaderBackgroundGradient,
  evaluateHeaderBackgroundColor,
  setEvaluateHeaderBackgroundColor,
  evaluateHeaderTextColor,
  setEvaluateHeaderTextColor,
}: EvaluateTabProps) {
  const defaultEvaluateHeaderGradient = getDefaultEvaluateHeaderGradient();
  const evaluateHeaderPreviewImageSrc = getEvaluateHeaderPreviewImageSrc(
    evaluateHeaderImagePreviewUrl,
    savedEvaluateHeaderImageDataUrl
  );

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Evaluate Page Settings
            </CardTitle>
            <CardDescription>
              Customize the appearance of the Applicants evaluation page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EvaluateHeaderBackgroundTypeSelect
              canEdit={canEdit}
              value={evaluateHeaderBackgroundType}
              onChange={setEvaluateHeaderBackgroundType}
            />

            {evaluateHeaderBackgroundType === 'image' && (
              <EvaluateHeaderImageSection
                canEdit={canEdit}
                previewImageSrc={evaluateHeaderPreviewImageSrc}
                onRemoveImage={removeSelectedEvaluateHeaderImage}
                onImageFileChange={handleEvaluateHeaderImageFileChange}
              />
            )}

            {evaluateHeaderBackgroundType === 'gradient' && (
              <EvaluateHeaderGradientSection
                canEdit={canEdit}
                value={evaluateHeaderBackgroundGradient}
                defaultGradient={defaultEvaluateHeaderGradient}
                onChange={setEvaluateHeaderBackgroundGradient}
              />
            )}

            {evaluateHeaderBackgroundType === 'solid' && (
              <EvaluateHeaderSolidColorSection
                canEdit={canEdit}
                value={evaluateHeaderBackgroundColor}
                onChange={setEvaluateHeaderBackgroundColor}
              />
            )}

            <EvaluateHeaderTextColorSection
              canEdit={canEdit}
              value={evaluateHeaderTextColor}
              onChange={setEvaluateHeaderTextColor}
            />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
