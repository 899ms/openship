"use client";

import Link from "next/link";
import { AlertTriangle, Bell, Loader2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MonitoringHealthSnapshot } from "@/lib/api/issues";

export function AutomaticMonitoringCard({
  watcher,
  watching,
  busy,
  disabled,
  error,
  onToggle,
  onViewIssues,
}: {
  watcher: MonitoringHealthSnapshot["watcher"];
  watching: boolean;
  busy: boolean;
  disabled: boolean;
  error: string | null;
  onToggle: () => void;
  onViewIssues: () => void;
}) {
  return (
    <section
      aria-labelledby="automatic-monitoring-title"
      className="overflow-hidden rounded-2xl border border-border/50 bg-card"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${watching ? "bg-success-bg text-success" : "bg-muted text-muted-foreground"}`}
        >
          <Power className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id="automatic-monitoring-title"
              className="text-[15px] font-semibold text-foreground"
            >
              Automatic monitoring
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {!watcher.available ? "Unavailable" : watching ? "Enabled" : "Off"}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {!watcher.available
              ? "Background jobs are disabled for this installation. Automatic monitoring cannot run here."
              : watching
                ? "Confirmed failures appear in Issues and use your configured alert channels. Incidents close when services recover."
                : "Enable scheduled checks to record outages, unhealthy containers and crash loops in Issues, with alerts through your configured channels."}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {watcher.available &&
              (watcher.runsWhileAppOpen
                ? "Requires Openship to remain running on this computer. "
                : "Runs on the server even when this page is closed. ")}
            Covers local and connected-server workloads across this installation. Cloud workloads
            are excluded.
          </p>
          {watcher.available && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {!watcher.schedule || watcher.schedule === "* * * * *"
                ? "Checks every minute."
                : "Checks on your saved schedule."}{" "}
              Uses CPU and network traffic to check servers in small batches.
              {watcher.eventsEnabled &&
                " Docker events bring checks forward when a container changes."}
            </p>
          )}
          {watcher.available && !watcher.canManage && (
            <p className="mt-2 text-xs text-muted-foreground">
              An instance administrator can change automatic monitoring.
            </p>
          )}
        </div>
        {watcher.canManage && watcher.available && (
          <Button
            variant={watching ? "outline" : "default"}
            onClick={onToggle}
            disabled={busy || disabled}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Power />}
            {busy ? "Saving…" : watching ? "Pause monitoring" : "Enable automatic monitoring"}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border/50 px-5 py-3">
        <Button size="sm" variant="ghost" onClick={onViewIssues}>
          View issues
        </Button>
        {watcher.canManage && watcher.schedule && (
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/jobs/${encodeURIComponent(watcher.key)}`}>Monitoring schedule</Link>
          </Button>
        )}
        {watcher.available && (
          <Button size="sm" variant="ghost" asChild>
            <Link href="/settings?tab=notifications">
              <Bell />
              Configure alerts
            </Link>
          </Button>
        )}
        {!watching && (
          <p className="basis-full text-xs text-muted-foreground">
            Check now refreshes the snapshot only; it does not record incidents or send alerts.
          </p>
        )}
      </div>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 border-t border-danger-border bg-danger-bg px-5 py-3 text-xs text-danger"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
