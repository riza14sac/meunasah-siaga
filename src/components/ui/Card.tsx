export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg bg-surface p-4 shadow-card md:p-5 ${className}`}>{children}</div>;
}
