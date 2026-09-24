"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, GitBranch, Loader2, TriangleAlert, XCircle } from "lucide-react";
import { useDeployment } from "@/context/DeploymentContext";
import { useI18n, interpolate } from "@/components/i18n-provider";
import { DeploymentActions } from "./DeploymentActions";

export function DeploymentHeader({ onRedeploy, serviceCount, decisionPending = false }: {
  onRedeploy: () => void | Promise<string | null>;
  serviceCount?: number;
  decisionPending?: boolean;
}) {
  const { config, state, deploymentStatus } = useDeployment();
  const { t } = useI18n();
  const copy = t.importProject.deploymentProcessing;
  const projectId = state.projectId || config.projectId;
  const hasWarning = deploymentStatus === "ready" && !!state.warningMessage;
  const working = deploymentStatus === "building" || deploymentStatus === "deploying";
  const status = decisionPending ? t.importProject.composeDeployment.title.actionRequired
    : deploymentStatus === "cancelled" ? copy.status.cancelled
    : deploymentStatus === "failed" ? copy.status.failed
    : hasWarning ? copy.status.readyWarnings
    : deploymentStatus === "ready" ? copy.status.ready
    : t.importProject.serviceStatus[deploymentStatus];
  const tone = decisionPending || hasWarning ? "bg-warning-bg text-warning"
    : deploymentStatus === "failed" ? "bg-danger-bg text-danger"
    : deploymentStatus === "ready" ? "bg-success-bg text-success"
    : working ? "bg-info-bg text-info" : "bg-muted text-muted-foreground";
  const StatusIcon = decisionPending || hasWarning ? TriangleAlert
    : working ? Loader2 : deploymentStatus === "ready" ? CheckCircle2 : XCircle;
  const source = config.owner && config.repo ? `${config.owner}/${config.repo}` : "";

  return (
    <header className="mb-6 space-y-4">
      <nav aria-label={t.dashboard.nav.deployments} className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <Link href={projectId ? `/projects/${projectId}/deployments` : "/deployments"} className="shrink-0 font-medium transition-colors hover:text-foreground">
          {t.dashboard.nav.deployments}
        </Link>
        <ChevronRight className="size-3.5 shrink-0 rtl:rotate-180" aria-hidden />
        <span aria-current="page" className="truncate font-mono text-xs" title={state.deploymentId ?? undefined}>{state.deploymentId}</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-foreground">
              {config.projectName || config.repo || t.projects.detail.projectFallback}
            </h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
              <StatusIcon className={`size-3.5 shrink-0 ${working ? "animate-spin" : ""}`} aria-hidden />
              {status}
            </span>
          </div>
          {(source || config.branch || serviceCount) ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {source && <span className="break-all">{source}</span>}
              {config.branch && <span className="inline-flex min-w-0 items-center gap-1.5"><GitBranch className="size-3.5 shrink-0" aria-hidden /><span className="break-all">{config.branch}</span></span>}
              {!!serviceCount && <span>{interpolate(serviceCount === 1 ? t.importProject.counts.serviceOne : t.importProject.counts.serviceOther, { count: String(serviceCount) })}</span>}
            </div>
          ) : null}
        </div>
        <DeploymentActions onRedeploy={onRedeploy} />
      </div>
    </header>
  );
}
