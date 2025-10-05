"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo, useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "./elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
};

async function generateSuggestions(): Promise<string[]> {
  try {
    const response = await fetch("/api/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content:
              "Genera exactamente 4 sugerencias útiles para pedirle a una IA sobre programación en JavaScript/React/Next.js. Cada sugerencia debe ser una SOLICITUD CONCRETA (no una pregunta simple) en español de máximo 70 caracteres. Ejemplos: 'Genera una guía de estudio de React', 'Crea un componente de login con validación', 'Explica patrones de diseño en Next.js', 'Optimiza este código React'. Las sugerencias deben pedir que la IA GENERE, CREE, EXPLIQUE o AYUDE con algo concreto. Responde SOLO con las 4 sugerencias separadas por saltos de línea, sin numeración ni texto adicional.",
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.choices?.[0]?.message?.content) {
      const suggestions = data.choices[0].message.content
        .split("\n")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && s.length <= 100)
        .slice(0, 4);

      if (suggestions.length === 4) {
        return suggestions;
      }
    }
  } catch (error) {
    console.error("Error generating suggestions:", error);
  }

  // Fallback a sugerencias estáticas si falla la generación
  return [
    "¿Cuáles son las ventajas de usar Next.js?",
    "Explica cómo funciona useEffect en React",
    "¿Cuándo usar useState vs useReducer?",
    "Mejores prácticas para optimizar React apps",
  ];
}

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSuggestions = async () => {
      setLoading(true);
      const suggestions = await generateSuggestions();
      setSuggestedActions(suggestions);
      setLoading(false);
    };

    loadSuggestions();
  }, []);

  if (loading) {
    return (
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div className="h-14 animate-pulse rounded-lg bg-muted" key={i} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          key={suggestedAction}
          transition={{ delay: 0.05 * index }}
        >
          <Suggestion
            className="flex h-auto min-h-[3.5rem] w-full items-center justify-center whitespace-normal p-3 text-center"
            onClick={(suggestion) => {
              window.history.replaceState({}, "", `/chat/${chatId}`);
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: suggestion }],
              });
            }}
            suggestion={suggestedAction}
          >
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }

    return true;
  }
);
