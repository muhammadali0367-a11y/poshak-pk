"use client";
import { useState, useEffect } from "react";

export default function PWAInstallPrompt() {
  const [show, setShow]           = useState(false);
  const [isIOS, setIsIOS]         = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if already installed or dismissed
    const dismissed = localStorage.getItem("poshak_pwa_dismissed");
    const installed = window.matchMedia("(display-mode: standalone)").matches;
    if (dismissed || installed) return;

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      // Show iOS prompt on first visit
      setShow(true);
      return;
    }

    // Android/Chrome — listen for beforeinstallprompt
    const handler = e => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
        localStorage.setItem("poshak_pwa_dismissed", "1");
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("poshak_pwa_dismissed", "1");
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "calc(100% - 32px)",
      maxWidth: "420px",
      background: "#000000",
      padding: "16px 20px",
      zIndex: 9999,
      border: "2px solid #dfdfdf",
      display: "flex",
      alignItems: "center",
      gap: "14px",
    }}>
      {/* Icon */}
      <img
        src="/icons/icon-72x72.png"
        alt="Poshak"
        style={{ width: "48px", height: "48px", flexShrink: 0 }}
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "1rem",
          color: "#ffffff",
          fontWeight: 400,
          marginBottom: "3px"
        }}>
          Add Poshak to Home Screen
        </div>
        <div style={{
          fontSize: ".72rem",
          color: "#757575",
          letterSpacing: ".02em",
          lineHeight: 1.4
        }}>
          {isIOS
            ? "Tap the Share button, then \"Add to Home Screen\""
            : "Install for faster access to 25,000+ Pakistani fashion products"
          }
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
        {!isIOS && (
          <button
            onClick={handleInstall}
            style={{
              background: "#ffffff",
              color: "#000000",
              border: "none",
              padding: "7px 14px",
              fontSize: ".72rem",
              fontWeight: 400,
              cursor: "pointer",
              fontFamily: "'Jost','DM Sans', sans-serif",
              letterSpacing: ".06em",
              whiteSpace: "nowrap",
            }}>
            Install
          </button>
        )}
        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            color: "#757575",
            border: "none",
            padding: "4px 8px",
            fontSize: ".68rem",
            cursor: "pointer",
            fontFamily: "'Jost','DM Sans', sans-serif",
            textAlign: "center",
          }}>
          {isIOS ? "Got it" : "Not now"}
        </button>
      </div>
    </div>
  );
}
