import { keyframes, styled } from "../../stitches.config";

const rotate = keyframes({
  "0%": { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(-360deg)" },
});

const Spinner = styled("div", {
  animation: `${rotate} 150ms linear infinite`,
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  border: "5px solid transparent",
  background: "linear-gradient(white, white), conic-gradient(from 0.15turn, white, #00EBD3)",
  backgroundOrigin: "border-box",
  backgroundClip: "content-box, border-box",
});

export default Spinner;
