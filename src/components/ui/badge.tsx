import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "error" | "warning" | "info";
  className?: string;
}

const variantClasses = {
  default: "bg-[var(--color-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
  success: "bg-[var(--color-success-surface)] text-[var(--color-success)] border-emerald-200",
  error: "bg-[var(--color-error-surface)] text-[var(--color-error)] border-red-200",
  warning: "bg-[var(--color-warning-surface)] text-[var(--color-warning)] border-amber-200",
  info: "bg-[var(--color-info-surface)] text-[var(--color-info)] border-blue-200",
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
