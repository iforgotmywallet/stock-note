"use client";

import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const components: Components = {
  h1: ({ children, ...props }) => (
    <h1 className="text-foreground mb-4 text-2xl font-bold" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-foreground mb-3 text-xl font-semibold" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-foreground mb-2 text-lg font-medium" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="text-foreground mb-2 text-base font-medium" {...props}>
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p
      className="text-muted-foreground mb-3 text-sm leading-relaxed"
      {...props}
    >
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-3 ml-4 list-disc space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-3 ml-4 list-decimal space-y-1" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="text-muted-foreground text-sm" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="text-foreground font-semibold" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-border text-muted-foreground mb-3 border-l-4 pl-4 italic"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ children, ...props }) => (
    <code className="bg-muted rounded px-1 py-0.5 font-mono text-sm" {...props}>
      {children}
    </code>
  ),
  pre: ({ children, ...props }) => (
    <pre className="bg-muted mb-3 overflow-x-auto rounded-lg p-3" {...props}>
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <div className="mb-4 overflow-x-auto">
      <table
        className="border-border min-w-full border-collapse border"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-muted" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
  tr: ({ children, ...props }) => (
    <tr className="border-border border-b" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border-border text-foreground border px-3 py-2 text-left text-sm font-medium"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="border-border text-muted-foreground border px-3 py-2 text-sm"
      {...props}
    >
      {children}
    </td>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="text-primary hover:underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  hr: ({ ...props }) => <hr className="border-border my-4" {...props} />,
};

// Function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  try {
    // Use DOM method if available (client-side)
    if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = text;
      return textarea.value;
    }
  } catch (error) {
    console.warn("Failed to decode HTML entities using DOM method:", error);
  }

  // Fallback: manually decode common HTML entities
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// Function to clean and prepare markdown content
function cleanMarkdownContent(content: string): string {
  // Decode HTML entities
  let cleaned = decodeHtmlEntities(content);

  // Fix common markdown issues
  cleaned = cleaned
    // Remove markdown code block wrappers if the entire content is wrapped
    .replace(/^```markdown\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    // Remove any remaining stray backticks at start/end
    .replace(/^```\s*\n?/gm, "")
    .replace(/\n?```\s*$/gm, "")
    // Ensure proper spacing around headers
    .replace(/^(#{1,6})\s*/gm, "$1 ")
    // Fix table formatting issues
    .replace(/\|\s*\|\s*\|/g, "| | |")
    // Clean up extra whitespace but preserve intentional line breaks
    .replace(/\n{3,}/g, "\n\n")
    // Trim leading/trailing whitespace
    .trim();

  return cleaned;
}

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  const cleanedContent = cleanMarkdownContent(content);

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {cleanedContent}
      </ReactMarkdown>
    </div>
  );
}
