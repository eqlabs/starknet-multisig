import * as Tabs from '@radix-ui/react-tabs';
import {
  useStarknet
} from "@starknet-react/core";
import { styled } from '@stitches/react';
import Link from "next/link";
import { useEffect, useState } from 'react';
import { validateAndParseAddress } from 'starknet';
import { useMultisigContract } from "~/hooks/multisigContractHook";
import { pendingStatuses } from '~/types';
import ArbitraryTransaction from './ArbitraryTransaction';
import DeploymentStatus from './DeploymentStatus';
import Erc20Transaction from './Erc20Transaction';
import { Legend } from "./Forms";
import MultisigTransactionList from './MultisigTransactionList';
import SkeletonLoader from './SkeletonLoader';

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
  const { contract: multisigContract, status, loading, owners, threshold, transactions } = useMultisigContract(
    contractAddress
  );
  
  const [firstLoad, setFirstLoad] = useState<boolean>(true)
  const [pendingStatus, setPendingStatus] = useState<boolean>(false)

  const multisigLink =
    "https://goerli.voyager.online/contract/" + contractAddress;

  useEffect(() => {
    if (!loading) {
      if (!pendingStatuses.includes(status)) {
        const delay = firstLoad ? 0 : 2000
        setTimeout(() => {
          setPendingStatus(false)
        }, delay)
        setFirstLoad(false)
      } else {
        setPendingStatus(true)
      }
    }
  }, [firstLoad, loading, status])

  return (
    <>
      {!pendingStatus ? (<>
        <Legend as="h2"><Link href={multisigLink}>Multisig Contract</Link></Legend>
        {loading ? <SkeletonLoader /> : <div>{account && owners.includes(validateAndParseAddress(account)) ? "You are an owner of this wallet." : "You cannot sign transactions in this wallet."}</div>}
        {loading ? <SkeletonLoader /> : <div>Required signers: {threshold + "/" + owners.length}</div>}

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
        <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}><span>Deploying...</span><Link href={multisigLink}>See transaction on Voyager</Link></div>

        <DeploymentStatus status={status} />
      </>}
    </>
  );
}
