import { useRouter } from "next/router";
import { useState } from "react";
import { StyledButton } from "./Button";
import { Field, Fieldset, Label } from "./Forms";
import { Input } from "./Input";

const MultisigAddressInput = () => {
  const router = useRouter();
  const [address, setAddress] = useState<string>("");
  return (
    <Fieldset>
      <Field>
        <Label>Contract address:</Label>
        <Input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        ></Input>
      </Field>
      <StyledButton fullWidth onClick={() => router.push(`wallet/${address}`)}>Open Multisig</StyledButton>
    </Fieldset>
  )
}

export default MultisigAddressInput
