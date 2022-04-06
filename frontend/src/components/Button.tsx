import React from "react";
import { styled } from "../../stitches.config";
import Box from "~/components/Box";
import Spinner from "~/components/Spinner";

export const StyledButton = styled("button", {
  all: "unset",
  position: "relative",
  appereance: "none",
  fontFamily: "$body",
  fontWeight: "$normal",
  alignItems: "center",
  boxSizing: "border-box",
  userSelect: "none",
  "&::before": {
    boxSizing: "border-box",
  },
  "&::after": {
    boxSizing: "border-box",
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
          },
        },
        "&:active": {
          backgroundColor: "$buttonBgActive",
          background: "$buttonActiveGradient",
        },
        "&:focus": {
          boxShadow:
            "inset 0 0 0 1px $colors$buttonFocusOutline, inset 0 0 0 2px $colors$buttonFocusOutline",
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
