import * as Tabs from '@radix-ui/react-tabs';
import {
  useStarknet
} from "@starknet-react/core";
import { styled } from '@stitches/react';
import Link from "next/link";
import React from "react";
import { useMultisigContract } from "~/hooks/multisigContractHook";
import ArbitraryTransaction from './ArbitraryTransaction';
import Erc20Transaction from './Erc20Transaction';
import { Fieldset, Legend } from "./Forms";

interface MultisigProps {
  contractAddress: string
}

const StyledTabs = styled(Tabs.List, {
  width: "100%",
  position: "relative",
  display: "flex",
  flexDirection: "row",
  marginTop: "$6",
  height: "$14",
});

const StyledTrigger = styled(Tabs.Trigger, {
  display: "flex",
  height: "100%",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexGrow: 1,
  background: "transparent",
  border: 0,
  borderBottom: "4px solid $textMuted",
  color: "$textMuted",
  fontFamily: "$body",
  fontSize: "$lg",
  '&[data-state="active"]': {
    color: "$text",
    borderBottom: "4px solid $accent",
  },
});

export const ExistingMultisig = ({ contractAddress }: MultisigProps) => {
  const { account } = useStarknet();
  
  const { contract: multisigContract, owners, threshold, transactions } = useMultisigContract(
    contractAddress
  );

  console.log(transactions)

  const multisigLink =
    "https://goerli.voyager.online/contract/" + contractAddress;

  return (
    <Fieldset>
      <Legend as="h2">Multisig Contract</Legend>
      <div>{account && owners.includes(account) ? "You are an owner of this wallet." : "You cannot sign transactions in this wallet."}</div>
      <div>Required signers: {threshold + "/" + owners.length}</div>
      <Link href={multisigLink}>
        Contract on explorer
      </Link>

      <Tabs.Root defaultValue="tab1" orientation="vertical">
        <StyledTabs aria-label="tabs example">
          <StyledTrigger value="tab1">ERC-20 Transfer</StyledTrigger>
          <StyledTrigger value="tab2">Arbitrary Transaction</StyledTrigger>
        </StyledTabs>
        
        <Tabs.Content value="tab1">
          <Erc20Transaction multisigContract={multisigContract} />
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <ArbitraryTransaction multisigContract={multisigContract} />
        </Tabs.Content>
      </Tabs.Root>

      {/* {multisigTransactionCount && +multisigTransactionCount > 0 && (
        <div>
          <div>
            <div>
              <fieldset>
                <legend>Latest multisig transaction's data</legend>

                <div>
                  Number of confirmations: {latestTxConfirmation}
                </div>
                <div>Target contract address:: {latestTxTarget}</div>
                <div>Target function selector: {latestTxFunction}</div>
                <div>
                  Target function parameters:{" ["}
                  {latestTxArgs.map((arg, i) => (
                    <div style={{ marginLeft: "20px" }}>
                      {arg}
                      {i != latestTxArgs.length - 1 ? "," : ""}
                    </div>
                  ))}
                  {" ]"}
                </div>
              </fieldset>
            </div>
          </div>
          <Button onClick={confirm}>
            Confirm the latest transaction
          </Button>
          <Button onClick={execute}>
            Execute the latest transaction
          </Button>
        </div>
      )} */}
    </Fieldset>
  );
}
