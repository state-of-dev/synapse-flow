"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

async function generateGreeting(): Promise<{ greeting: string; question: string }> {
  try {
    const response = await fetch("/api/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Genera un saludo breve y amigable para un chatbot de JavaScript/React/Next.js, seguido de una pregunta de bienvenida. Ambos textos deben ser en español, creativos y variados. El saludo debe tener máximo 30 caracteres y la pregunta máximo 50 caracteres. Responde en formato: SALUDO|PREGUNTA (ejemplo: "¡Hola desarrollador!|¿En qué puedo ayudarte hoy?")`
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

  // Fallback a saludos variados estáticos
  const greetings = [
    { greeting: "¡Hola!", question: "¿Cómo puedo ayudarte hoy?" },
    { greeting: "¡Bienvenido!", question: "¿Qué vamos a construir hoy?" },
    { greeting: "¡Hola dev!", question: "¿Listo para programar?" },
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
