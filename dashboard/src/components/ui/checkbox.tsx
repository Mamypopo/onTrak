import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, indeterminate, onCheckedChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement | null>(null);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (internalRef.current && typeof indeterminate === "boolean") {
        internalRef.current.indeterminate = indeterminate && !checked;
      }
    }, [indeterminate, checked]);

    return (
      <input
        ref={internalRef}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border border-input bg-background text-primary shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";


