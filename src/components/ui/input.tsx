import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "input-gradient flex h-8 w-full !rounded-md bg-gray-100 px-2.5 py-1.5 text-[12px] leading-4 text-slate-700 ring-offset-background file:border-0 file:bg-transparent file:text-[12px] file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 max-sm:h-11 max-sm:text-base dark:bg-gray-600 dark:text-zinc-100",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
