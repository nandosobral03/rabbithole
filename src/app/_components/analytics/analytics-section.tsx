interface AnalyticsSectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}

export function AnalyticsSection({ title, subtitle, children, className = "" }: AnalyticsSectionProps) {
  return (
    <div className={`rounded-lg border border-border bg-card p-6 shadow-sm ${className}`}>
      <div className="mb-4">
        <h2 className="font-semibold text-foreground text-lg">{title}</h2>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
