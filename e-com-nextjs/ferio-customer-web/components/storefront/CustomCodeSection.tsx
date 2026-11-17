"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { StorefrontSectionData } from "@/lib/storefront";

interface CustomCodeSectionProps {
  section: StorefrontSectionData;
}

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

  // Extract <style> contents
  const styleRegex = /<style(?:\s+[^>]*)?>([\s\S]*?)<\/style>/gi;
  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleRegex.exec(rawCode)) !== null) {
    if (styleMatch[1]) {
      css += styleMatch[1] + "\n";
    }
  }

  // Extract <script> contents
  const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptRegex.exec(rawCode)) !== null) {
    if (scriptMatch[1]) {
      js += scriptMatch[1] + "\n";
    }
  }

  // Strip <style> and <script> tags from the HTML markup
  const html = rawCode
    .replace(/<style(?:\s+[^>]*)?>[\s\S]*?<\/style>/gi, "")
    .replace(/<script(?:\s+[^>]*)?>[\s\S]*?<\/script>/gi, "")
    .trim();

  return { html, css, js };
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

export default function CustomCodeSection({ section }: CustomCodeSectionProps) {
  const { settings } = section;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // Read code from single unified field (with backwards compatibility for split fields)
  const rawCode =
    (settings.customCode as string) ||
    (settings.customHtml as string) ||
    (settings.bodyText as string) ||
    "";

  // Parse unified code into HTML, scoped CSS, and JS
  const { parsedHtml, parsedCss, parsedJs } = useMemo(() => {
    const parsed = parseUnifiedCode(rawCode);
    const combinedCss = [parsed.css, (settings.customCss as string) || ""].filter(Boolean).join("\n");
    const combinedJs = [parsed.js, (settings.customJs as string) || ""].filter(Boolean).join("\n");
    return {
      parsedHtml: parsed.html || rawCode,
      parsedCss: combinedCss,
      parsedJs: combinedJs,
    };
  }, [rawCode, settings.customCss, settings.customJs]);

  const containerMaxWidth = (settings.containerMaxWidth as string) || "contained";
  const scopeSelector = `[data-section-id="${section.id}"]`;

  // Memoize safely scoped CSS to prevent style leakage
  const scopedCss = useMemo(() => {
    return scopeCssRules(parsedCss, scopeSelector);
  }, [parsedCss, scopeSelector]);

  // Ensure runtime Tailwind JIT engine is present so arbitrary user classes compile live
  useEffect(() => {
    if (typeof window === "undefined") return;

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

  // Execute client-side JS / React Component safely
  useEffect(() => {
    if (!parsedJs || !containerRef.current) return;
    setScriptError(null);

    const container = containerRef.current;
    let cleanupFn: (() => void) | void;

    try {
      const runner = new Function(
        "container",
        "React",
        "useState",
        "useEffect",
        "useRef",
        "useMemo",
        "section",
        `
        try {
          ${parsedJs}
        } catch (err) {
          console.error("[CustomCodeSection] Script error:", err);
          throw err;
        }
      `
      );

      const result = runner(
        container,
        React,
        React.useState,
        React.useEffect,
        React.useRef,
        React.useMemo,
        section
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
  }, [parsedJs, section]);

  // If completely empty in initial state
  if (!rawCode && !parsedHtml && !parsedCss && !parsedJs) {
    return (
      <section
        data-section-id={section.id}
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
    <SectionErrorBoundary sectionId={section.id}>
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

          {/* Custom HTML & Tailwind Container */}
          <div
            ref={containerRef}
            className="custom-section-content"
            dangerouslySetInnerHTML={parsedHtml ? { __html: parsedHtml } : undefined}
          />
        </div>
      </section>
    </SectionErrorBoundary>
  );
}
