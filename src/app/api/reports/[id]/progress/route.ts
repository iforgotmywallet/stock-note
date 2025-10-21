import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { ProgressCalculationService } from "~/lib/database/progress-calculation";
import { headers } from "next/headers";

// Rate limiting map - in production, use Redis or similar
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per user

/**
 * Simple rate limiting implementation
 * @param userId - User ID for rate limiting
 * @returns boolean - True if request should be allowed
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit window
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Validate UUID format
 * @param id - String to validate as UUID
 * @returns boolean - True if valid UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * GET /api/reports/[id]/progress
 * Fetch progress data for a specific report
 * 
 * Requirements addressed:
 * - 5.1: Refetch latest report data and recalculate progress
 * - 5.4: Handle network errors gracefully
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get session from better-auth
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Verify user authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in to access this resource" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const params = await context.params;
    const reportId = params.id;

    // Input validation - check if reportId is a valid UUID
    if (!reportId || typeof reportId !== 'string' || !isValidUUID(reportId)) {
      return NextResponse.json(
        { error: "Invalid report ID format" },
        { status: 400 }
      );
    }

    // Rate limiting check
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          message: "Too many requests. Please try again later." 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '60'
          }
        }
      );
    }

    // Fetch progress data with user ownership verification
    const progressData = await ProgressCalculationService.getReportProgressForUser(
      reportId, 
      userId
    );

    return NextResponse.json({
      success: true,
      data: progressData
    });

  } catch (error) {
    console.error('Error in progress API endpoint:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return NextResponse.json(
          { error: "Report not found or access denied" },
          { status: 404 }
        );
      }

      if (error.message.includes('Failed to calculate')) {
        return NextResponse.json(
          { error: "Unable to calculate progress at this time" },
          { status: 500 }
        );
      }

      if (error.message.includes('Failed to fetch')) {
        return NextResponse.json(
          { error: "Unable to fetch report data" },
          { status: 500 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Clean up rate limit map periodically (basic cleanup)
setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(userId);
    }
  }
}, RATE_LIMIT_WINDOW);