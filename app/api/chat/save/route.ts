import { NextResponse } from "next/server";
import { saveChat } from "@/lib/db/queries";
import { auth } from "@/app/(auth)/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, messages } = await request.json();

    if (!chatId || !messages) {
      return NextResponse.json(
        { error: "Missing chatId or messages" },
        { status: 400 }
      );
    }

    // Generar título del primer mensaje del usuario
    const firstUserMessage = messages.find((m: any) => m.role === "user");
    const title = firstUserMessage?.parts
      ?.map((p: any) => (p.type === "text" ? p.text : ""))
      .join("")
      .slice(0, 100) || "Nueva conversación";

    // Guardar chat usando la función de queries
    await saveChat({
      id: chatId,
      userId: session.user.id,
      title,
      visibility: "private",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving chat:", error);
    return NextResponse.json(
      { error: "Failed to save chat" },
      { status: 500 }
    );
  }
}
