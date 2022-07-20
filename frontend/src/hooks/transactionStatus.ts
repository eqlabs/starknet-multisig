import { useMachine } from "@xstate/react";
import { createMachine } from "xstate";
import { TransactionStatus } from "~/types";

const transactionStateMachine = createMachine({
  id: "transactionStatus",
  schema: {
    context: {} as { value: TransactionStatus },
    events: {} as
      | { type: "ADVANCE" }
      | { type: "REJECT" }
      | { type: "DEPLOYED" },
  },
  initial: TransactionStatus.NOT_RECEIVED,
  states: {
    [TransactionStatus.NOT_RECEIVED]: {
      on: {
        ADVANCE: TransactionStatus.RECEIVED,
        REJECT: TransactionStatus.REJECTED,
        DEPLOYED: TransactionStatus.ACCEPTED_ON_L2,
      },
    },
    [TransactionStatus.RECEIVED]: {
      on: {
        ADVANCE: TransactionStatus.PENDING,
        REJECT: TransactionStatus.REJECTED,
      },
    },
    [TransactionStatus.PENDING]: {
      on: {
        ADVANCE: TransactionStatus.ACCEPTED_ON_L2,
        REJECT: TransactionStatus.REJECTED,
      },
    },
    [TransactionStatus.ACCEPTED_ON_L2]: {
      on: {
        ADVANCE: TransactionStatus.ACCEPTED_ON_L1,
        REJECT: TransactionStatus.REJECTED,
      },
    },
    [TransactionStatus.ACCEPTED_ON_L1]: {},
    [TransactionStatus.REJECTED]: {
      on: {
        ADVANCE: TransactionStatus.NOT_RECEIVED,
      },
    },
  },
});

export const useTransactionStatus = () => {
  return useMachine(transactionStateMachine);
};
