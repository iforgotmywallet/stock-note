import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { AgentReportsService } from "~/lib/database/agent-reports";
import { StockAnalysisDashboard } from "~/components/stock-analysis-dashboard";
import { DocumentAccessDenied } from "~/components/document-access-denied";


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
    // First check report access and get status
    const reportAccess = await AgentReportsService.checkReportAccess(
      sessionId,
      session.user.id
    );

    // If report doesn't exist or user doesn't own it, show access denied
    if (!reportAccess.exists || !reportAccess.owned) {
      return <DocumentAccessDenied />;
    }

    // Get the report status and basic info
    const reportInfo = await AgentReportsService.getReportInfo(sessionId);
    
    // If report is published, get the full data
    let reportData = null;
    if (reportAccess.published) {
      reportData = await AgentReportsService.getReportBySessionId(
        sessionId,
        session.user.id
      );
    }

    // Render the dashboard with the report data and status
    return (
      <div className="container mx-auto p-6">
        <StockAnalysisDashboard 
          reportData={reportData ?? undefined} 
          sessionId={sessionId}
          status={reportInfo?.status as "queued" | "processing" | "done" | "failed" | "NEC" | undefined}
          ticker={reportInfo?.ticker}
          reportId={reportInfo?.reportId}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading report dashboard:', error);
    // For any database or other errors, show access denied to avoid exposing system details
    return <DocumentAccessDenied />;
  }
}