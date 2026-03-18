interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "error" | "warning" | "info";
}

const variantClass: Record<string, string> = {
  default: "badge",
  success: "badge badge-success",
  error: "badge badge-error",
  warning: "badge badge-warning",
  info: "badge badge-info",
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return <span className={variantClass[variant]}>{children}</span>;
}
