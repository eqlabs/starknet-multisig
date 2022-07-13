import { expect } from "chai";
import { number } from "starknet";
import { getSelectorFromName } from "starknet/dist/utils/hash";
import { BigNumber, utils } from "ethers";

export const defaultPayload = (
  contractAddress: string,
  newValue: number,
  txIndex: number
) => {
  const setSelector = number.toBN(getSelectorFromName("set_balance"));
  const target = number.toBN(contractAddress);
  const setPayload = {
    to: target,
    function_selector: setSelector,
    calldata: [newValue],
    tx_index: txIndex,
  };

  return setPayload;
};

export const assertErrorMsg = (full: string, expected: string) => {
  expect(full).to.deep.contain("Transaction rejected. Error message:");
  const match = /Error message: (.+?)\n/.exec(full);
  if (match && match.length > 1) {
    expect(match[1]).to.equal(expected);
    return;
  }
  expect.fail("No expected error found: " + expected);
};

export function randomIntegerFromRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export function randomBigNumber() {
  return BigNumber.from(utils.randomBytes(31));
}
