import { InjectedConnector } from "@starknet-react/core";
import { ComparisonRange, TransactionStatus } from "~/types";

export const shortStringFeltToStr = (felt: bigint): string => {
  const newStrB = Buffer.from(felt.toString(16), "hex");
  return newStrB.toString();
};

export const filterNonFeltChars = (input: string): string => {
  return input.replace(/[^0-9]/gi, "");
};

export const mapTargetHashToText = (hash: string): string => {
  let mapping = "";
  const map: { [key: string]: string } = {
    "232670485425082704932579856502088130646006032362877466777181098476241604910":
      "transfer",
  };
  if (Object.keys(map).includes(hash)) {
    mapping = map[hash];
  }
  return mapping;
};

export const mapWalletIdToText = (wallet: InjectedConnector): string => {
  let walletName = "";
  switch (wallet.id()) {
    case "argent-x": {
      walletName = "Argent X";
      break;
    }
    case "braavos": {
      walletName = "Braavos";
      break;
    }
    default: {
      walletName = wallet.name();
    }
  }
  return walletName;
};

export const compareStatuses = (
  a: TransactionStatus,
  b: TransactionStatus
): ComparisonRange => {
  let result: ComparisonRange = 0;

  const indexOfA = Object.keys(TransactionStatus).findIndex((key) => key === a);
  const indexOfB = Object.keys(TransactionStatus).findIndex((key) => key === b);

  if (indexOfA > indexOfB) {
    result = 1;
  } else if (indexOfA < indexOfB) {
    result = -1;
  }

  return result;
};
