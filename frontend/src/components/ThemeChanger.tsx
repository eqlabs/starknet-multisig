import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

const ThemeChanger = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => {
        setTheme(theme && theme === "light" ? "dark" : "light");
      }}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
};

export default ThemeChanger;
