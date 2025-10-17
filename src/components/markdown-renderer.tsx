"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface ComponentProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

const components = {
  h1: ({ children, ...props }: ComponentProps) => (
    <h1 className="text-2xl font-bold mb-4 text-foreground" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: ComponentProps) => (
    <h2 className="text-xl font-semibold mb-3 text-foreground" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: ComponentProps) => (
    <h3 className="text-lg font-medium mb-2 text-foreground" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: ComponentProps) => (
    <h4 className="text-base font-medium mb-2 text-foreground" {...props}>
      {children}
    </h4>
  ),
  p: ({ children, ...props }: ComponentProps) => (
    <p className="mb-3 text-sm text-muted-foreground leading-relaxed" {...props}>
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
    <li className="text-sm text-muted-foreground" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }: ComponentProps) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: ComponentProps) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  blockquote: ({ children, ...props }: ComponentProps) => (
    <blockquote className="border-l-4 border-border pl-4 mb-3 italic text-muted-foreground" {...props}>
      {children}
    </blockquote>
  ),
  code: ({ children, ...props }: ComponentProps) => (
    <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
      {children}
    </code>
  ),
  pre: ({ children, ...props }: ComponentProps) => (
    <pre className="bg-muted p-3 rounded-lg mb-3 overflow-x-auto" {...props}>
      {children}
    </pre>
  ),
  table: ({ children, ...props }: ComponentProps) => (
    <div className="mb-4 overflow-x-auto">
      <table className="min-w-full border-collapse border border-border" {...props}>
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
    <tbody {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }: ComponentProps) => (
    <tr className="border-b border-border" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: ComponentProps) => (
    <th className="border border-border px-3 py-2 text-left text-sm font-medium text-foreground" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: ComponentProps) => (
    <td className="border border-border px-3 py-2 text-sm text-muted-foreground" {...props}>
      {children}
    </td>
  ),
  a: ({ children, href, ...props }: ComponentProps & { href?: string }) => (
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
    <hr className="my-4 border-border" {...props} />
  ),
};

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}