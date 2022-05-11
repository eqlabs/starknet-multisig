import { styled } from "@stitches/react";
import { useRouter } from "next/router";

const ModeSwitch = styled("div", {
  display: "flex",
  padding: "3px",
  borderRadius: "24px",
  background: "$text",
  marginBottom: "$6",
});

const Switch = styled("input", {
  position: "absolute",
  clip: "rect(0, 0, 0, 0)",
  height: "1px",
  width: "1px",

  "&:checked + label": {
    background: "$background",
    color: "$text",
    opacity: "1",
  },
});

const SwitchLabel = styled("label", {
  textAlign: "center",
  padding: "$3 $4",
  flex: 1,
  color: "$background",
  transition: "opacity .3s",
  opacity: "0.6",
  borderRadius: "24px",
  textTransform: "uppercase",
  fontSize: "$sm",
  "&:hover": {
    opacity: 1,
    cursor: "pointer",
  },
});

const ModeToggle = () => {
  const router = useRouter()
  return (
    <ModeSwitch>
      <Switch
        type="radio"
        id="create-multisig"
        checked={router.asPath === "/create"}
        onChange={() => {
          router.push("/create")
        }}
      ></Switch>{" "}
      <SwitchLabel htmlFor="create-multisig">
        Create a new multisig
      </SwitchLabel>
      <Switch
        type="radio"
        id="use-existing-multisig"
        checked={router.asPath.split("/")[1] === "wallet"}
        onChange={() => router.push("/wallet")}
      ></Switch>{" "}
      <SwitchLabel htmlFor="use-existing-multisig">
        Use an existing multisig
      </SwitchLabel>
    </ModeSwitch>
  )
}

export default ModeToggle
