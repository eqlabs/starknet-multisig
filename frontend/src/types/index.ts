import { ReactNode } from "react";

export type SSRProps = {
  children?: ReactNode;
  contractAddress: string;
};

export type MultisigTransaction = {
  txId: number;
  to: string;
  function_selector: string;
  calldata_len: number;
  calldata: string[];
  executed: boolean;
  num_confirmations: number;
};
