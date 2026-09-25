"use client";

import { Icon as UiIcon, type IconName } from "@repo/ui/icons";

import React, { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TabDef<K extends string = string> {
  key: K;
  label: string;
  icon?: IconName;
  /** Live status or other leading content in place of a static icon. */
  leading?: React.ReactNode;
  /** Badge after the label — how many rows this tab holds. `0` still renders. */
  count?: number;
  /** When true the tab is not rendered (e.g. Backup only for stateful services). */
  hidden?: boolean;
  /**
   * Deep-link target. When set the tab renders as an <a> so the URL is
   * shareable and cmd/ctrl-click opens a new tab; a plain click is still
   * intercepted and handed to `onChange` for an instant client-side switch.
   * Without it the tab is a plain button (local view state).
   */
  href?: string;
}

interface TabsProps<K extends string> {
  tabs: TabDef<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
  size?: "sm" | "md";
  /** Distribute padded tabs evenly across the available width. */
  fullWidth?: boolean;
  /** Vertical tabs use filled rows and Up/Down keyboard navigation. */
  orientation?: "horizontal" | "vertical";
  /** Local tab panels use `${idPrefix}-panel-${key}` and are labelled by
   *  `${idPrefix}-tab-${key}`. Enables tab semantics and keyboard navigation. */
  idPrefix?: string;
  ariaLabel?: string;
}

/** Controlled tab navigation: an underline strip or a vertical list of filled rows. */
export function Tabs<K extends string>({
  tabs,
  value,
  onChange,
  className = "",
  size = "md",
  fullWidth = false,
  orientation = "horizontal",
  idPrefix,
  ariaLabel,
}: TabsProps<K>) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLElement | null>(null);
  const visibleTabs = tabs.filter((tab) => !tab.hidden);
  const localPanels = !!idPrefix && visibleTabs.every((tab) => !tab.href);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    const active = activeRef.current;
    if (!strip || !active) return;
    // Reveal the active tab inside its own scroll area without moving the page.
    const revealActive = () => {
      const bounds = strip.getBoundingClientRect();
      const tab = active.getBoundingClientRect();
      const delta = orientation === "vertical"
        ? tab.top < bounds.top ? tab.top - bounds.top
          : tab.bottom > bounds.bottom ? tab.bottom - bounds.bottom : 0
        : tab.left < bounds.left ? tab.left - bounds.left
          : tab.right > bounds.right ? tab.right - bounds.right : 0;
      if (delta) strip.scrollBy(orientation === "vertical" ? { top: delta } : { left: delta });
    };
    revealActive();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(revealActive);
    observer.observe(strip);
    observer.observe(active);
    return () => observer.disconnect();
  }, [value, size, fullWidth, orientation, visibleTabs.length]);

  const captureActive = (element: HTMLElement | null) => { activeRef.current = element; };
  const navigate = (event: React.KeyboardEvent<HTMLButtonElement>, key: K) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const index = visibleTabs.findIndex((tab) => tab.key === key);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    let next: number;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = visibleTabs.length - 1;
    else if (orientation === "vertical" && event.key === "ArrowDown") next = index + 1;
    else if (orientation === "vertical" && event.key === "ArrowUp") next = index - 1;
    else if (orientation === "horizontal" && event.key === "ArrowRight") next = index + (rtl ? -1 : 1);
    else if (orientation === "horizontal" && event.key === "ArrowLeft") next = index + (rtl ? 1 : -1);
    else return;
    event.preventDefault();
    const nextIndex = (next + visibleTabs.length) % visibleTabs.length;
    onChange(visibleTabs[nextIndex].key);
    stripRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

  return (
    <div
      ref={stripRef}
      role={localPanels ? "tablist" : undefined}
      aria-label={ariaLabel}
      aria-orientation={localPanels ? orientation : undefined}
      className={cn(
        "flex min-w-0 gap-1 scrollbar-hide",
        orientation === "vertical"
          ? "flex-col items-stretch overflow-y-auto"
          : "items-center overflow-x-auto border-b border-border/50",
        orientation === "horizontal" && fullWidth && "justify-between",
        className,
      )}
    >
      {visibleTabs.map(({ key, label, icon: Icon, leading, href, count }) => {
        const active = key === value;
        const className = cn(
          "relative inline-flex min-w-0 shrink-0 items-center gap-2 whitespace-nowrap py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40",
          size === "sm" ? "px-3 text-xs" : "px-4 text-sm",
          orientation === "vertical"
            ? ["rounded-xl text-start", active
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"]
            : ["font-medium", active
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/70"],
        );
        const inner = (
          <>
            {leading ?? (Icon && <UiIcon name={Icon} className="size-4" />)}
            {orientation === "vertical" ? <span className="min-w-0 flex-1 truncate">{label}</span> : label}
            {count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums ${
                  active ? "bg-muted text-foreground" : "bg-muted/60 text-muted-foreground"
                }`}
              >
                {count}
              </span>
            )}
            {active && orientation === "horizontal" && (
              // Align the underline with the label inside the tab's padding.
              <span className={`absolute bottom-0 h-0.5 rounded-full bg-primary ${size === "sm" ? "start-3 end-3" : "start-4 end-4"}`} />
            )}
          </>
        );
        return href ? (
          <a
            key={key}
            ref={active ? captureActive : undefined}
            href={href}
            title={orientation === "vertical" ? label : undefined}
            aria-current={active ? "page" : undefined}
            className={className}
            onClick={(e) => {
              // Let the browser handle modified clicks (new tab / window);
              // intercept a plain click for an instant client-side switch.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              onChange(key);
            }}
          >
            {inner}
          </a>
        ) : (
          <button
            key={key}
            ref={active ? captureActive : undefined}
            type="button"
            title={orientation === "vertical" ? label : undefined}
            role={localPanels ? "tab" : undefined}
            id={localPanels ? `${idPrefix}-tab-${key}` : undefined}
            aria-selected={localPanels ? active : undefined}
            aria-controls={localPanels ? `${idPrefix}-panel-${key}` : undefined}
            tabIndex={localPanels ? (active ? 0 : -1) : undefined}
            onKeyDown={localPanels ? (event) => navigate(event, key) : undefined}
            onClick={() => onChange(key)}
            className={className}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
