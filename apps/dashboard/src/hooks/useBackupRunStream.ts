/**
 * Subscribe to a backup run's live progress channel.
 *
 * The server's SSE handler sends a `snapshot` event with the full row
 * immediately on connect, then `transition` / `progress` / `complete`
 * events as the FSM advances. Survives reload because the DB row is
 * authoritative — server re-snapshots on reconnect.
 */

"use client";

import { useState } from "react";
import type { BackupRun } from "@/lib/api";
import { useRunEvents, type RunEventsState } from "./useRunEvents";

export type BackupRunEvent =
  | {
      type: "snapshot";
      run: BackupRun;
    }
  | {
      type: "transition";
      status: BackupRun["status"];
      bytesTransferred?: number;
      artifacts?: unknown[];
    }
  | {
      type: "progress";
      bytesTransferred: number;
      currentArtifact?: string;
    }
  | {
      type: "complete";
      status: "succeeded" | "failed" | "cancelled" | "server_error";
      errorMessage?: string | null;
    };

export interface UseBackupRunStreamResult extends RunEventsState {
  run: BackupRun | null;
}

export function useBackupRunStream(runId: string | null): UseBackupRunStreamResult {
  const [run, setRun] = useState<BackupRun | null>(null);
  const stream = useRunEvents<BackupRun>(
    runId ? `backup-runs/${encodeURIComponent(runId)}/stream` : null,
    (snapshot) => {
      if (snapshot.id !== runId) throw new Error("Backup progress belongs to another run");
      setRun(snapshot);
    },
    {
      onEvent(message) {
        const event = message as BackupRunEvent;
        setRun((previous) => {
          if (!previous || previous.id !== runId) return previous;
          if (event.type === "transition")
            return {
              ...previous,
              status: event.status,
              bytesTransferred: event.bytesTransferred ?? previous.bytesTransferred,
              artifacts: event.artifacts ?? previous.artifacts,
            };
          if (event.type === "progress")
            return { ...previous, bytesTransferred: event.bytesTransferred };
          if (event.type === "complete")
            return {
              ...previous,
              status: event.status,
              errorMessage: event.errorMessage ?? previous.errorMessage,
            };
          return previous;
        });
      },
    },
  );
  return { run: runId && run?.id === runId ? run : null, ...stream };
}
