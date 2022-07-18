import { number } from "starknet";
import { starknet } from "hardhat";
import { StarknetContract } from "hardhat/types";
import { BigNumber } from "ethers";
import { expect } from "chai";
import {
  randomBigNumber,
  randomIntegerFromRange,
  assertErrorMsg,
} from "./utils";

describe("Test utilities", () => {
  let targetContract: StarknetContract;

  before(async () => {
    const targetContractFactory = await starknet.getContractFactory("Target");
    targetContract = await targetContractFactory.deploy();
  });

  describe("assert_unique_elements tests", function () {
    it("pass empty array", async () => {
      await targetContract.call("assert_unique_elements_wrapper", {
        data: [],
      });
    });

    it("pass single element", async () => {
      await targetContract.call("assert_unique_elements_wrapper", {
        data: [1],
      });
    });

    it("pass unique elements", async () => {
      await targetContract.call("assert_unique_elements_wrapper", {
        data: [2, 1, 3, 10, number.toBN(targetContract.address)],
      });

      await targetContract.call("assert_unique_elements_wrapper", {
        data: [-1, 1, 0, 22],
      });
    });

    it("random valid checks", async () => {
      const numOfRandomChecks = 10;

      for (let i = 0; i < numOfRandomChecks; i++) {
        const arrayLength = randomIntegerFromRange(0, 40);
        const arr: Map<string, BigNumber> = new Map();

        for (let j = 0; j < arrayLength; j++) {
          let el = randomBigNumber();
          while (arr.has(el.toString())) {
            el = randomBigNumber();
          }

          arr.set(el.toString(), el);
        }

        await targetContract.call("assert_unique_elements_wrapper", {
          data: [...arr.values()],
        });
      }
    });

    it("pass duplicates", async () => {
      try {
        await targetContract.invoke("assert_unique_elements_wrapper", {
          data: [1, 1],
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "signers not unique");
      }
    });

    it("multiple duplicates", async () => {
      try {
        await targetContract.invoke("assert_unique_elements_wrapper", {
          data: [1, 0, 2, 3, 1, 2, 7],
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "signers not unique");
      }
    });

    it("duplicate adresses", async () => {
      try {
        const address = number.toBN(targetContract.address);
        await targetContract.invoke("assert_unique_elements_wrapper", {
          data: [1, 0, address, 20, address],
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "signers not unique");
      }
    });
  });
});
