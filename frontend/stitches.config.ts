// stitches.config.ts
import {
  amber,
  amberDark,
  blackA,
  grass,
  grassDark,
  gray,
  grayDark,
  indigo,
  indigoDark,
  mint,
  mintDark,
  red,
  redDark,
  whiteA,
} from "@radix-ui/colors";
import type Stitches from "@stitches/react";
import { createStitches } from "@stitches/react";

export const {
  styled,
  css,
  globalCss,
  keyframes,
  getCssText,
  theme,
  createTheme,
  config,
} = createStitches({
  theme: {
    colors: {
      ...gray,
      ...indigo,
      ...grass,
      ...amber,
      ...red,
      ...blackA,
      ...whiteA,
      ...mint,
      accent: "$mint9",
      background: "$indigo3",
      text: "$indigo12",
      textMuted: "#464C82",
      error: "$red9",
      warning: "$amber11",
      success: "$grass11",
      focusOutline: "$accent",
      inputBg: "$indigo1",
      inputBorder: "$indigo12",
      buttonText: "$indigo1",
      buttonBg: "$indigo12",
      buttonHover: "$indigo11",
      buttonActive: "$indigo10",
      buttonGradient: "linear-gradient(210deg, $indigo9, $indigo12)",
      buttonHoverGradient: "linear-gradient(210deg, $indigo10, $indigo12)",
      buttonActiveGradient: "linear-gradient(210deg, $indigo11, $indigo12)",
    },
    fonts: {
      body: "'Space Grotesk', sans-serif",
      heading: "'Space Grotesk', sans-serif",
      monospace: "'Space Mono', monospace",
    },
    fontSizes: {
      xs: "0.6875rem",
      sm: "0.875rem",
      md: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
      "6xl": "3.75rem",
      "7xl": "4.5rem",
      "8xl": "6rem",
      "9xl": "8rem",
      default: "$md",
    },
    space: {
      px: "1px",
      0.5: "0.125rem",
      1: "0.25rem",
      1.5: "0.375rem",
      2: "0.5rem",
      2.5: "0.625rem",
      3: "0.75rem",
      3.5: "0.875rem",
      4: "1rem",
      5: "1.25rem",
      6: "1.5rem",
      7: "1.75rem",
      8: "2rem",
      9: "2.25rem",
      10: "2.5rem",
      12: "3rem",
      14: "3.5rem",
      16: "4rem",
      20: "5rem",
      24: "6rem",
      28: "7rem",
      32: "8rem",
      36: "9rem",
      40: "10rem",
      44: "11rem",
      48: "12rem",
      52: "13rem",
      56: "14rem",
      60: "15rem",
      64: "16rem",
      72: "18rem",
      80: "20rem",
      96: "24rem",
      widePlus: "2048px",
      wide: "1536px",
      layoutPlus: "1260px",
      layout: "1024px",
      copyUltra: "980px",
      copyPlus: "768px",
      copy: "680px",
      narrowPlus: "600px",
      narrow: "512px",
      containerWidth: "68ch",
      xs: "20rem",
      sm: "24rem",
      md: "28rem",
      lg: "32rem",
      xl: "36rem",
      "2xl": "42rem",
      "3xl": "48rem",
      "4xl": "56rem",
      "5xl": "64rem",
      "6xl": "72rem",
      "7xl": "80rem",
      "8xl": "90rem",
    },
    sizes: {
      px: "1px",
      0.5: "0.125rem",
      1: "0.25rem",
      1.5: "0.375rem",
      2: "0.5rem",
      2.5: "0.625rem",
      3: "0.75rem",
      3.5: "0.875rem",
      4: "1rem",
      5: "1.25rem",
      6: "1.5rem",
      7: "1.75rem",
      8: "2rem",
      9: "2.25rem",
      10: "2.5rem",
      12: "3rem",
      14: "3.5rem",
      16: "4rem",
      20: "5rem",
      24: "6rem",
      28: "7rem",
      32: "8rem",
      36: "9rem",
      40: "10rem",
      44: "11rem",
      48: "12rem",
      52: "13rem",
      56: "14rem",
      60: "15rem",
      64: "16rem",
      72: "18rem",
      80: "20rem",
      96: "24rem",
      max: "max-content",
      min: "min-content",
      full: "100%",
      "3xs": "14rem",
      "2xs": "16rem",
      xs: "20rem",
      sm: "24rem",
      md: "28rem",
      lg: "32rem",
      xl: "36rem",
      "2xl": "42rem",
      "3xl": "48rem",
      "4xl": "56rem",
      "5xl": "64rem",
      "6xl": "72rem",
      "7xl": "80rem",
      "8xl": "90rem",
    },
    radii: {
      none: "0",
      sm: "0.2rem",
      base: "0.25rem",
      md: "0.375rem",
      lg: "0.5rem",
      xl: "0.75rem",
      "2xl": "1rem",
      "3xl": "1.8rem",
      full: "9999px",
    },
    fontWeights: {
      body: 500,
      heading: 700,
      bold: 700,
    },
    lineHeights: {
      one: 1,
      body: 1.5,
      heading: 0.85,
    },
    letterSpacings: {},
    borderWidths: {},
    borderStyles: {},
    shadows: {},
    zIndices: {},
    transitions: {},
  },
  media: {
    sm: "(min-width: 30em)",
    md: "(min-width: 48em)",
    lg: "(min-width: 62em)",
    xl: "(min-width: 80em)",
    "2xl": "(min-width: 96em)",
    hover: "(any-hover: hover)",
    dark: "(prefers-color-scheme: dark)",
    light: "(prefers-color-scheme: light)",
  },
  utils: {
    // Abbreviated margin properties
    m: (
      value: Stitches.ScaleValue<"space"> | Stitches.PropertyValue<"margin">
    ) => ({
      margin: value,
    }),
    mt: (
      value: Stitches.ScaleValue<"space"> | Stitches.PropertyValue<"marginTop">
    ) => ({
      marginTop: value,
    }),
    mr: (
      value:
        | Stitches.ScaleValue<"space">
        | Stitches.PropertyValue<"marginRight">
    ) => ({
      marginRight: value,
    }),
    mb: (
      value:
        | Stitches.ScaleValue<"space">
        | Stitches.PropertyValue<"marginBottom">
    ) => ({
      marginBottom: value,
    }),
    ml: (
      value: Stitches.ScaleValue<"space"> | Stitches.PropertyValue<"marginLeft">
    ) => ({
      marginLeft: value,
    }),
    mx: (
      value:
        | Stitches.ScaleValue<"space">
        | Stitches.PropertyValue<"marginLeft" | "marginRight">
    ) => ({
      marginLeft: value,
      marginRight: value,
    }),
    my: (
      value:
        | Stitches.ScaleValue<"space">
        | Stitches.PropertyValue<"marginTop" | "marginBottom">
    ) => ({
      marginTop: value,
      marginBottom: value,
    }),
    // Abbreviated margin properties
    p: (
      value: Stitches.ScaleValue<"space"> | Stitches.PropertyValue<"padding">
    ) => ({
      padding: value,
    }),
    pt: (
      value: Stitches.ScaleValue<"space"> | Stitches.PropertyValue<"paddingTop">
    ) => ({
      paddingTop: value,
    }),
    pr: (
      value:
        | Stitches.ScaleValue<"space">
        | Stitches.PropertyValue<"paddingRight">
    ) => ({
      paddingRight: value,
    }),
    pb: (
      value:
        | Stitches.ScaleValue<"space">
        | Stitches.PropertyValue<"paddingBottom">
    ) => ({
      paddingBottom: value,
    }),
    pl: (
      value:
        | Stitches.ScaleValue<"space">
        | Stitches.PropertyValue<"paddingLeft">
    ) => ({
      paddingLeft: value,
    }),
    px: (
      value:
        | Stitches.ScaleValue<"space">
        | Stitches.PropertyValue<"paddingLeft" | "paddingRight">
    ) => ({
      paddingLeft: value,
      paddingRight: value,
    }),
    py: (
      value:
        | Stitches.ScaleValue<"space">
        | Stitches.PropertyValue<"paddingTop" | "paddingBottom">
    ) => ({
      paddingTop: value,
      paddingBottom: value,
    }),

    // A property for applying width/height together
    size: (
      value:
        | Stitches.ScaleValue<"space">
        | Stitches.PropertyValue<"width" | "height">
    ) => ({
      width: value,
      height: value,
    }),
    // color: (value: Stitches.PropertyValue<'color'> | Stitches.PropertyValue<'width' | 'height'> => ({
    //   color: value
    // }),

    // A property to apply linear gradient
    linearGradient: (value: Stitches.ScaleValue<"space">) => ({
      backgroundImage: `linear-gradient(${value})`,
    }),

    // An abbreviated property for border-radius
    br: (value: Stitches.ScaleValue<"space">) => ({
      borderRadius: value,
    }),
  },
});

export const darkTheme = createTheme("dark", {
  colors: {
    ...grayDark,
    ...grassDark,
    ...amberDark,
    ...redDark,
    ...mintDark,
    ...indigoDark,

    accent: "$mint9",
    background: "$indigo1",
    text: "$indigo12",
    textMuted: "#B6B8C6",
    error: "$red9",
    warning: "$amber11",
    success: "$grass11",
    buttonGradient: "linear-gradient(210deg, $whiteA12, $whiteA9)",
    buttonHoverGradient: "linear-gradient(210deg, $whiteA12, $whiteA10)",
    buttonActiveGradient: "linear-gradient(210deg, $whiteA12, $whiteA11)",
  },
});

export const globalStyles = globalCss({
  "@font-face": [
    {
      fontFamily: "Space Mono",
      fontStyle: "normal",
      fontWeight: "400",
      src: 'local(""), url("/fonts/space-mono-v10-latin-regular.woff2") format("woff2"), url("/fonts/space-mono-v10-latin-regular.woff") format("woff")',
    },
    {
      fontFamily: "Space Grotesk",
      fontStyle: "normal",
      fontWeight: "400",
      src: 'local(""), url("/fonts/space-grotesk-v10-latin-regular.woff2") format("woff2"), url("/fonts/space-grotesk-v10-latin-regular.woff") format("woff")',
    },
    {
      fontFamily: "Space Grotesk",
      fontStyle: "bold",
      fontWeight: "500",
      src: 'local(""), url("/fonts/space-grotesk-v10-latin-500.woff2") format("woff2"), url("/fonts/space-grotesk-v10-latin-500.woff") format("woff")',
    },
  ],
  "html, body": {
    backgroundColor: "$background",
    color: "$text",
    fontFamily: "$body",
    fontSize: "16px",
    margin: 0,
    "-webkit-font-smoothing": "antialiased",
    "-moz-osx-font-smoothing": "grayscale",
  },
  a: {
    color: "inherit",
  },
  hr: {
    border: "2px solid $accent",
    margin: "$6 0",
  },
  "h1, h2, h3, h4, h5": {
    letterSpacing: "-0.02rem",
    fontWeight: "500",
  },
  "*": {
    boxSizing: "border-box",
  },
});
