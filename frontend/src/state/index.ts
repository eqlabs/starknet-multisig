import { proxy, subscribe } from "valtio";

export type MultisigInfo = {
  address: string;
  transactionHash?: string;
};

export type State = {
  walletAddress: false | string;
  multisigs: Array<MultisigInfo>;
};

const storeKey = "starsign-state";

const defaultState: State = {
  walletAddress: false,
  multisigs: [],
};

const persistState = (state: State) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(storeKey, JSON.stringify(state));
  }
};

let initialState: State = defaultState;
if (typeof window !== "undefined") {
  try {
    const storedState = localStorage.getItem(storeKey);
    if (storedState) {
      initialState = JSON.parse(storedState);
    } else {
      persistState(defaultState);
    }
  } catch (_e) {
    console.warn(
      "Encountered an error while fetching persisted state, defaulting.",
      _e
    );
    initialState = defaultState;
  }
}

export const state = proxy<State>(initialState);

if (typeof window !== "undefined") {
  subscribe(state, () => {
    persistState(state);
  });
}
