import { NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { db } from "~/server/db";
import { env } from "~/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Get user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Fetch the report
    const report = await db.agent_reports.findUnique({
      where: {
        session_id: sessionId,
      },
      select: {
        final_analysis: true,
        userId: true,
        status: true,
      },
    });

    if (!report) {
      console.log(`Report not found for session_id: ${sessionId}`);
      return NextResponse.json(
        { error: "Report not found for this action" },
        { status: 404 },
      );
    }

    // Verify ownership - allow access if user owns the report OR if report was created by ADMIN_USER
    const isAdminReport = report.userId === env.ADMIN_USER_SECRET_ID;
    const isOwner = report.userId === session.user.id;

    if (!isOwner && !isAdminReport) {
      console.log(
        `User ${session.user.id} attempted to access report owned by ${report.userId}`,
      );
      return NextResponse.json(
        { error: "You don't have permission to view this report" },
        { status: 403 },
      );
    }

    // Check if analysis is available
    if (!report.final_analysis) {
      return NextResponse.json({
        final_analysis: `Analysis not yet available. Report status: ${report.status}`,
      });
    }

    return NextResponse.json({
      final_analysis: report.final_analysis,
    });
  } catch (error) {
    console.error("Error fetching analysis:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
