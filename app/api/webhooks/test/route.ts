import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { webhookUrl, householdName } = await req.json();

    if (!webhookUrl || typeof webhookUrl !== "string") {
      return NextResponse.json(
        { error: "A valid webhook URL is required" },
        { status: 400 }
      );
    }

    // Server-side dispatch bypasses browser CORS restrictions
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `🧹 **${householdName || "Household"} Chore Divider Alert**: Webhook integration connected successfully! Upcoming cleaning reminders will be posted here.`,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Remote endpoint returned status ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to dispatch webhook" },
      { status: 500 }
    );
  }
}
