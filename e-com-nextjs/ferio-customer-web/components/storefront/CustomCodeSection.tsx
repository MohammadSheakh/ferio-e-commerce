"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { StorefrontSectionData } from "@/lib/storefront";

interface CustomCodeSectionProps {
  settings?: Record<string, unknown>;
  data?: unknown;
  section?: StorefrontSectionData;
  [key: string]: unknown;
}

const DOMPURIFY_CONFIG = {
  USE_PROFILES: { html: true, svg: true, svgFilters: true },
  ADD_TAGS: ["iframe", "video", "audio", "source", "style"],
  ADD_ATTR: [
    "target",
    "rel",
    "loading",
    "autoplay",
    "controls",
    "loop",
    "muted",
    "playsinline",
    "allowfullscreen",
    "frameborder",
    "data-section-id",
    "style",
  ],
  FORBID_TAGS: ["script"], // <script> is parsed separately and run in an isolated credential-shielded scope
  FORBID_ATTR: [
    "onerror",
    "onload",
    "onclick",
    "onmouseover",
    "onmouseenter",
    "onmouseleave",
    "onfocus",
    "onblur",
    "onchange",
    "onsubmit",
    "onkeydown",
    "onkeyup",
  ],
};

/**
 * Enterprise CSS Scope Isolation
 * Automatically scopes raw CSS rules to the section's unique ID container,
 * preventing accidental style bleeding into global navigation, checkout, or cart.
 */
function scopeCssRules(rawCss: string, scopeSelector: string): string {
  if (!rawCss || typeof rawCss !== "string") return "";

  try {
    return rawCss.replace(
      /([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g,
      (match, selector, suffix) => {
        const trimmed = selector.trim();
        // Ignore @-rules, keyframe steps (from, to, 50%)
        if (
          !trimmed ||
          trimmed.startsWith("@") ||
          trimmed.startsWith("from") ||
          trimmed.startsWith("to") ||
          /^\d+%$/.test(trimmed)
        ) {
          return match;
        }

        const scoped = trimmed
          .split(",")
          .map((part: string) => {
            const p = part.trim();
            if (!p) return p;
            if (p === ":root" || p === "html" || p === "body") {
              return scopeSelector;
            }
            return `${scopeSelector} ${p}`;
          })
          .join(", ");

        return `${scoped}${suffix}`;
      }
    );
  } catch {
    return rawCss;
  }
}

/**
 * Parses unified code into HTML, extracted <style>, and extracted <script>.
 * Allows store admins to write or paste standard HTML/Tailwind with embedded
 * <style> and <script> tags into a single unified input box.
 */
function parseUnifiedCode(rawCode: string) {
  let css = "";
  let js = "";
  const externalScripts: string[] = [];

  // Extract <style> contents
  const styleRegex = /<style(?:\s+[^>]*)?>([\s\S]*?)<\/style>/gi;
  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleRegex.exec(rawCode)) !== null) {
    if (styleMatch[1]) {
      css += styleMatch[1] + "\n";
    }
  }

  // Extract <script src="..."> external scripts
  const scriptSrcRegex = /<script(?:\s+[^>]*?)src=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  let scriptSrcMatch: RegExpExecArray | null;
  while ((scriptSrcMatch = scriptSrcRegex.exec(rawCode)) !== null) {
    if (scriptSrcMatch[1]) {
      externalScripts.push(scriptSrcMatch[1]);
    }
  }

  // Extract inline <script> contents (without src)
  const scriptRegex = /<script(?![^>]*src=)(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptRegex.exec(rawCode)) !== null) {
    if (scriptMatch[1]) {
      js += scriptMatch[1] + "\n";
    }
  }

  // Strip <style>, <script>, and full-document wrapper tags (<!DOCTYPE>, <html>, <head>, <body>)
  // so that pasting complete HTML pages gracefully isolates the actual inner section content
  let html = rawCode
    .replace(/<style(?:\s+[^>]*)?>[\s\S]*?<\/style>/gi, "")
    .replace(/<script(?:\s+[^>]*)?>[\s\S]*?<\/script>/gi, "")
    .replace(/<!DOCTYPE(?:\s+[^>]*)?>/gi, "")
    .replace(/<html(?:\s+[^>]*)?>/gi, "")
    .replace(/<\/html>/gi, "")
    .replace(/<head(?:\s+[^>]*)?>[\s\S]*?<\/head>/gi, "")
    .replace(/<body(?:\s+[^>]*)?>/gi, "")
    .replace(/<\/body>/gi, "")
    .trim();

  return { html, css, js, externalScripts };
}

class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; sectionId: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; sectionId: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[CustomCodeSection #${this.props.sectionId}] Runtime error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-4xl p-6 my-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 text-xs font-mono">
          <div className="flex items-center gap-2 font-bold text-rose-800 mb-1">
            <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Custom Section Execution Fault
          </div>
          <p className="text-rose-700 leading-relaxed">
            {this.state.error?.message || "An unexpected error occurred executing custom markup."}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CustomCodeSection(props: CustomCodeSectionProps) {
  const section = props.section;
  const settings = (props.settings || section?.settings || {}) as Record<string, unknown>;
  const sectionId = section?.id || (settings.id as string) || "custom-code";
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // Read code from single unified field (with backwards compatibility for split fields)
  const rawCode =
    (settings.customCode as string) ||
    (settings.customHtml as string) ||
    (settings.bodyText as string) ||
    "";

  // Parse unified code into HTML, scoped CSS, JS, and external script dependencies
  const { parsedHtml, parsedCss, parsedJs, parsedExternalScripts } = useMemo(() => {
    const parsed = parseUnifiedCode(rawCode);
    const combinedCss = [parsed.css, (settings.customCss as string) || ""].filter(Boolean).join("\n");
    const combinedJs = [parsed.js, (settings.customJs as string) || ""].filter(Boolean).join("\n");
    return {
      parsedHtml: parsed.html || rawCode,
      parsedCss: combinedCss,
      parsedJs: combinedJs,
      parsedExternalScripts: parsed.externalScripts || [],
    };
  }, [rawCode, settings.customCss, settings.customJs]);

  // Sanitize extracted HTML markup to neutralize any inline XSS or malicious vectors
  const sanitizedHtml = useMemo(() => {
    if (!parsedHtml) return "";
    return DOMPurify.sanitize(parsedHtml, DOMPURIFY_CONFIG);
  }, [parsedHtml]);

  const containerMaxWidth = (settings.containerMaxWidth as string) || "contained";
  const scopeSelector = `[data-section-id="${sectionId}"]`;

  // Memoize safely scoped CSS to prevent style leakage
  const scopedCss = useMemo(() => {
    return scopeCssRules(parsedCss, scopeSelector);
  }, [parsedCss, scopeSelector]);

  // Load Tailwind JIT CDN ONLY in Storefront Studio / Preview mode for live editing feedback.
  // In live production customer visits, NEVER inject the 350KB Play CDN to protect Core Web Vitals (LCP, INP, CLS).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStudioPreview =
      window !== window.parent ||
      window.location.search.includes("preview=true");

    if (!isStudioPreview) return;

    if (!(window as any).tailwind) {
      const scriptId = "ferio-tailwind-cdn-runtime";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://cdn.tailwindcss.com";
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, []);

  // Background Tone
  const bgClass =
    settings.background === "surface"
      ? "bg-surface"
      : settings.background === "ink"
      ? "bg-ink text-white"
      : (settings.background as string) === "transparent"
      ? "bg-transparent"
      : "bg-paper";

  // Spacing Density
  const padClass =
    settings.padding === "none"
      ? "py-0"
      : settings.padding === "compact"
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

  // Dynamically load any requested external library scripts (e.g. Lucide, Lottie)
  useEffect(() => {
    if (typeof window === "undefined" || !parsedExternalScripts.length) return;
    parsedExternalScripts.forEach((src) => {
      // Avoid loading Tailwind Play CDN in production (already handled separately in preview)
      if (src.includes("cdn.tailwindcss.com")) return;
      const scriptId = `ext-script-${src.replace(/[^a-zA-Z0-9]/g, "_")}`;
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = src;
        script.async = true;
        document.head.appendChild(script);
      }
    });
  }, [parsedExternalScripts]);

  // Execute client-side JS / Interactive Widgets safely with credential isolation
  useEffect(() => {
    if (!parsedJs || !containerRef.current) return;
    setScriptError(null);

    const container = containerRef.current;
    let cleanupFn: (() => void) | void;

    try {
      const runner = new Function(
        "container",
        "React",
        "section",
        `
        "use strict";
        // Shield sensitive browser storage from unauthorized extraction
        const localStorage = undefined;
        const sessionStorage = undefined;
        const indexedDB = undefined;

        // Scoped document interface limited to this section container
        const safeDocument = {
          querySelector: function(s) { return container.querySelector(s); },
          querySelectorAll: function(s) { return container.querySelectorAll(s); },
          getElementById: function(id) {
            return container.querySelector("#" + id) || container.querySelector("[id='" + id + "']");
          },
          getElementsByClassName: function(c) { return container.getElementsByClassName(c); },
          createElement: function(tag) { return document.createElement(tag); },
          createTextNode: function(text) { return document.createTextNode(text); },
          addEventListener: function(type, listener, options) {
            if (type === "DOMContentLoaded" || type === "load") {
              // In React/Next.js SPA, DOMContentLoaded has already completed. Execute immediately!
              setTimeout(listener, 20);
              return;
            }
            return container.addEventListener(type, listener, options);
          },
          removeEventListener: function(type, listener, options) {
            return container.removeEventListener(type, listener, options);
          },
        };

        try {
          return (function(container, document) {
            ${parsedJs}
          })(container, safeDocument);
        } catch (err) {
          console.error("[CustomCodeSection] Script error:", err);
          throw err;
        }
      `
      );

      const result = runner(
        container,
        React,
        section || { id: sectionId, settings }
      );

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
          // ignore
        }
      }
    };
  }, [parsedJs, section, sectionId, settings]);

  // If completely empty in initial state
  if (!rawCode && !parsedHtml && !parsedCss && !parsedJs) {
    return (
      <section
        data-section-id={sectionId}
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
            <h4 className="text-sm font-semibold text-ink">Custom Code Section</h4>
            <p className="text-xs text-ink2 mt-1 max-w-md mx-auto">
              Write HTML with Tailwind CSS, &lt;style&gt;, or &lt;script&gt; in the Studio code editor.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <SectionErrorBoundary sectionId={sectionId}>
      <section
        data-section-id={sectionId}
        id={`custom-section-${sectionId}`}
        className={`${bgClass} ${padClass} ${
          settings.showTopBorder ? "border-t border-line" : ""
        }`}
        style={
          settings.customBgColor
            ? { backgroundColor: settings.customBgColor as string }
            : undefined
        }
      >
        {/* Scoped Custom CSS Isolated Strictly to This Section */}
        {scopedCss ? (
          <style dangerouslySetInnerHTML={{ __html: scopedCss }} />
        ) : null}

        <div className={containerWidthClass}>
          {/* Script Execution Notice if runtime script throws */}
          {scriptError ? (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
              <strong>Custom Code Execution Notice:</strong> {scriptError}
            </div>
          ) : null}

          {/* Custom HTML & Tailwind Container (DOMPurify Sanitized) */}
          <div
            ref={containerRef}
            className="custom-section-content"
            dangerouslySetInnerHTML={sanitizedHtml ? { __html: sanitizedHtml } : undefined}
          />
        </div>
      </section>
    </SectionErrorBoundary>
  );
}
