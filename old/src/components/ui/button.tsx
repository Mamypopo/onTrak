import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-md hover:shadow-lg hover-lift focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:text-destructive-foreground dark:hover:bg-destructive/80 shadow-md hover:shadow-lg hover-lift active:scale-95 transition-all",
        success:
          "bg-success text-success-foreground hover:bg-success/90 dark:bg-success dark:text-success-foreground dark:hover:bg-success/80 shadow-md hover:shadow-lg hover-lift active:scale-95 transition-all",
        outline:
          "border-2 border-input bg-background hover:bg-muted hover:text-foreground hover:border-primary/50 active:scale-95 transition-all",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover-lift active:scale-95 transition-all",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 dark:bg-accent dark:text-accent-foreground dark:hover:bg-accent/80 shadow-md hover:shadow-lg hover-lift active:scale-95 transition-all",
        ghost: "hover:bg-muted hover:text-foreground active:scale-95 transition-all",
        link: "text-primary underline-offset-4 hover:underline transition-all",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
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

export { Button, buttonVariants }
