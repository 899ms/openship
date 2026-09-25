"use client";

import { Icon as UiIcon, type IconName } from "@repo/ui/icons";

import React, { useEffect, useCallback, memo } from "react";
import type { Terminal } from "@xterm/xterm";
import BuildTerminal from "./BuildTerminal";
import { DeploymentHeader } from "./DeploymentHeader";
import { DeploymentLogsPanel } from "./DeploymentLogsPanel";
import { PageContainer } from "@/components/ui/PageContainer";
import { getDeploymentSites } from "./deployment-sites";
import { PortAdvisoryModal } from "./PortAdvisoryModal";
import { PromptDetails } from "./PromptDetails";
import { describeBuildStrategy } from "./deploy-target-label";
import { DeployTargetValue } from "./DeployTargetValue";
import { useDeployment } from "@/context/DeploymentContext";
import { useBuildElapsedMs } from "@/context/deployment/useBuildElapsedMs";
import { usePlatform } from "@/context/PlatformContext";
import { useTheme } from "@/components/theme-provider";
import { useModal } from "@/context/ModalContext";
import { useI18n } from "@/components/i18n-provider";

interface DeploymentProcessingProps {
  // Resolves to the new deployment id (navigates on success) or null on failure.
  onRedeploy: () => void | Promise<string | null>;
}

/** Compact duration label: "8s", "1m 02s". */
function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

/** The deployment metadata follows the project's compact label/value layout. */
function DetailRow({ icon: Icon, label, value }: {
  icon: IconName;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="inline-flex shrink-0 items-center gap-2 text-muted-foreground"><UiIcon name={Icon} className="size-3.5" />{label}</span>
      <span className="min-w-0 break-words text-end text-foreground">{value}</span>
    </div>
  );
}

const DeploymentProcessing: React.FC<DeploymentProcessingProps> = ({ onRedeploy }) => {
  const { config, state, terminalRef, onTerminalReady, respondToPrompt, steps, deploymentStatus } = useDeployment();
  const { resolvedTheme } = useTheme();
  const { showModal, hideModal } = useModal();
  const { t } = useI18n();
  const dp = t.importProject.deploymentProcessing;
  const promptModalRef = React.useRef<string | null>(null);
  // ── Pipeline prompt modal (port conflict / edge takeover) ──────────────
  useEffect(() => {
    if (!state.pendingPrompt) return;
    const { promptId, title, message, actions, details } = state.pendingPrompt;
    if (promptModalRef.current === promptId) return;
    promptModalRef.current = promptId;

    const modalId = showModal({
      title,
      icon: "warning",
      customContent: (
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>

          <PromptDetails details={details} />

          <div className="flex items-center justify-end gap-3 pt-2">
            {actions.map((action) => {
              const variant = (action.variant || "secondary") as "secondary" | "danger" | "primary";
              const styles = variant === "danger"
                ? "bg-danger-solid text-white hover:bg-danger-solid/90"
                : variant === "primary"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border bg-muted text-foreground hover:bg-muted/80";

              return (
                <button
                  key={action.id}
                  type="button"
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${styles}`}
                  onClick={() => {
                    hideModal(modalId);
                    respondToPrompt(action.id);
                  }}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      ),
      width: "560px",
      maxWidth: "92vw",
    });
  }, [state.pendingPrompt, showModal, hideModal, respondToPrompt]);

  const handleTerminalReady = useCallback((terminal: Terminal) => {
    if (terminalRef) {
      terminalRef.current = terminal;
    }
    onTerminalReady();
  }, [terminalRef, onTerminalReady]);

  const hasWarning = deploymentStatus === "ready" && !!state.warningMessage;

  return (
    <PageContainer>
      <DeploymentHeader onRedeploy={onRedeploy} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main Content */}
          <div className="min-w-0 space-y-5">
            {hasWarning && (
              <div className="rounded-2xl border border-warning-border bg-warning-bg px-4 py-3">
                <p className="text-sm font-medium text-warning">
                  {dp.warningTitle}
                </p>
                <p className="mt-1 text-sm text-warning/80">
                  {state.warningMessage}
                </p>
              </div>
            )}

            {deploymentStatus === "ready" && (
              <PortAdvisoryModal
                deploymentId={state.deploymentId}
                projectId={state.projectId ?? config.projectId}
                checks={state.portCheck}
                skipped={state.portCheckSkipped}
                isCompose={false}
                publicEndpoints={config.publicEndpoints}
              />
            )}

            <ol aria-label={dp.title.deploying} className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-card p-5">
              {steps.map((step, index) => {
                const completed = index < state.currentStepIndex || (state.deploymentSuccess && index === steps.length - 1);
                const current = index === state.currentStepIndex && !state.deploymentSuccess && !state.deploymentFailed && !state.deploymentCanceled;
                const failed = (state.deploymentFailed || state.deploymentCanceled) && index === state.currentStepIndex;
                const tone = failed ? "bg-danger-bg text-danger" : completed ? "bg-success-bg text-success" : current ? "bg-info-bg text-info" : "bg-muted text-muted-foreground";
                return (
                  <li key={index} aria-current={current ? "step" : undefined} className="flex items-center gap-2 text-sm">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone}`} aria-hidden>
                      {failed ? <UiIcon name="x-circle" className="size-4" /> : completed ? <UiIcon name="check-circle" className="size-4" /> : current ? <UiIcon name="spinner" className="size-4 animate-spin" /> : <span className="text-xs tabular-nums">{index + 1}</span>}
                    </span>
                    <span className={failed ? "text-danger" : completed || current ? "font-medium text-foreground" : "text-muted-foreground"}>{step.label}</span>
                  </li>
                );
              })}
            </ol>
            <DeploymentLogsPanel title={t.importProject.composeDeployment.logsTitle} summary={deploymentStatus === "failed" && <span className="text-xs text-muted-foreground">{dp.seeLogs}</span>}>
              <BuildTerminal onReady={handleTerminalReady} theme={resolvedTheme === "light" ? "light" : "dark"} />
            </DeploymentLogsPanel>
          </div>

          <div className="h-fit min-w-0 xl:sticky xl:top-6">
            <DeploymentDetails />
          </div>
      </div>
    </PageContainer>
  );
};

/** Live build timer, replaced by the recorded duration at completion. Isolated so the 1s
 *  tick re-renders only this label, not the whole page. */
const BuildTimeLabel = memo(() => {
  const { state } = useDeployment();
  const elapsedMs = useBuildElapsedMs(state);
  return <>{elapsedMs === null ? "—" : formatDurationMs(elapsedMs)}</>;
});
BuildTimeLabel.displayName = "BuildTimeLabel";

const DeploymentDetails = memo(() => {
  const { state, config } = useDeployment();
  const { baseDomain } = usePlatform();
  const { t } = useI18n();
  const dp = t.importProject.deploymentProcessing;
  const sites = getDeploymentSites(config, state.serviceStatuses, baseDomain);
  const domain = sites[0]?.hostname ?? "";
  const extraEndpointCount = Math.max(0, sites.length - 1);
  const InstanceIcon = config.deployTarget === "cloud" ? "cloud" : "server";
  const domainValue = domain
    ? `${domain}${extraEndpointCount > 0 ? ` +${extraEndpointCount}` : ""}`
    : "—";

  return (
    <div className="rounded-2xl bg-card p-5">
      <h3 className="mb-4 text-sm font-normal text-foreground">{dp.detailsTitle}</h3>
      <div className="space-y-4">
        <DetailRow icon={InstanceIcon} label={dp.detailInstance} value={<DeployTargetValue config={config} />} />
        <DetailRow icon={"wrench"} label={dp.detailBuild} value={describeBuildStrategy(config, t)} />
        <DetailRow icon={"clock"} label={dp.detailBuildTime} value={<BuildTimeLabel />} />
        <DetailRow icon={"layers"} label={dp.detailFramework} value={config.framework} />
        <DetailRow icon={"globe"} label={extraEndpointCount > 0 ? dp.detailDomains : dp.detailDomain} value={domainValue} />
      </div>
    </div>
  );
});

DeploymentDetails.displayName = "DeploymentDetails";

export default DeploymentProcessing;
