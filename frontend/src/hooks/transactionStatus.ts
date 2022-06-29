import { useMachine } from "@xstate/react";
import { createMachine } from "xstate";
import { TransactionState } from "~/types";

const transactionStateMachine = createMachine({
  id: "transactionStatus",
  schema: {
    context: {} as { value: TransactionState },
    events: {} as
      | { type: "ADVANCE" }
      | { type: "REJECT" }
      | { type: "DEPLOYED" },
  },
  initial: TransactionState.NOT_RECEIVED,
  states: {
    [TransactionState.NOT_RECEIVED]: {
      on: {
        ADVANCE: TransactionState.RECEIVED,
        REJECT: TransactionState.REJECTED,
        DEPLOYED: TransactionState.ACCEPTED_ON_L2,
      },
    },
    [TransactionState.RECEIVED]: {
      on: {
        ADVANCE: TransactionState.PENDING,
        REJECT: TransactionState.REJECTED,
      },
    },
    [TransactionState.PENDING]: {
      on: {
        ADVANCE: TransactionState.ACCEPTED_ON_L2,
        REJECT: TransactionState.REJECTED,
      },
    },
    [TransactionState.ACCEPTED_ON_L2]: {
      on: {
        ADVANCE: TransactionState.ACCEPTED_ON_L1,
        REJECT: TransactionState.REJECTED,
      },
    },
    [TransactionState.ACCEPTED_ON_L1]: {},
    [TransactionState.REJECTED]: {
      on: {
        ADVANCE: TransactionState.NOT_RECEIVED,
      },
    },
  },
});

export const useTransactionStatus = () => {
  return useMachine(transactionStateMachine);
};
