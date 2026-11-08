const variants = {
  primary: "bg-orange-600 text-white hover:bg-orange-700 focus-visible:outline-orange-700",
  secondary:
    "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 focus-visible:outline-orange-700",
  ghost: "text-stone-700 hover:bg-stone-100 focus-visible:outline-orange-700",
  danger: "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700",
};

const sizes = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export function Button({
  children,
  className = "",
  disabled = false,
  loading = false,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${className}`}
      disabled={disabled || loading}
      type={type}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}
