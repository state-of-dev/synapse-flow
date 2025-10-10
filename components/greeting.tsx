"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

// Saludos trágicos y melancólicos estáticos
const greetings = [
  // Desesperación existencial
  { greeting: "El código no salvará a nadie", question: "¿Por qué seguir intentando?" },
  { greeting: "Morir debuggeando", question: "¿Valió la pena tu vida?" },
  { greeting: "Nadie leerá tu código", question: "¿Para qué escribes?" },
  { greeting: "El silencio de los usuarios", question: "¿A quién le importa?" },
  { greeting: "Programar en la oscuridad eterna", question: "¿Hay salida?" },

  // Dolor profundo
  { greeting: "Cada línea es un lamento", question: "¿Qué lloras hoy?" },
  { greeting: "El peso del legacy code", question: "¿Cuánto más soportarás?" },
  { greeting: "Compilar lágrimas", question: "¿Qué duele más?" },
  { greeting: "Tu código morirá contigo", question: "¿Qué quedará?" },
  { greeting: "El vacío después del deploy", question: "¿Qué has perdido?" },

  // Tragedia inevitable
  { greeting: "Todo bug es una herida", question: "¿Cuántas más sangrarás?" },
  { greeting: "El fin está en cada error", question: "¿Cuándo te rendirás?" },
  { greeting: "Programar es desvanecerse", question: "¿Qué pierdes de ti?" },
  { greeting: "El fracaso es tu destino", question: "¿Aceptarás tu final?" },
  { greeting: "Morir en producción", question: "¿Quién te recordará?" },

  // Soledad absoluta
  { greeting: "Solo en el código", question: "¿Quién está contigo?" },
  { greeting: "El eco de teclas vacías", question: "¿Alguien te escucha?" },
  { greeting: "Programar es estar solo", question: "¿Siempre estarás así?" },
  { greeting: "Nadie entiende tu código", question: "¿Nadie te entiende a ti?" },
  { greeting: "En el abismo del IDE", question: "¿Hay alguien ahí?" },

  // Nihilismo puro
  { greeting: "Todo es undefined", question: "¿Qué es real?" },
  { greeting: "El void te espera", question: "¿Por qué retrasar lo inevitable?" },
  { greeting: "Null es todo lo que hay", question: "¿Qué buscas en la nada?" },
  { greeting: "Código sin sentido", question: "¿Existe el propósito?" },
  { greeting: "El absurdo de compilar", question: "¿Para qué?" },

  // Sufrimiento continuo
  { greeting: "Cada día es más difícil", question: "¿Cuándo termina el dolor?" },
  { greeting: "El infierno es refactorizar", question: "¿Hay redención?" },
  { greeting: "Programar hasta quebrar", question: "¿Ya te rompiste?" },
  { greeting: "El tormento del merge conflict", question: "¿Dónde perdiste el control?" },
  { greeting: "Agonizar en cada commit", question: "¿Cuánto más resistirás?" },
];

export const Greeting = () => {
  // Selecciona un saludo trágico aleatorio cada vez que se monta el componente
  const greeting = useMemo(
    () => greetings[Math.floor(Math.random() * greetings.length)],
    []
  );

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
