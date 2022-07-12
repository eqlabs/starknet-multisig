import * as Tabs from '@radix-ui/react-tabs';
import {
  useStarknet
} from "@starknet-react/core";
import { styled } from '@stitches/react';
import Link from "next/link";
import { validateAndParseAddress } from 'starknet';
import { useMultisigContract } from "~/hooks/multisigContractHook";
import { pendingStatuses } from '~/types';
import ArbitraryTransaction from './ArbitraryTransaction';
import Erc20Transaction from './Erc20Transaction';
import { Legend } from "./Forms";
import MultisigTransactionList from './MultisigTransactionList';
import Spinner from './Spinner';

interface MultisigProps {
  contractAddress: string
}

const StyledTabs = styled(Tabs.List, {
  width: "100%",
  position: "relative",
  display: "flex",
  flexDirection: "row",
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
  const { contract: multisigContract, status, owners, threshold, transactions } = useMultisigContract(
    contractAddress
  );

  console.log(status);

  const multisigLink =
    "https://goerli.voyager.online/contract/" + contractAddress;

  return (
    <>
      <Legend as="h2"><Link href={multisigLink}>Multisig Contract</Link></Legend>

      {!pendingStatuses.includes(status) ? (<>
        <div>{account && owners.includes(validateAndParseAddress(account)) ? "You are an owner of this wallet." : "You cannot sign transactions in this wallet."}</div>
        <div>Required signers: {threshold + "/" + owners.length}</div>

        {transactions.length > 0 && (
          <>
            <hr></hr>
            <Legend as="h2">Pending Transactions</Legend>
            <MultisigTransactionList multisigContract={multisigContract} transactions={transactions} threshold={threshold} />
          </>
        )}

        <hr></hr>
        <Legend as="h2">New Transaction</Legend>
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
      </>
      ) : <>
        <Spinner />
        <Legend as="h3">Contract status: {status}</Legend>
      </>}
    </>
  );
}
