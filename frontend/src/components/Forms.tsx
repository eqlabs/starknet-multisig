import { styled } from "@stitches/react";

export const Fieldset = styled("fieldset", {
  padding: "$1 0",
  position: "relative",
  border: 0,
  margin: 0,
  maxWidth: "100%",
});

export const Legend = styled("legend", {
  margin: 0,
  padding: 0,
});

export const Field = styled("div", {
  margin: "$4 0",
  display: "block",
  variants: {
    inactive: {
      true: {
        opacity: "0.5",
      }
    }
  }
});

export const Label = styled("label", {
  marginBottom: "$2",
  display: "block",
});
