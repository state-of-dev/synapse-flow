import { NextResponse } from "next/server";
import { saveChat, saveMessages } from "@/lib/db/queries";
import { auth } from "@/app/(auth)/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.log("[SAVE] No session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, messages } = await request.json();

    if (!chatId || !messages) {
      console.log("[SAVE] Missing chatId or messages");
      return NextResponse.json(
        { error: "Missing chatId or messages" },
        { status: 400 }
      );
    }

    console.log(`[SAVE] Saving chat ${chatId} with ${messages.length} messages`);

    // Generar título del primer mensaje del usuario
    const firstUserMessage = messages.find((m: any) => m.role === "user");
    const title = firstUserMessage?.parts
      ?.map((p: any) => (p.type === "text" ? p.text : ""))
      .join("")
      .slice(0, 100) || "Nueva conversación";

    console.log(`[SAVE] Chat title: ${title}`);

    // Guardar chat usando la función de queries
    await saveChat({
      id: chatId,
      userId: session.user.id,
      title,
      visibility: "private",
    });

    console.log("[SAVE] Chat saved successfully");

    // Guardar mensajes en la base de datos
    const dbMessages = messages.map((msg: any) => ({
      chatId,
      id: msg.id,
      role: msg.role,
      parts: msg.parts || [],
      attachments: msg.attachments || [],
      createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
    }));

    await saveMessages({ messages: dbMessages });

    console.log(`[SAVE] ${dbMessages.length} messages saved successfully`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SAVE] Error saving chat:", error);
    return NextResponse.json(
      { error: "Failed to save chat" },
      { status: 500 }
    );
  }
}
