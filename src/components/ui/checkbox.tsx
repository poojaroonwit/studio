"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon, MinusIcon } from "@heroicons/react/24/outline"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-full border border-input bg-background text-primary-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground hover:data-[state=checked]:bg-primary/90",
      "data-[state=indeterminate]:border-warning data-[state=indeterminate]:bg-warning data-[state=indeterminate]:text-warning-foreground hover:data-[state=indeterminate]:bg-warning/90",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center rounded-full text-current">
      <CheckIcon className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

// Three-state checkbox component that cycles: unchecked → checked → indeterminate → unchecked
interface ThreeStateCheckboxProps extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'checked' | 'onCheckedChange'> {
  value?: 'unchecked' | 'checked' | 'indeterminate';
  onValueChange?: (value: 'unchecked' | 'checked' | 'indeterminate') => void;
}

const ThreeStateCheckbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  ThreeStateCheckboxProps
>(({ value = 'unchecked', onValueChange, className, ...props }, ref) => {
  const handleCheckedChange = () => {
    if (!onValueChange) return;

    if (value === 'unchecked') {
      onValueChange('checked');
    } else if (value === 'checked') {
      onValueChange('indeterminate');
    } else {
      onValueChange('unchecked');
    }
  };

  const checkedState = value === 'indeterminate' ? 'indeterminate' : value === 'checked';

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={checkedState}
      onCheckedChange={handleCheckedChange}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-md border border-input bg-background text-primary-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground hover:data-[state=checked]:bg-primary/90",
        "data-[state=indeterminate]:border-warning data-[state=indeterminate]:bg-warning data-[state=indeterminate]:text-warning-foreground hover:data-[state=indeterminate]:bg-warning/90",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {value === 'indeterminate' ? (
          <MinusIcon className="h-4 w-4" />
        ) : (
          <CheckIcon className="h-4 w-4" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
ThreeStateCheckbox.displayName = "ThreeStateCheckbox";

export { Checkbox, ThreeStateCheckbox }
