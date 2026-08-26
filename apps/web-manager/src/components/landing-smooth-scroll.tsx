"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { useEffect } from "react";
import "lenis/dist/lenis.css";

const NAV_OFFSET = -88;

function LandingHashScroll(): null {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) {
      return;
    }

    const smooth = lenis;

    function onClick(event: MouseEvent): void {
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }

      if (!url.hash || url.hash === "#") {
        return;
      }

      // Same-page hash only (/, /#features, #features)
      const onLanding = window.location.pathname === "/";
      if (url.pathname !== "/" || !onLanding) {
        return;
      }

      const target = document.querySelector(url.hash);
      if (!(target instanceof HTMLElement)) {
        return;
      }

      event.preventDefault();
      smooth.scrollTo(target, { offset: NAV_OFFSET });
      window.history.pushState(null, "", url.pathname + url.hash);
    }

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
    };
  }, [lenis]);

  useEffect(() => {
    if (!lenis || typeof window === "undefined") {
      return;
    }

    const { hash } = window.location;
    if (!hash) {
      return;
    }

    const target = document.querySelector(hash);
    if (!(target instanceof HTMLElement)) {
      return;
    }

    // Land on deep-linked section after paint.
    requestAnimationFrame(() => {
      lenis.scrollTo(target, { offset: NAV_OFFSET, immediate: true });
    });
  }, [lenis]);

  return null;
}

/**
 * Lenis smooth scrolling for the public landing page only.
 */
export default function LandingSmoothScroll({
  children
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        anchors: { offset: NAV_OFFSET },
        duration: 1.15,
        lerp: 0.085,
        smoothWheel: true,
        syncTouch: false,
        respectReducedMotion: true,
        stopInertiaOnNavigate: true
      }}
    >
      <LandingHashScroll />
      {children}
    </ReactLenis>
  );
}
