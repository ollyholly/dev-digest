import React from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Minimal dialog accessibility behavior shared by Modal and Drawer:
 *  - Escape closes it.
 *  - Focus moves into the dialog on open (first focusable element, or the
 *    panel itself as a fallback) and returns to whatever triggered it on
 *    close.
 *  - Tab/Shift+Tab wrap within the dialog instead of escaping into the page
 *    behind the overlay.
 *  - `titleId`/`subtitleId` for `aria-labelledby`/`aria-describedby`, since a
 *    plain `role="dialog"` has no accessible name otherwise.
 */
export function useDialog(onClose?: () => void) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const subtitleId = React.useId();
  // Read the latest onClose without making it an effect dependency — an
  // inline `() => setOpen(false)` prop would otherwise re-run (and re-steal)
  // focus capture on every render.
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? panel)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const firstEl = focusable[0]!;
      const lastEl = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, []);

  return { panelRef, titleId, subtitleId };
}
