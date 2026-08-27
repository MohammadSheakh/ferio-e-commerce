"use client";

import { useState } from "react";
import Link from "next/link";

interface CopyableIdProps {
  id: string;
  prefix?: string;
  href?: string;
  displayValue?: string;
  truncateLast5?: boolean;
  className?: string;
}

export default function CopyableId({
  id,
  prefix = "",
  href,
  displayValue,
  truncateLast5 = false,
  className = "",
}: CopyableIdProps) {
  const [copied, setCopied] = useState(false);

  const textToCopy = id;
  const defaultDisplay = truncateLast5 && id.length > 5 ? `...${id.slice(-5)}` : id;
  const textToShow = displayValue || defaultDisplay;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      onClick={handleCopy}
      title={copied ? "Copied to clipboard!" : `Click to copy ID (${id})`}
      className={`group relative inline-block text-[11px] font-mono cursor-pointer transition select-all break-all whitespace-normal max-w-[110px] text-ink2 hover:text-ink leading-tight ${className}`}
    >
      {href ? (
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-ink hover:underline break-all"
        >
          {prefix}{textToShow}
        </Link>
      ) : (
        <span className="break-all">{prefix}{textToShow}</span>
      )}

      {copied && (
        <span className="absolute -top-6 left-0 z-20 rounded bg-ink px-1.5 py-0.5 text-[9px] font-sans font-medium text-white shadow-md pointer-events-none">
          Copied!
        </span>
      )}
    </div>
  );
}
