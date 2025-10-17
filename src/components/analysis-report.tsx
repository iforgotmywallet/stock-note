"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";

interface AnalysisReportProps {
  title: string;
  description?: string;
  content: string;
  className?: string;
}

export function AnalysisReport({
  title,
  description,
  content,
  className,
}: AnalysisReportProps) {
  // Simple markdown-like parsing for basic formatting
  const parseContent = (text: string) => {
    // Split by paragraphs
    const paragraphs = text.split("\n\n").filter((p) => p.trim());

    return paragraphs.map((paragraph, index) => {
      // Handle headers
      if (paragraph.startsWith("###")) {
        return (
          <h3 key={index} className="mt-6 mb-3 text-lg font-semibold">
            {paragraph.replace(/^###\s*/, "")}
          </h3>
        );
      }
      if (paragraph.startsWith("##")) {
        return (
          <h2 key={index} className="mt-6 mb-4 text-xl font-semibold">
            {paragraph.replace(/^##\s*/, "")}
          </h2>
        );
      }
      if (paragraph.startsWith("#")) {
        return (
          <h1 key={index} className="mt-6 mb-4 text-2xl font-bold">
            {paragraph.replace(/^#\s*/, "")}
          </h1>
        );
      }

      // Handle bullet points
      if (paragraph.includes("- **") || paragraph.includes("• ")) {
        const items = paragraph
          .split("\n")
          .filter(
            (line) =>
              line.trim().startsWith("-") || line.trim().startsWith("•"),
          );
        return (
          <ul key={index} className="mb-4 list-inside list-disc space-y-2">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="text-sm">
                {item
                  .replace(/^[-•]\s*/, "")
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}
              </li>
            ))}
          </ul>
        );
      }

      // Handle tables (basic support)
      if (paragraph.includes("|")) {
        const lines = paragraph
          .split("\n")
          .filter((line) => line.includes("|"));
        if (lines.length > 1) {
          const headers =
            lines[0]
              ?.split("|")
              .map((h) => h.trim())
              .filter((h) => h) || [];
          const rows = lines.slice(2).map((line) =>
            line
              .split("|")
              .map((cell) => cell.trim())
              .filter((cell) => cell),
          );

          return (
            <div key={index} className="mb-4 overflow-x-auto">
              <table className="border-border min-w-full rounded-lg border">
                <thead className="bg-muted">
                  <tr>
                    {headers.map((header, headerIndex) => (
                      <th
                        key={headerIndex}
                        className="px-4 py-2 text-left text-sm font-medium"
                      >
                        {header.replace(/\*\*/g, "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-2 text-sm">
                          {cell.replace(/\*\*/g, "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      }

      // Regular paragraphs
      return (
        <p key={index} className="mb-4 text-sm leading-relaxed">
          {paragraph.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}
        </p>
      );
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">{parseContent(content)}</div>
      </CardContent>
    </Card>
  );
}
