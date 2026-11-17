"use client";

import React, { useEffect, useRef, useState } from "react";
import { StorefrontSectionData } from "@/lib/storefront";

interface CustomCodeSectionProps {
  section: StorefrontSectionData;
}

class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[CustomCodeSection] Component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
            <strong>Custom Section Error:</strong> {this.state.error?.message || "Failed to render custom component"}
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default function CustomCodeSection({ section }: CustomCodeSectionProps) {
  const { settings } = section;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const customHtml = (settings.customHtml as string) || (settings.bodyText as string) || "";
  const customCss = (settings.customCss as string) || "";
  const customJs = (settings.customJs as string) || "";
  const codeType = (settings.codeType as string) || "html_tailwind";
  const containerMaxWidth = (settings.containerMaxWidth as string) || "contained";

  // Background Tone
  const bgClass =
    settings.background === "surface"
      ? "bg-surface"
      : settings.background === "ink"
      ? "bg-ink text-white"
      : "bg-paper";

  // Spacing Density
  const padClass =
    settings.padding === "compact"
      ? "py-6 sm:py-8"
      : settings.padding === "spacious"
      ? "py-16 sm:py-24"
      : "py-10 sm:py-14";

  // Container width
  const containerWidthClass =
    containerMaxWidth === "full_bleed"
      ? "w-full px-0"
      : containerMaxWidth === "narrow"
      ? "max-w-4xl mx-auto px-4 sm:px-6"
      : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

  // Execute client-side JS / React widget safely if provided
  useEffect(() => {
    if (!customJs || !containerRef.current) return;
    setScriptError(null);

    const container = containerRef.current;
    let cleanupFn: (() => void) | void;

    try {
      // Create a scoped runner with access to container, React, and environment
      const runner = new Function(
        "container",
        "React",
        "section",
        `
        try {
          ${customJs}
        } catch (err) {
          console.error("[CustomCodeSection] Script execution error:", err);
          throw err;
        }
      `
      );

      const result = runner(container, React, section);
      if (typeof result === "function") {
        cleanupFn = result;
      }
    } catch (err: any) {
      setScriptError(err?.message || "Error running custom JavaScript");
    }

    return () => {
      if (typeof cleanupFn === "function") {
        try {
          cleanupFn();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [customJs, section]);

  // If completely empty in edit mode or initial state
  if (!customHtml && !customJs && !customCss && !settings.title) {
    return (
      <section
        className={`${bgClass} ${padClass} ${
          settings.showTopBorder ? "border-t border-line" : ""
        }`}
      >
        <div className={containerWidthClass}>
          <div className="rounded-xl border-2 border-dashed border-line p-8 text-center bg-surface/50">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-slate-100 flex items-center justify-center text-ink2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-ink">Custom HTML & Tailwind Section</h4>
            <p className="text-xs text-ink2 mt-1 max-w-md mx-auto">
              Add your custom HTML, Tailwind CSS classes, or client-side React component in the Storefront Studio inspector.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <SectionErrorBoundary>
      <section
        data-section-id={section.id}
        className={`${bgClass} ${padClass} ${
          settings.showTopBorder ? "border-t border-line" : ""
        }`}
        style={
          settings.customBgColor
            ? { backgroundColor: settings.customBgColor as string }
            : undefined
        }
      >
        {/* Scoped Custom CSS if provided */}
        {customCss ? (
          <style dangerouslySetInnerHTML={{ __html: customCss }} />
        ) : null}

        <div className={containerWidthClass}>
          {/* Optional Section Heading if merchant specified title */}
          {settings.title ? (
            <div className={`mb-6 ${settings.alignment === "center" ? "text-center" : "text-left"}`}>
              {settings.eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-wider text-ink2 mb-1">
                  {settings.eyebrow}
                </p>
              ) : null}
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-heading">
                {settings.title}
              </h2>
              {settings.subtitle ? (
                <p className="text-sm text-ink2 mt-1.5 max-w-2xl">{settings.subtitle}</p>
              ) : null}
            </div>
          ) : null}

          {/* Script Execution Error Banner */}
          {scriptError ? (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
              <strong>Custom Code Execution Notice:</strong> {scriptError}
            </div>
          ) : null}

          {/* Custom HTML & Tailwind Container */}
          <div
            ref={containerRef}
            className="custom-section-content"
            dangerouslySetInnerHTML={customHtml ? { __html: customHtml } : undefined}
          />
        </div>
      </section>
    </SectionErrorBoundary>
  );
}

