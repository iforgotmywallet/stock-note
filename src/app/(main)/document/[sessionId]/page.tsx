import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { AgentReportsService } from "~/lib/database/agent-reports";
import { StockAnalysisDashboard } from "~/components/stock-analysis-dashboard";
import { DocumentAccessDenied } from "~/components/document-access-denied";
import { DocumentSidebarRefresh } from "~/components/document-sidebar-refresh";

// Force dynamic rendering since we need user session and dynamic data
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ReportDashboardPage({ params }: PageProps) {
  // Get the current user session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect to auth if not signed in
  if (!session) {
    redirect("/auth/sign-in");
  }

  const { sessionId } = await params;

  // Validate session ID format (basic validation)
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    notFound();
  }

  try {
    // Verify user ownership and fetch report data
    const reportData = await AgentReportsService.getReportBySessionId(
      sessionId,
      session.user.id
    );

    // If report not found, user doesn't own it, or it's not published, show access denied
    if (!reportData) {
      return <DocumentAccessDenied />;
    }

    // Render the dashboard with the report data
    return (
      <div className="container mx-auto p-6">
        <DocumentSidebarRefresh />
        <StockAnalysisDashboard reportData={reportData} sessionId={sessionId} />
      </div>
    );
  } catch (error) {
    console.error('Error loading report dashboard:', error);
    // For any database or other errors, show access denied to avoid exposing system details
    return <DocumentAccessDenied />;
  }
}