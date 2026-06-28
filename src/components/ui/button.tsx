import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-card",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-card",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover shadow-card",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-card",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-card",
        "primary-gradient": "gradient-primary text-primary-foreground hover:opacity-90 shadow-card",
        "success-gradient": "gradient-success text-success-foreground hover:opacity-90 shadow-card",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        xs: "h-8 rounded px-2 text-xs",
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
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// Responsive button group wrapper classes
const buttonGroupClasses = {
  // Stack on mobile, flex row on desktop
  stack: "flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:gap-2",
  // Always flex row, wraps naturally on mobile
  row: "flex flex-wrap gap-2 sm:gap-3 items-center",
  // Compact row with smaller gap for icon buttons
  compact: "flex flex-wrap gap-1 sm:gap-2 items-center",
  // Full width on mobile, auto on desktop (for modal/dialog footers)
  modal: "flex flex-col-reverse gap-2 sm:gap-3 sm:flex-row sm:justify-end sm:items-center",
  // Header buttons - responsive spacing
  header: "flex flex-wrap gap-1 sm:gap-2 items-center",
  // Table action buttons - compact, responsive
  table: "flex gap-1 sm:gap-2 items-center justify-end flex-wrap sm:flex-nowrap",
}

// Size variants for different contexts
const buttonSizeResponsive = {
  // Mobile-first: compact on mobile, normal on desktop
  header: "sm:size-default xs:h-8 xs:px-2 xs:text-xs sm:h-9 sm:px-3 h-8 px-2 text-xs",
  table: "h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm",
  modal: "h-9 sm:h-10 px-3 sm:px-4 text-sm sm:text-base",
}

export { Button, buttonVariants, buttonGroupClasses, buttonSizeResponsive }
