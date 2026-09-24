"use client";

import React, { useLayoutEffect, useRef } from "react";

export interface TabDef<K extends string = string> {
  key: K;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
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
  fullWidth?: boolean;
  /** Local tab panels use `${idPrefix}-panel-${key}` and are labelled by
   *  `${idPrefix}-tab-${key}`. Enables tab semantics and keyboard navigation. */
  idPrefix?: string;
  ariaLabel?: string;
}

/**
 * Underline tab strip — the shared version of the pattern hand-rolled across
 * billing, the servers detail page, and the project logs view (border-b strip,
 * `px-4 py-2.5` items, `bg-primary` active underline). Controlled: the caller
 * owns the active `value`.
 */
export function Tabs<K extends string>({
  tabs,
  value,
  onChange,
  className = "",
  size = "md",
  fullWidth = false,
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
    // Shortcuts can select a tab outside the visible strip. Scroll only this
    // row, preserving the page's vertical position, including in RTL layouts.
    const revealActive = () => {
      const bounds = strip.getBoundingClientRect();
      const tab = active.getBoundingClientRect();
      const delta = tab.left < bounds.left ? tab.left - bounds.left
        : tab.right > bounds.right ? tab.right - bounds.right : 0;
      if (delta) strip.scrollBy({ left: delta });
    };
    revealActive();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(revealActive);
    observer.observe(strip);
    observer.observe(active);
    return () => observer.disconnect();
  }, [value, size, fullWidth, visibleTabs.length]);

  const captureActive = (element: HTMLElement | null) => { activeRef.current = element; };
  const navigate = (event: React.KeyboardEvent<HTMLButtonElement>, key: K) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const index = visibleTabs.findIndex((tab) => tab.key === key);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    let next: number;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = visibleTabs.length - 1;
    else if (event.key === "ArrowRight") next = index + (rtl ? -1 : 1);
    else if (event.key === "ArrowLeft") next = index + (rtl ? 1 : -1);
    else return;
    event.preventDefault();
    const nextIndex = (next + visibleTabs.length) % visibleTabs.length;
    onChange(visibleTabs[nextIndex].key);
    stripRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

  return (
    <div ref={stripRef} role={localPanels ? "tablist" : undefined} aria-label={ariaLabel} className={`flex min-w-0 items-center gap-1 overflow-x-auto border-b border-border/50 scrollbar-hide ${className}`}>
      {visibleTabs.map(({ key, label, icon: Icon, leading, href, count }) => {
        const active = key === value;
        const className = `relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap py-2.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40 ${fullWidth ? "grow basis-0 justify-center" : ""} ${size === "sm" ? "px-3 text-[13px]" : "px-4 text-sm"} ${
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
        }`;
        const inner = (
          <>
            {leading ?? (Icon && <Icon className="size-4" />)}
            {label}
            {count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                  active ? "bg-muted text-foreground" : "bg-muted/60 text-muted-foreground"
                }`}
              >
                {count}
              </span>
            )}
            {active && (
              // Match the item's horizontal padding, so the underline is as
              // wide as the label it marks. That also puts the FIRST tab's
              // underline on the container's content edge instead of a padding
              // box's worth to the left of it — inside a card, an indicator that
              // starts left of every other left edge reads as a misalignment.
              <span className={`absolute bottom-0 h-0.5 rounded-full bg-primary ${size === "sm" ? "start-3 end-3" : "start-4 end-4"}`} />
            )}
          </>
        );
        return href ? (
          <a
            key={key}
            ref={active ? captureActive : undefined}
            href={href}
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
