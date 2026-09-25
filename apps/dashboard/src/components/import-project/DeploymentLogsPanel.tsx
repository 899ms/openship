import type { ReactNode } from "react";

/** The same console surface for single-app and Compose deployments. */
export function DeploymentLogsPanel({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-5 py-4">
        <h2 className="shrink-0 text-sm font-semibold text-foreground">{title}</h2>
        {summary}
      </div>
      <div className="relative h-[clamp(280px,50vh,400px)] overflow-hidden">{children}</div>
    </section>
  );
}
