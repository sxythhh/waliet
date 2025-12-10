import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const {
    theme,
    setTheme
  } = useTheme();
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };
  return <Button variant="ghost" size="icon" onClick={toggleTheme} className={cn("h-7 w-7 border-0 bg-[#161616] hover:bg-[#1f1f1f] group", className)}>
      <Sun className="h-3.5 w-3.5 text-neutral-400 group-hover:text-white rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-3.5 w-3.5 text-neutral-400 group-hover:text-white rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>;
}