import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(request: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY no está configurada' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { model = 'groq/compound', messages, tools } = body;

    // Configuración por defecto de herramientas
    const defaultTools = tools || ['web_search', 'visit_website', 'code_interpreter'];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'Groq-Model-Version': 'latest', // Para tener acceso a todas las herramientas
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 1,
        max_completion_tokens: 8192,
        compound_custom: {
          tools: {
            enabled_tools: defaultTools,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Groq Compound API:', errorText);
      return NextResponse.json(
        { error: 'Error en Groq Compound API', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en Compound endpoint:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: String(error) },
      { status: 500 }
    );
  }
}
