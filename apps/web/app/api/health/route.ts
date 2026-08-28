import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDatabaseClient();
    // Verify database connection
    await db.execute(sql`SELECT 1`);
    
    return NextResponse.json(
      { status: "ok", timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "error", message: "Database connection failed" },
      { status: 503 }
    );
  }
}
