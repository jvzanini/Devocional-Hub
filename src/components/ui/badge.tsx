import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "error" | "warning" | "info";
  className?: string;
}

const variantClasses = {
  default: "bg-muted text-text-secondary border-border",
  success: "bg-success-surface text-success border-emerald-200",
  error: "bg-error-surface text-error border-red-200",
  warning: "bg-warning-surface text-warning border-amber-200",
  info: "bg-info-surface text-info border-blue-200",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border tracking-wide",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
