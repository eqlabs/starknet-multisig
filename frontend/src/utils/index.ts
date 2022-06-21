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

export const padTo64Bits = (input: string): string => {
  let diff = 0;
  let returnable = input;
  if (input.length < 64) {
    diff = 64 - input.length;
    const parts = [
      input.substring(0, 2),
      "",
      input.substring(2, input.length - 1),
    ];
    parts[1] = [...Array(diff).keys()].map(() => "0").join();
    returnable = parts.join();
  }

  return returnable;
};
