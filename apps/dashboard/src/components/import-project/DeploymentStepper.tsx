"use client";

import { Icon as UiIcon } from "@repo/ui/icons";
import { useDeployment } from "@/context/DeploymentContext";
import { useI18n } from "@/components/i18n-provider";

/** The icon-led progress track, with a cutout around each phase marker. */
export function DeploymentStepper() {
  const { steps, state, deploymentStatus } = useDeployment();
  const { t } = useI18n();
  const copy = t.importProject.deploymentProcessing;
  const finished = ["ready", "failed", "cancelled"].includes(deploymentStatus);

  return (
    <ol aria-label={copy.title.deploying} className="flex flex-col gap-4 rounded-2xl bg-card p-5">
      {steps.map((step, index) => {
        const atCurrent = index === state.currentStepIndex;
        const completed = deploymentStatus === "ready" || index < state.currentStepIndex;
        const active = atCurrent && !finished;
        const failed = atCurrent && deploymentStatus === "failed";
        const cancelled = atCurrent && deploymentStatus === "cancelled";
        const tone = completed
          ? "bg-primary text-primary-foreground"
          : failed
            ? "bg-destructive text-destructive-foreground"
            : active
              ? "bg-foreground text-background"
              : "border border-border bg-[var(--th-card-on-page)] text-muted-foreground";
        const statusLabel = completed
          ? copy.status.ready
          : failed
            ? copy.status.failed
            : cancelled
              ? copy.status.cancelled
              : active
                ? copy.title.deploying
                : t.importProject.serviceStatus.pending;

        return (
          <li
            key={index}
            aria-current={active || failed || cancelled ? "step" : undefined}
            aria-label={`${step.label}: ${statusLabel}`}
            className="relative flex min-w-0 items-center gap-3"
          >
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute start-4 top-4 h-[calc(100%+1rem)] w-0.5 ${completed ? "bg-primary" : "bg-border/70"}`}
              />
            )}
            {/* An opaque ring cuts the track away from the icon in every theme. */}
            <span
              aria-hidden="true"
              className={`relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-[var(--th-card-on-page)] ${tone}`}
            >
              {completed ? (
                <UiIcon name="check" className="size-5" />
              ) : failed ? (
                <UiIcon name="close" className="size-5" />
              ) : cancelled ? (
                <UiIcon name="minus" className="size-5" />
              ) : active ? (
                <UiIcon name="spinner" className="size-5 motion-safe:animate-spin" />
              ) : (
                <UiIcon name={step.icon} className="size-4.5" />
              )}
            </span>
            <span
              className={`min-w-0 break-words text-sm ${failed ? "text-danger" : active ? "font-medium text-foreground" : completed ? "text-foreground" : "text-muted-foreground"}`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
