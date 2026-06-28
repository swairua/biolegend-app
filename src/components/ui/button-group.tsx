import * as React from "react"
import { cn } from "@/lib/utils"

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'stack' | 'row' | 'compact' | 'modal' | 'header' | 'table'
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, variant = 'row', ...props }, ref) => {
    const variantClasses = {
      stack: "flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:gap-2",
      row: "flex flex-wrap gap-2 sm:gap-3 items-center",
      compact: "flex flex-wrap gap-1 sm:gap-2 items-center",
      modal: "flex flex-col-reverse gap-2 sm:gap-3 sm:flex-row sm:justify-end sm:items-center",
      header: "flex flex-wrap gap-1 sm:gap-2 items-center",
      table: "flex gap-1 sm:gap-2 items-center justify-end flex-wrap sm:flex-nowrap",
    }

    return (
      <div
        ref={ref}
        className={cn(variantClasses[variant], className)}
        {...props}
      />
    )
  }
)
ButtonGroup.displayName = "ButtonGroup"

// Responsive button wrapper for full-width on mobile
interface ResponsiveButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  fullMobileWidth?: boolean
}

const ResponsiveButtonWrapper = React.forwardRef<HTMLDivElement, ResponsiveButtonProps>(
  ({ className, fullMobileWidth = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        fullMobileWidth && "w-full sm:w-auto",
        className
      )}
      {...props}
    />
  )
)
ResponsiveButtonWrapper.displayName = "ResponsiveButtonWrapper"

export { ButtonGroup, ResponsiveButtonWrapper }
