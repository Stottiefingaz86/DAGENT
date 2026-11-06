"use client";
import { createElement, useEffect, useState, type CSSProperties } from "react";

export default function SiteLoader({ width = 320, duration = 2400, src = "/site-loader.js", className }: { width?: number; duration?: number; src?: string; className?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!customElements.get("site-loader") && !document.querySelector("script[data-site-loader]")) {
      const script = document.createElement("script");
      script.src = src;
      script.dataset.siteLoader = "true";
      script.onerror = () => { script.remove(); console.error("BetOnline loader script could not be loaded:", src); };
      document.head.appendChild(script);
    }
    customElements.whenDefined("site-loader").then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [src]);
  const style = { "--loader-width": `${width}px`, width, maxWidth: "100%", aspectRatio: "173 / 70" } as CSSProperties;
  return <div className={className} style={style} role="status" aria-label="Loading">
    {ready ? createElement("site-loader", { key: duration, duration: String(duration), "aria-hidden": "true" }) : null}
  </div>;
}
