"use client";

import React, { memo } from "react";
import { Clock, Cloud, Container, Hammer, Server } from "lucide-react";
import { useDeployment } from "@/context/DeploymentContext";
import { composeServiceTally } from "@/context/deployment/types";
import { useBuildElapsedMs } from "@/context/deployment/useBuildElapsedMs";
import { useI18n, interpolate } from "@/components/i18n-provider";
import { describeBuildStrategy } from "../deploy-target-label";
import { DeployTargetValue } from "../DeployTargetValue";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Keep row identity stable while the build timer ticks, preserving text selection. */
const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
    <span className="min-w-0 text-end text-sm font-normal text-foreground">{children}</span>
  </div>
);

// ─── Component ───────────────────────────────────────────────────────────────

const ComposeSidebar: React.FC = () => {
  const { state, config } = useDeployment();
  const { t } = useI18n();
  const sb = t.importProject.composeSidebar;
  // One section, shared with the logs-panel chip that renders the same sentence.
  const tally = t.importProject.composeServiceTally;

  // ── Build timer ──────────────────────────────────────────────────────
  const elapsedMs = useBuildElapsedMs(state);

  // ── Service counts ───────────────────────────────────────────────────
  // `built` (image done, container not up yet) is counted because during the build
  // phase the line otherwise reads "0/5 running" and never moves while four images
  // are already done — true, and useless. Shared with the logs-panel chip so the
  // two can't disagree about the same array.
  const services = state.serviceStatuses;
  const total = services.length;
  const { running, built, building, failed } = composeServiceTally(services);

  const TargetIcon = config.deployTarget === "cloud" ? Cloud : Server;

  return (
    <div className="rounded-2xl bg-card p-5">
      <h3 className="mb-4 text-sm font-normal text-foreground">{sb.detailsTitle}</h3>
      <div className="space-y-3">
        {/* WHERE it lands. Absent until now, which made this panel the only deploy
            screen that couldn't answer "which machine am I deploying to". */}
        <Row label={sb.rowTarget}>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <TargetIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <DeployTargetValue config={config} className="truncate" />
          </span>
        </Row>

        {/* WHERE it builds — a different question from the target (a server deploy
            can still build locally), and the one that explains a slow deploy. */}
        <Row label={sb.rowBuild}>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Hammer className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{describeBuildStrategy(config, t)}</span>
          </span>
        </Row>

        <Row label={sb.rowBuildTime}>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            {elapsedMs === null ? "—" : formatTime(Math.round(elapsedMs / 1000))}
          </span>
        </Row>

        {total > 0 && (
          <Row label={sb.rowServices}>
            {/* Allowed to wrap. With three counters this line is long in every
                locale wordier than English, and the FAILED count is last — a
                nowrap value ellipsised the one number that matters most off the
                end, so a failing deploy showed no failure here at all. */}
            <span className="inline-block">
              {running}/{total} {tally.running}
              {built > 0 && (
                <span className="ms-1">
                  {interpolate(tally.builtSuffix, { count: String(built) })}
                </span>
              )}
              {building > 0 && (
                <span className="ms-1">
                  {interpolate(tally.buildingSuffix, { count: String(building) })}
                </span>
              )}
              {failed > 0 && (
                <span className="text-danger ms-1">
                  {interpolate(tally.failedSuffix, { count: String(failed) })}
                </span>
              )}
            </span>
          </Row>
        )}

        <Row label={sb.rowType}>
          <span className="inline-flex items-center gap-1.5">
            <Container className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            Compose
          </span>
        </Row>
      </div>
    </div>
  );
};

export default memo(ComposeSidebar);
