import { expect } from "chai";
import { number } from "starknet";
import { getSelectorFromName } from "starknet/dist/utils/hash";
import { BigNumber, ethers, utils } from "ethers";
import { TransactionReceipt } from "hardhat/types";

export const defaultPayload = (
  contractAddress: string,
  newValue: number,
  nonce: number
) => {
  const setSelector = number.toBN(getSelectorFromName("set_balance"));
  const target = number.toBN(contractAddress);
  const setPayload = {
    to: target,
    function_selector: setSelector,
    calldata: [newValue],
    nonce: nonce,
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

export interface IEventDataEntry {
  data: any;
  isAddress?: boolean;
}

export const assertEvent = (
  receipt: TransactionReceipt,
  eventName: string,
  eventData: IEventDataEntry[]
) => {
  const eventKey = getSelectorFromName(eventName);
  const foundEvent = receipt.events.filter((e) =>
    e.keys.some((a) => a == eventKey)
  );
  if (!foundEvent || foundEvent.length != 1 || foundEvent[0].keys.length != 1) {
    expect.fail("No event " + eventName + " found");
  }

  expect(foundEvent[0].data.length).to.equal(eventData.length);
  for (let i = 0; i < eventData.length; i++) {
    if (eventData[i].isAddress) {
      // Addresses in events are not padded to 32 bytes by default, for some reason
      expect(ethers.utils.hexZeroPad(eventData[i].data, 32)).to.equal(
        ethers.utils.hexZeroPad(foundEvent[0].data[i], 32)
      );
    } else {
      expect(eventData[i].data).to.equal(foundEvent[0].data[i]);
    }
  }
};

// Checks that there is a generic revert. A generic revert is something which doesn't have an error message coming from code - for example the called function doesn't exist
export const assertGenericRevert = (error: string) => {
  // Couldn't find anything precise in the error message to detect generic revert. These two are the best I could come up with
  // This is checked so that we know there's a problem in the "call_contract" part
  expect(error).to.deep.contain("call_contract");
  // I guess this is included in all error messages, but at least this checks that it's an execution error
  expect(error).to.deep.contain("Transaction rejected. Error message:");
};
