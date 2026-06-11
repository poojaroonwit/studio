import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "border inline-flex items-center justify-center whitespace-nowrap !rounded-md text-sm font-medium ring-offset-background transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none max-sm:min-h-11 [border-radius:0.375rem!important]",
  {
    variants: {
      variant: {
        default: "btn-primary-gradient text-primary-foreground shadow-md shadow-primary/30 motion-safe:hover:-translate-y-0.5 hover:shadow-lg",
        destructive:
          "btn-destructive-gradient text-destructive-foreground motion-safe:hover:-translate-y-0.5 hover:shadow-md",
        outline:
          "btn-secondary-gradient border-secondary text-secondary-foreground motion-safe:hover:-translate-y-0.5 hover:shadow-md",
        secondary:
          "btn-secondary-gradient text-secondary-foreground motion-safe:hover:-translate-y-0.5 hover:shadow-md",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md",
        link: "text-primary underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 !rounded-md px-2.5 py-1 [border-radius:0.375rem!important] shadow-sm hover:shadow-md",
        lg: "h-9 !rounded-md px-6 [border-radius:0.375rem!important] shadow-lg hover:shadow-xl",
        icon: "h-8 w-8 !rounded-md max-sm:min-w-11 [border-radius:0.375rem!important] shadow-md hover:shadow-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const buttonProps = asChild ? props : { type: "button" as const, ...props }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...buttonProps}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

    
