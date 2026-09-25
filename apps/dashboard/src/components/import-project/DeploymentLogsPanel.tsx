import { Icon as UiIcon } from "@repo/ui/icons";
import type { ReactNode } from "react";

/** The same console surface for single-app and Compose deployments. */
export function DeploymentLogsPanel({ title, summary, progress, tabs, children }: {
  title: string;
  summary?: ReactNode;
  progress?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-normal text-foreground"><UiIcon name="terminal" className="size-4 text-muted-foreground" aria-hidden />{title}</h2>
        {summary}
      </div>
      {progress}
      {tabs}
      <div className="relative h-[min(62vh,640px)] min-h-[360px] overflow-hidden">
        {children}
      </div>
    </section>
  );
}
