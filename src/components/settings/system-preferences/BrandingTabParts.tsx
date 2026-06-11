import React from 'react';
import { ImageUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    getBrandingLogoUploadTileClasses,
    type BrandingLogoUploadTileSize,
} from './branding-logo-upload-utils';

export function BrandingSettingsRow({
    label,
    description,
    children,
}: {
    label: React.ReactNode;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-4 space-y-1">
                {typeof label === 'string' ? (
                    <Label className="text-base font-medium">{label}</Label>
                ) : label}
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
            <div className="md:col-span-8">
                {children}
            </div>
        </div>
    );
}

export function BrandingLogoUploadTile({
    id,
    previewUrl,
    alt,
    canEdit,
    onChange,
    onRemove,
    size = 'large',
    emptyText,
    imageClassName,
}: {
    id: string;
    previewUrl: string | null;
    alt: string;
    canEdit: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
    size?: BrandingLogoUploadTileSize;
    emptyText?: string;
    imageClassName?: string;
}) {
    const classes = getBrandingLogoUploadTileClasses(size);

    return (
        <div className="flex-shrink-0">
            <Input
                type="file"
                accept="image/*"
                onChange={onChange}
                disabled={!canEdit}
                className="hidden"
                id={id}
            />
            <Label htmlFor={id} className="cursor-pointer block">
                <div className={`${classes.containerClassName} bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors`}>
                    {previewUrl ? (
                        <div className={classes.previewWrapperClassName}>
                            <img
                                src={previewUrl}
                                alt={alt}
                                className={imageClassName ?? classes.imageClassName}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className={classes.removeButtonClassName}
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onRemove();
                                }}
                                disabled={!canEdit}
                            >
                                <X className={classes.removeIconClassName} />
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <ImageUp className={classes.emptyIconClassName} />
                            {emptyText && <p className={classes.emptyTextClassName}>{emptyText}</p>}
                        </div>
                    )}
                </div>
            </Label>
        </div>
    );
}

export function BrandingLogoVariantUpload({
    label,
    id,
    previewUrl,
    alt,
    canEdit,
    onChange,
    onRemove,
}: {
    label: string;
    id: string;
    previewUrl: string | null;
    alt: string;
    canEdit: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-xs font-medium">{label}</Label>
            <div className="flex items-center gap-3">
                <BrandingLogoUploadTile
                    id={id}
                    previewUrl={previewUrl}
                    alt={alt}
                    canEdit={canEdit}
                    onChange={onChange}
                    onRemove={onRemove}
                    size="small"
                />
            </div>
        </div>
    );
}
