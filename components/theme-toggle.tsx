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
      <Button className="h-8 p-1 md:h-fit md:p-2" variant="ghost" disabled>
        <MoonIcon />
      </Button>
    );
  }

  return (
    <Button
      className="h-8 p-1 md:h-fit md:p-2"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      variant="ghost"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
