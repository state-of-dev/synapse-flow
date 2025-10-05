"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "./icons";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-between p-2">
        <span className="font-medium text-sm" />
        <Button size="sm" variant="ghost" disabled>
          <MoonIcon />
          <span className="ml-2">Tema</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2">
      <span className="font-medium text-sm" />
      <Button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        size="sm"
        variant="ghost"
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        <span className="ml-2">{theme === "dark" ? "Claro" : "Oscuro"}</span>
      </Button>
    </div>
  );
}
