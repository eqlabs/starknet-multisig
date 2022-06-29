import React from "react";
import Box from "~/components/Box";
import Spinner from "~/components/Spinner";
import { keyframes, styled } from "../../stitches.config";

const shine = keyframes({
  "0%": { transform: "translateX(-30px) scale(0.7)", opacity: 0 },
  "50%": { transform: "translateX(0) scale(1)", opacity: 1 },
  "100%": { transform: "translateX(30px) scale(0.7)", opacity: 0 },
});

export const StyledButton = styled("button", {
  all: "unset",
  position: "relative",
  appereance: "none",
  fontFamily: "$body",
  fontWeight: "$normal",
  alignItems: "center",
  textTransform: "uppercase",
  boxSizing: "border-box",
  userSelect: "none",
  "&::before": {
    boxSizing: "border-box",
    filter: "blur(6px)",
    opacity: 0,
    transform: "translateX(-70px) scale(0.7)",
    position: "absolute",
    top: "-8px",
    right: "18%",
    content: "",
    display: "block",
    background: "radial-gradient(rgba(255,255,255,.8), rgba(255,255,255,0))",
    width: "20px",
    height: "20px",
    transformOrigin: "center center",
  },
  "&::after": {
    boxSizing: "border-box",
    filter: "blur(12px)",
    opacity: 0,
    transform: "translateX(-60px) scale(0.7)",
    position: "absolute",
    top: "-15px",
    right: "10%",
    content: "",
    display: "block",
    background: "radial-gradient(rgba(255,255,255,.8), rgba(255,255,255,0))",
    width: "40px",
    height: "40px",
    transformOrigin: "center center",
  },
  display: "inline-flex",
  flexShrink: 0,
  justifyContent: "center",
  lineHeight: "1",
  gap: "5px",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",
  // Custom
  height: "$6",
  px: "$2",
  fontSize: "$2",
  fontVariantNumeric: "tabular-nums",
  cursor: "pointer",
  width: "max-content",
  transition: "background .3s ease-in-out",
  "&:disabled": {
    opacity: 0.6,
    pointerEvents: "none",
    cursor: "not-allowed",
  },
  variants: {
    size: {
      xs: {
        height: "$5",
        px: "$2",
        fontSize: "$xs",
      },
      sm: {
        height: "$7",
        px: "$3",
        fontSize: "$xs",
      },
      md: {
        height: "$14",
        px: "$6",
        fontSize: "$lg",
      },
      lg: {
        height: "$16",
        px: "$8",
        fontSize: "$xl",
      },
    },
    variant: {
      link: {
        textDecoration: "underline",
        fontSize: "inherit",
        textUnderlineOffset: "2px",
      },
      default: {
        backgroundColor: "$buttonBg",
        background: "$buttonGradient",
        color: "$buttonText",
        "@hover": {
          "&:hover": {
            backgroundColor: "$buttonBgHover",
            background: "$buttonHoverGradient",
            "&::before": {
              animation: `${shine} 1260ms linear`,

              animationDelay: "130ms",
            },
            "&::after": {
              animation: `${shine} 1200ms linear`,
            },
          },
        },
        "&:active": {
          backgroundColor: "$buttonBgActive",
          background: "$buttonActiveGradient",
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$focusOutline, inset 0 0 0 2px $colors$focusOutline",
        },
      },
    },
    muted: {
      true: {
        color: "$textMuted",
      },
    },
    outline: {
      true: {
        backgroundColor: "transparent",
        border: "2px solid $buttonOutlineColor",
      },
    },
    uppercase: {
      true: {
        textTransform: "uppercase",
      },
    },
    fullWidth: {
      true: {
        width: "100%",
      },
    },
    isLoading: {
      true: {
        "& .button-content": {
          visibility: "hidden",
        },
        pointerEvents: "none",
      },
    },
  },
  compoundVariants: [
    {
      outline: true,
      variant: "default",
      css: {
        background: "transparent",
        color: "$mauve12",
        boxShadow: "inset 0 0 0 1px $colors$mauve10",
        "&:hover": {
          color: "$mauve12",
          background: "$mauve5",
        },
      },
    },
  ],
  defaultVariants: {
    size: "md",
    variant: "default",
  },
});

const CustomButton: React.FC<
  React.ComponentProps<typeof StyledButton> & { as?: string }
> = React.forwardRef(({ children, as = "button", ...rest }, ref) => (
  // @ts-expect-error
  <StyledButton {...rest} ref={ref} as={as}>
    <Box
      as="span"
      css={{ gap: "$2", alignItems: "center" }}
      className="button-content"
    >
      {children}
    </Box>
    {rest.isLoading && <Spinner css={{ position: "absolute" }} />}
  </StyledButton>
));

CustomButton.displayName = "CustomButton";

export default CustomButton;
