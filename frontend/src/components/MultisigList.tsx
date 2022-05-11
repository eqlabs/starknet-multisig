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
  variants: {
    inactive: {
      true: {
        opacity: "0.5",
      }
    }
  }
});

const AddressPart = styled("span", {
  variants: {
    left: {
      true: {
        display: "flex",
        flexShrink: 1,
        textAlign: "left",
        justifyContent: "flex-start",
        minWidth: 0,
        overflow: "hidden",
      }
    },
    middle: {
      true: {
        display: "flex",
        flexShrink: 0,
        maxWidth: "min-content",
        width: "max-content",
        textAlign: "center",
        margin: "0 0.5em",
        zIndex: 2,
        boxShadow: "1px 1px 50px $background"
      }
    },
    right: {
      true: {
        display: "flex",
        flexShrink: 1,
        textAlign: "right",
        justifyContent: "flex-end",
        minWidth: 0,
        overflow: "hidden",
      }
    }
  }
})

const ellipsis = "…"

const MultisigList = () => {
  const { multisigs } = useSnapshot(state)
  return (
    <>
      {multisigs?.map(contractAddress => (
        <Multisig key={`contractList-${contractAddress}`}>
          <Link href={`/wallet/${contractAddress}`}><><AddressPart left>{contractAddress}</AddressPart><AddressPart middle>{ellipsis}</AddressPart><AddressPart right>{contractAddress}</AddressPart></></Link>
        </Multisig>
      ))}
    </>
  )
}

export default MultisigList
