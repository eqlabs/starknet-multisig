import { useState, useEffect } from "react";
import { styled } from "../../stitches.config";
import { useTheme } from "next-themes";
import { FiMoon, FiSun } from "react-icons/fi";

const ThemeSwitch = styled("div", {
  width: "44px",
  height: "44px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "&:hover": {
    cursor: "pointer",
    color: "$accent",
  },
});

const ThemeChanger = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <ThemeSwitch
      onClick={() => {
        setTheme(theme && theme === "light" ? "dark" : "light");
      }}
    >
      {theme === "dark" ? <FiSun /> : <FiMoon />}
    </ThemeSwitch>
  );
};

export default ThemeChanger;
