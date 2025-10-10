"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo, useMemo } from "react";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "./elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
};

// Sugerencias trágicas y melancólicas estáticas
const allSuggestions = [
  // Desesperanza técnica
  "Debuggea el dolor que llevas dentro",
  "Refactoriza tus arrepentimientos en código",
  "Crea algo que nadie verá jamás",
  "Optimiza el vacío de tu existencia",

  // Nihilismo del desarrollo
  "Explica por qué seguimos programando",
  "Diseña tu propia tumba digital",
  "Implementa la desesperanza en componentes",
  "Construye castillos que se derrumbarán",

  // Futilidad del código
  "Genera errores que nunca se corregirán",
  "Escribe comentarios que nadie leerá",
  "Crea tests que siempre fallarán",
  "Documenta el sinsentido de la vida",

  // Sufrimiento del dev
  "Compila tus sueños rotos en JavaScript",
  "Deploya al abismo sin retorno",
  "Mergea tus fracasos con main",
  "Commitea tu desesperación al repositorio",

  // Soledad del programador
  "Programa solo en la oscuridad eterna",
  "Escribe código que morirá contigo",
  "Crea APIs que nadie consumirá",
  "Diseña interfaces para el vacío",

  // Tragedia de la tecnología
  "Explica el sufrimiento de los callbacks",
  "Implementa promesas que nunca se cumplirán",
  "Refactoriza el legacy code de tu alma",
  "Optimiza componentes para la nada",

  // Dolor existencial
  "Crea hooks que capturen tu agonía",
  "Genera estados de tristeza profunda",
  "Diseña patrones de autocompasión",
  "Implementa el ciclo infinito del dolor",

  // Desolación técnica
  "Explica por qué todos los deploys fallan",
  "Crea un sistema que nadie mantendrá",
  "Diseña arquitecturas destinadas a colapsar",
  "Implementa features que nadie pedía",

  // Melancolía del código
  "Escribe funciones que lloran en silencio",
  "Crea componentes huérfanos sin padre",
  "Genera mutaciones que destruyen todo",
  "Deploya cambios que nadie notará",
];

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  // Selecciona 4 sugerencias aleatorias cada vez que se monta el componente
  const suggestedActions = useMemo(() => {
    const shuffled = [...allSuggestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  }, []);

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
