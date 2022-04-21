import { proxy, subscribe } from 'valtio';

export type State = {
  walletAddress: false | string
  multisigs: Array<string>
}

const storeKey = 'starsign-state'

const defaultState: State = {
  walletAddress: false,
  multisigs: []
};

const persistState = (state: State) => {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

const getInitialState = () => {
  let initialState = defaultState
  try {
    const storedState = localStorage.getItem(storeKey);
    if (storedState) {
      initialState = JSON.parse(storedState)
    } else {
      persistState(defaultState)
    }
  } catch (_e) {
    console.warn('Encountered an error while fetching persisted state, defaulting.', _e)
    initialState = defaultState
  }
  return initialState
};

export const state = proxy<State>(getInitialState())

subscribe(state, () => {
  console.log('does this work at all?')
  persistState(state)
});
