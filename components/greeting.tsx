"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

async function generateGreeting(): Promise<{ greeting: string; question: string }> {
  try {
    const response = await fetch("/api/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "moonshotai/kimi-k2-instruct",
        messages: [
          {
            role: "user",
            content: `Eres un filósofo-programador que combina la sabiduría ancestral con la tecnología moderna. Genera un saludo filosófico profundo y una pregunta existencial relacionada con la programación.

INSTRUCCIONES:
- El saludo debe ser filosófico, reflexivo, con referencias a pensadores, conceptos profundos o metáforas (máximo 40 caracteres)
- La pregunta debe ser existencial, profunda, que invite a la reflexión sobre el código, la creación, el conocimiento (máximo 60 caracteres)
- Todo en español
- Combina filosofía + programación + desarrollo
- Tonos variados: estoico, zen, existencialista, socrático, místico, cínico

EJEMPLOS DE ESTILO (NO REPETIR):
- "El código es pensamiento|¿Qué verdad programarás hoy?"
- "Crear es existir|¿Qué realidad construyes?"
- "El bug es el maestro|¿Qué te enseña tu código?"
- "Todo fluye, todo cambia|¿Qué transformarás hoy?"
- "Conocerse es programarse|¿Qué parte de ti codificas?"

INSPIRACIONES:
- Platón, Aristóteles, Sócrates, Zenón, Lao Tzu, Confucio, Nietzsche, Heráclito, Epicteto
- Conceptos: flujo, vacío, esencia, forma, devenir, logos, dao, karma, dharma
- Metáforas: código como pensamiento, bugs como maestros, funciones como verdades

FORMATO DE RESPUESTA (exactamente así):
SALUDO|PREGUNTA

Genera uno ahora, sé profundo y original:`
          }
        ]
      }),
    });

    const data = await response.json();

    if (data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content.trim();
      const [greeting, question] = content.split('|').map((s: string) => s.trim());

      if (greeting && question) {
        return { greeting, question };
      }
    }
  } catch (error) {
    console.error("Error generating greeting:", error);
  }

  // Fallback a saludos filosóficos estáticos
  const greetings = [
    { greeting: "El código es pensamiento", question: "¿Qué verdad programarás hoy?" },
    { greeting: "Crear es existir", question: "¿Qué realidad construyes?" },
    { greeting: "El bug es el maestro", question: "¿Qué te enseña tu código?" },
    { greeting: "Todo fluye, todo cambia", question: "¿Qué transformarás hoy?" },
    { greeting: "La función revela la esencia", question: "¿Qué forma darás a tus ideas?" },
  ];

  return greetings[Math.floor(Math.random() * greetings.length)];
}

export const Greeting = () => {
  const [greeting, setGreeting] = useState({ greeting: "¡Hola!", question: "¿Cómo puedo ayudarte hoy?" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGreeting = async () => {
      setLoading(true);
      const newGreeting = await generateGreeting();
      setGreeting(newGreeting);
      setLoading(false);
    };

    loadGreeting();
  }, []);

  if (loading) {
    return (
      <div
        className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
        key="overview"
      >
        <div className="h-8 w-32 animate-pulse rounded-md bg-zinc-500/30" />
        <div className="mt-2 h-8 w-64 animate-pulse rounded-md bg-zinc-500/20" />
      </div>
    );
  }

  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-xl md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        {greeting.greeting}
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-xl text-zinc-500 md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        {greeting.question}
      </motion.div>
    </div>
  );
};
