import { useEffect, useState } from "react";
import { keyframes, styled } from "../../stitches.config";

const gradientAnimation = keyframes({
  "0%": {
    backgroundPosition: "-400% 50%"
  },
  "50%": {
    backgroundPosition: "0% 50%"
  },
  "100%": {
    backgroundPosition: "400% 50%"
  }
})

const fadeInAnimation = keyframes({
  "0%": {
    opacity: "0"
  },
  "100%": {
    opacity: "1"
  }
})

const SkeletonLoader = styled("div", {
  position: "relative",
  display: "flex",
  flex: 1,
  height: "100%",
  width: "100%",
  minWidth: "150px",
  minHeight: "$4",
  my: "$1",
  opacity: 0,
  background: "linear-gradient(90deg, rgba(255,255,255,0.25), rgba(0,0,0,0.1), rgba(255,255,255,0.25))",
  backgroundSize: "400% 400%",
  animationName: `${gradientAnimation}, ${fadeInAnimation}`,
  animationDuration: "12s, 1s",
  animationTimingFunction: "linear, ease",
  animationIterationCount: "infinite, 1",
  animationFillMode: "forwards"
})

export const LoaderWithDelay = () => {
  const delay = 200;
  const [show, setVisibility] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisibility(true), delay);
    return () => {
      clearTimeout(timer);
    };
  });

  return show ? <SkeletonLoader /> : null;
};

export default SkeletonLoader
