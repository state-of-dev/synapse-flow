import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.CEREBRAS_API_KEY || "csk-khv29jdjv2v8yxe5yh2nkj9jet4jnjndr5fx5pm5dp6mr2fm";

    if (!apiKey) {
      return NextResponse.json(
        { error: "CEREBRAS_API_KEY not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.cerebras.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "ChatBot/1.0",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
