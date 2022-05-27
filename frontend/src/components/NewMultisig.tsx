import {
  useStarknet
} from "@starknet-react/core";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import {
  Abi,
  CompiledContract, json, number
} from "starknet";
import Button from "~/components/Button";
import { Input, Select } from "~/components/Input";
import Paragraph from "~/components/Paragraph";
import { useContractFactory } from "~/hooks/deploy";
import MultisigSource from "../../public/Multisig.json";
import { styled } from "../../stitches.config";
import { Field, Fieldset, Label, Legend } from "./Forms";
import ModeToggle from "./ModeToggle";

const Threshold = styled("div", {
  padding: "0 0 $4",
});

export function NewMultisig() {
  const { account } = useStarknet();
  const router = useRouter();

  // Compile the multisig contract on mount
  const [compiledMultisig, setCompiledMultisig] = useState<CompiledContract>();
  useEffect(() => {
    const getCompiledMultisig = async (): Promise<CompiledContract> => {
      // Can't import the JSON directly due to a bug in StarkNet: https://github.com/0xs34n/starknet.js/issues/104
      // (even if the issue is closed, the underlying Starknet issue remains)
      const raw = await fetch("/Multisig.json");
      const compiled = json.parse(await raw.text());
      return compiled;
    };
    if (!compiledMultisig) {
      getCompiledMultisig().then(setCompiledMultisig);
    }
  }, []);

  // Input state
  const [signerThreshold, setSignerThreshold] = useState<number>(1);
  const [totalSigners, setTotalSigners] = useState<number>(2);
  const [signers, setSigners] = useState<string[]>([]);

  const { deploy: deployMultisig } = useContractFactory({
    compiledContract: compiledMultisig,
    abi: (MultisigSource as any).abi as Abi,
  });

  useEffect(() => {
    const emptyOwners = [...Array(totalSigners).keys()].map((item) => "");
    emptyOwners[0] = account ?? "";
    setSigners(emptyOwners);
  }, []);

  const onDeploy = async () => {
    const _deployMultisig = async () => {
      const bnOwners = signers.slice(0, signers.length - 1).map((o) => number.toBN(o));
      const calldata = [bnOwners.length, ...bnOwners, signerThreshold];
      const deployment = await deployMultisig({
        constructorCalldata: calldata,
      });
      if (deployment) {
        router.push(`/wallet/${deployment.address}`)
      }
    };
    await _deployMultisig();
  };

  const onThresholdChange = (value: string) => {
    setSignerThreshold(+value);
  };

  const onOwnerChange = (value: string, index: number) => {
    // Put the new entry in copied version of signers[]
    let copy = [...signers];
    copy[index] = value;

    const allFieldsFilled = copy.every((owner)=> owner !== "")
    let lastFilledIndex = 0
    signers.forEach((owner, i) => {
      if (owner !== "") {
        lastFilledIndex = i
      }
    })

    // Extend/trim signers[]
    if (allFieldsFilled && value !== "") {
      copy.push("")
    } else if (lastFilledIndex === index && value === "") {
      copy = copy.slice(0, lastFilledIndex + 1)
    }

    setTotalSigners(copy.length - 1);
    setSigners(copy);
  };

  return (
    <div>
      <ModeToggle />

      <Fieldset>
        <Legend as="h2">Add Signers</Legend>
        <Paragraph css={{ color: "$textMuted" }}>
          Your contract will have one or more signers. We have prefilled the
          first owner with your connected wallet details, but you are free to
          change this to a different owner.
        </Paragraph>
        {signers.map((owner, i) => (
          <Field key={i} inactive={signers.length > 2 && i === totalSigners.valueOf() && owner === ""}>
            <Label>Signer {i + 1} address:</Label>
            <Input
              type="text"
              autoComplete="off"
              onChange={(e) => onOwnerChange(e.target.value, i)}
              value={owner}
            ></Input>
          </Field>
        ))}

        <hr />
        <Paragraph css={{ color: "$textMuted" }}>
          Specify how many of them have to confirm a transaction before it
          gets executed. In general, the more confirmations required, the more
          secure your contract is.
        </Paragraph>
        <Threshold>
          <Paragraph
            css={{
              fontWeight: "500",
              marginBottom: "$3",
            }}
          >
            Transaction requires the confirmation of
          </Paragraph>
          <Select
            css={{
              margin: "0 $2 0 0",
            }}
            onChange={(e) => {
              onThresholdChange(e.target.value);
            }}
            value={signerThreshold}
          >
            {[...Array(totalSigners).keys()].map((_, index) => {
              const thresholdOption = index + 1
              return <option value={thresholdOption.toString()} key={`thresholdOption-${thresholdOption.toString()}`}>{thresholdOption.toString()}</option>
            })}
          </Select>{" "}
          of total {totalSigners} signers{" "}
        </Threshold>

        <Button fullWidth onClick={onDeploy}>
          Deploy multisig contract
        </Button>
      </Fieldset>
    </div>
  );
}
