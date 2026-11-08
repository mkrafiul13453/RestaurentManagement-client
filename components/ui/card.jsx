export function Card({ children, className = "", ...props }) {
  return (
    <section
      {...props}
      className={`rounded-2xl border border-stone-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}
