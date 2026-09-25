"use client";

import { Icon as UiIcon } from "@repo/ui/icons";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const ProjectTopology = dynamic(() => import("./ProjectTopology"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"
      role="status"
    >
      <UiIcon name="topology" className="size-5" />
      Loading project topology…
    </div>
  ),
});

export function ProjectTopologyPage(props: {
  environmentControl: ReactNode;
  onPendingChange: (pending: boolean) => void;
}) {
  // Keep the tab's height while its existing canvas expands over the page.
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <ProjectTopology {...props} />
    </div>
  );
}
