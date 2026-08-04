import React from "react";
import { popoverPosition } from "./helpers";

export interface PopoverPos {
  top: number;
  left: number;
  flipUp: boolean;
}

/**
 * Delayed hover/focus open-close state + fixed-position placement for
 * FindingsHoverCard. Owns: the open timers (open on hover/focus after a
 * delay, close on a short debounce so moving into the card doesn't flicker
 * it closed), Escape-to-close, and reposition-on-scroll/resize while open.
 */
export function useHoverCard(onOpenChange?: (open: boolean) => void) {
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<PopoverPos | null>(null);
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = React.useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const place = React.useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(
      popoverPosition(
        { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right, width: rect.width },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, []);

  const setOpenState = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
      if (next) place();
    },
    [onOpenChange, place],
  );

  const scheduleOpen = React.useCallback(
    (delayMs: number) => {
      clearTimers();
      openTimer.current = setTimeout(() => setOpenState(true), delayMs);
    },
    [clearTimers, setOpenState],
  );

  const scheduleClose = React.useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpenState(false), 120);
  }, [clearTimers, setOpenState]);

  React.useEffect(() => () => clearTimers(), [clearTimers]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenState(false);
    };
    const onScroll = () => place();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, place, setOpenState]);

  return { anchorRef, open, pos, setOpenState, scheduleOpen, scheduleClose };
}
