import { useEffect } from "react";

/**
 * Removes any lingering scroll-lock side effects (common after dialogs/overlays)
 * that can prevent scrolling on a page.
 */
export function useScrollUnlockOnMount() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Radix/other overlay libs sometimes lock scroll via attributes/styles.
    html.removeAttribute("data-scroll-locked");
    body.removeAttribute("data-scroll-locked");

    // Clear common style locks.
    html.style.overflow = "";
    body.style.overflow = "";
    body.style.pointerEvents = "";
    body.style.position = "";
    body.style.width = "";

    // Also remove any leftover inline overflow hidden.
    if (getComputedStyle(body).overflow === "hidden") {
      body.style.overflow = "";
    }
  }, []);
}
