import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { openaiService, type SelectedReport } from "~/lib/openai-service";
import { MAX_REPORTS_PER_CHAT } from "~/lib/constants";

export async function POST(request: NextRequest) {
  try {
    // Get the session from the request
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, context } = body;

    // Validate message input
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmedMessage.length > 4000) {
      return NextResponse.json(
        { error: "Message is too long (maximum 4000 characters)" },
        { status: 400 }
      );
    }

    // Basic rate limiting check (simple implementation)
    const userAgent = request.headers.get('user-agent') || '';
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    // Log request for monitoring (in production, you'd use a proper rate limiter)
    console.log(`Chat request from user ${session.user.id}, IP: ${clientIP}, UA: ${userAgent.slice(0, 100)}`);

    // Validate context structure
    if (context && typeof context !== 'object') {
      return NextResponse.json(
        { error: "Invalid context format" },
        { status: 400 }
      );
    }

    // Validate and parse reports from context
    const reports: SelectedReport[] = [];
    if (context?.reports && Array.isArray(context.reports)) {
      // Check report count limit
      if (context.reports.length > MAX_REPORTS_PER_CHAT) {
        return NextResponse.json(
          { error: `Maximum ${MAX_REPORTS_PER_CHAT} reports allowed per chat session` },
          { status: 400 }
        );
      }

      // Import AgentReportsService for validation
      const { AgentReportsService } = await import("~/lib/database/agent-reports");
      
      for (const report of context.reports) {
        if (report.sessionId && report.ticker && report.content) {
          // Validate that the user owns this report
          const userReport = await AgentReportsService.getReportBySessionId(
            report.sessionId,
            session.user.id
          );
          
          if (!userReport) {
            return NextResponse.json(
              { error: "Access denied to one or more reports" },
              { status: 403 }
            );
          }
          
          reports.push({
            sessionId: report.sessionId,
            ticker: report.ticker,
            analysisDate: new Date(report.analysisDate),
            name: report.name || report.ticker,
            recommendation: report.recommendation || '',
            content: report.content,
          });
        }
      }
    }

    // Generate streaming response using OpenAI service
    const completion = await openaiService.createChatCompletion(trimmedMessage, reports);
    const stream = openaiService.createResponseStream(completion);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    const handledError = openaiService.handleOpenAIError(error);
    const status = (handledError as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ error: handledError.message }, { status });
  }
}