"use client";

import { ReportDataTable } from "~/components/report-data-table";

interface TablePageContentProps {
  userId: string;
}

export default function TablePageContent({ userId }: TablePageContentProps) {
  return (
    <div className="container mx-auto p-6">
      <ReportDataTable 
        userId={userId}
        className="w-full"
        showIdColumn={true}
        isFullScreen={true}
      />
    </div>
  );
}