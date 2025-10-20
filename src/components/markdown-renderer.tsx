"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface ComponentProps {
  children?: React.ReactNode;
  [key: string]: any;
}

const components = {
  h1: ({ children, ...props }: ComponentProps) => (
    <h1 className="text-foreground mb-4 text-2xl font-bold" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: ComponentProps) => (
    <h2 className="text-foreground mb-3 text-xl font-semibold" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: ComponentProps) => (
    <h3 className="text-foreground mb-2 text-lg font-medium" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: ComponentProps) => (
    <h4 className="text-foreground mb-2 text-base font-medium" {...props}>
      {children}
    </h4>
  ),
  p: ({ children, ...props }: ComponentProps) => (
    <p
      className="text-muted-foreground mb-3 text-sm leading-relaxed"
      {...props}
    >
      {children}
    </p>
  ),
  ul: ({ children, ...props }: ComponentProps) => (
    <ul className="mb-3 ml-4 list-disc space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: ComponentProps) => (
    <ol className="mb-3 ml-4 list-decimal space-y-1" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: ComponentProps) => (
    <li className="text-muted-foreground text-sm" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }: ComponentProps) => (
    <strong className="text-foreground font-semibold" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: ComponentProps) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  blockquote: ({ children, ...props }: ComponentProps) => (
    <blockquote
      className="border-border text-muted-foreground mb-3 border-l-4 pl-4 italic"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ children, ...props }: ComponentProps) => (
    <code className="bg-muted rounded px-1 py-0.5 font-mono text-sm" {...props}>
      {children}
    </code>
  ),
  pre: ({ children, ...props }: ComponentProps) => (
    <pre className="bg-muted mb-3 overflow-x-auto rounded-lg p-3" {...props}>
      {children}
    </pre>
  ),
  table: ({ children, ...props }: ComponentProps) => (
    <div className="mb-4 overflow-x-auto">
      <table
        className="border-border min-w-full border-collapse border"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: ComponentProps) => (
    <thead className="bg-muted" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: ComponentProps) => (
    <tbody {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }: ComponentProps) => (
    <tr className="border-border border-b" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: ComponentProps) => (
    <th
      className="border-border text-foreground border px-3 py-2 text-left text-sm font-medium"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: ComponentProps) => (
    <td
      className="border-border text-muted-foreground border px-3 py-2 text-sm"
      {...props}
    >
      {children}
    </td>
  ),
  a: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
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
  hr: ({ ...props }: ComponentProps) => (
    <hr className="border-border my-4" {...props} />
  ),
};

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
