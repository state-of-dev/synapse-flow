"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Chat no encontrado</h2>
        <p className="mt-2 text-muted-foreground">
          No se pudo encontrar el chat que buscas.
        </p>
        <div className="mt-4">
          <Link
            href="/"
            className="text-primary hover:text-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}