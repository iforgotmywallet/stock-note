import { NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { UsersService } from "~/lib/database/users";

export async function GET() {
  try {
    // Get the current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user credits
    const credits = await UsersService.getUserCredits(session.user.id);

    return NextResponse.json({
      credits,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Error fetching user credits:", error);
    
    if (error instanceof Error && error.message === "User not found") {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch credits" },
      { status: 500 }
    );
  }
}
