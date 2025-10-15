import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: { message: "OPENROUTER_API_KEY no está configurada en .env.local", code: 500 } },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "State of Dev Chatbot",
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
