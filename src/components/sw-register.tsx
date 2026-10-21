"use client";
import { useEffect } from "react";

/** Registers the offline shell. Progressive: failures are silently ignored. */
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Offline support is progressive enhancement; never block startup. */
      });
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
