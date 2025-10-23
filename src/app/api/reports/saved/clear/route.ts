import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/lib/auth";

export async function DELETE(request: NextRequest) {
  try {
    // Get the session from the request
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all saved list entries for the user
    await db.savedList.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing saved reports:", error);
    return NextResponse.json(
      { error: "Failed to clear saved reports" },
      { status: 500 },
    );
  }
}