"use client";

import { useEffect } from "react";

/**
 * Keeps `document.title` at `title` while mounted. Next.js re-applies the
 * route's metadata title asynchronously after client navigations (including
 * search-param changes), so a one-off assignment gets overwritten.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
    const observer = new MutationObserver(() => {
      if (document.title !== title) document.title = title;
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [title]);
}
