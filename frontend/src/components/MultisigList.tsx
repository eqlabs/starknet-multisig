import { styled } from "@stitches/react";
import Link from "next/link";
import { useSnapshot } from "valtio";
import { state } from "~/state";

const Multisig = styled("div", {
  margin: "$4 0",
  overflow: "hidden",
  position: "relative",
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-evenly",
  maxWidth: "100%",
  background: "$background",
  variants: {
    inactive: {
      true: {
        opacity: "0.5",
      }
    }
  },
});

export const AddressPart = styled("span", {
  variants: {
    left: {
      true: {
        display: "flex",
        position: "relative",
        flexShrink: 1,
        textAlign: "left",
        justifyContent: "flex-start",
        minWidth: 0,
        overflow: "hidden",
        "&::after": {
          position: "absolute",
          top: 0,
          right: 0,
          content: "",
          width: "100%",
          height: "100%",
          zIndex: 2,
        }
      }
    },
    middle: {
      true: {
        display: "flex",
        position: "relative",
        flexShrink: 0,
        maxWidth: "min-content",
        width: "max-content",
        textAlign: "center",
        margin: "0 0.5em",
        zIndex: 2,
        textDecoration: "none !important"
      }
    },
    right: {
      true: {
        display: "flex",
        position: "relative",
        flexShrink: 1,
        textAlign: "right",
        justifyContent: "flex-end",
        minWidth: 0,
        overflow: "hidden",
        "&::after": {
          position: "absolute",
          top: 0,
          right: 0,
          content: "",
          width: "100%",
          height: "100%",
          zIndex: 2,
        }
      }
    }
  },
})

const TextFade = styled("div", {
  variants: {
    left: {
      true: {
        display: "flex",
        position: "absolute",
        zIndex: 3,
        width: "12rem",
        maxWidth: "100%",
        height: "100%",
        right: 0,
        background: "linear-gradient(to left, $background 0%, transparent 100%);"
      }
    },
    right: {
      true: {
        display: "flex",
        position: "absolute",
        zIndex: 3,
        width: "12rem",
        maxWidth: "100%",
        height: "100%",
        left: 0,
        background: "linear-gradient(to right, $background 0%, transparent 100%);"
      }
    }
  },
})

const LinkWrapper = styled("div", {
  position: "relative",
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-evenly",
  maxWidth: "100%",
  cursor: "pointer",
  "&:hover > span": {
    textDecoration: "underline"
  },
})

const ellipsis = "…"

const MultisigList = () => {
  const { multisigs } = useSnapshot(state)
  return (
    <>
      {multisigs?.map(contract => (
        <Multisig key={`contractList-${contract.address}`}>
          <Link href={`/wallet/${contract.address}`} passHref><LinkWrapper><AddressPart left>{contract.address}<TextFade left /></AddressPart><AddressPart middle>{ellipsis}</AddressPart><AddressPart right>{contract.address}<TextFade right /></AddressPart></LinkWrapper></Link>
        </Multisig>
      ))}
    </>
  )
}

export default MultisigList
