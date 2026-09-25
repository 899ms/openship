"use client";

import { Icon as UiIcon } from "@repo/ui/icons";

import React, { useEffect, useRef } from "react";
import { useBackupRunStream } from "@/hooks/useBackupRunStream";
import { useI18n } from "@/components/i18n-provider";
import type { BackupRun } from "@/lib/api";
import { BackupStreamNotice } from "./BackupStreamNotice";

type RunCardDict = ReturnType<typeof useI18n>["t"]["widgets"]["backup"]["runCard"];

interface Props {
  runId: string;
  /** Optional snapshot — when provided, we render immediately and let
   *  the stream upgrade in place. Avoids a "loading…" flash for
   *  already-known runs. */
  initial?: BackupRun;
  onClose?: () => void;
  onComplete?: () => void | Promise<void>;
}

export function BackupRunCard({ runId, initial, onComplete }: Props): React.JSX.Element {
  const stream = useBackupRunStream(runId);
  const { run: streamed, connected } = stream;
  const { t } = useI18n();
  const w = t.widgets.backup.runCard;
  const run = streamed ?? initial ?? null;
  const completedRun = useRef<string | null>(null);

  useEffect(() => {
    if (!streamed || streamed.id !== runId || completedRun.current === runId) return;
    if (!["succeeded", "failed", "cancelled", "server_error"].includes(streamed.status)) return;
    completedRun.current = runId;
    void onComplete?.();
  }, [streamed, runId, onComplete]);

  if (!run) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-4 text-sm text-muted-foreground">
        {w.loading}
        <BackupStreamNotice stream={stream} />
      </div>
    );
  }

  const inFlight = !["succeeded", "failed", "cancelled", "server_error"].includes(run.status);
  const StatusIcon = run.status === "succeeded"
    ? "check-circle"
    : ["failed", "server_error", "cancelled"].includes(run.status)
      ? "x-circle"
      : "spinner";
  const color =
    run.status === "succeeded"
      ? "text-success"
      : ["failed", "server_error", "cancelled"].includes(run.status)
        ? "text-danger"
        : "text-info";

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UiIcon name={StatusIcon} className={`size-4 ${color} ${inFlight ? "animate-spin" : ""}`} />
          <span className={`text-sm font-medium ${color}`}>{labelFor(run.status, w)}</span>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
            {run.triggeredBy}
          </span>
        </div>
        {connected && inFlight && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <UiIcon name="activity" className="size-3 animate-pulse" />
            {w.live}
          </span>
        )}
      </div>

      <BackupStreamNotice stream={stream} />

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <Stat label={w.started} value={new Date(run.startedAt).toLocaleString()} />
        <Stat
          label={run.finishedAt ? w.finished : w.elapsed}
          value={
            run.finishedAt
              ? new Date(run.finishedAt).toLocaleString()
              : formatElapsed(new Date(run.startedAt).getTime())
          }
        />
        <Stat
          label={w.bytes}
          value={run.bytesTransferred ? formatBytes(run.bytesTransferred) : "—"}
        />
        <Stat label={w.runId} value={<code className="text-[10px]">{run.id.slice(0, 16)}…</code>} />
      </div>

      {run.errorMessage && (
        <p className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">
          {run.errorMessage}
        </p>
      )}

      {inFlight && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{phaseLabel(run.status, w)}</p>
        </div>
      )}
    </div>
  );
}

function labelFor(status: BackupRun["status"], w: RunCardDict): string {
  switch (status) {
    case "queued":
      return w.status.queued;
    case "preparing":
      return w.status.preparing;
    case "snapshotting":
      return w.status.snapshotting;
    case "uploading":
      return w.status.uploading;
    case "verifying":
      return w.status.verifying;
    case "succeeded":
      return w.status.succeeded;
    case "failed":
      return w.status.failed;
    case "cancelled":
      return w.status.cancelled;
    case "server_error":
      return w.status.serverError;
  }
}

function phaseLabel(status: BackupRun["status"], w: RunCardDict): string {
  switch (status) {
    case "queued":
      return w.phase.queued;
    case "preparing":
      return w.phase.preparing;
    case "snapshotting":
      return w.phase.snapshotting;
    case "uploading":
      return w.phase.uploading;
    case "verifying":
      return w.phase.verifying;
    default:
      return "";
  }
}

function Stat({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-foreground/90">{value}</p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatElapsed(startMs: number): string {
  const s = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}
