export function shortStringFeltToStr(felt: bigint): string {
  const newStrB = Buffer.from(felt.toString(16), "hex");
  return newStrB.toString();
}

export function filterNonFeltChars(input: string): string {
  return input.replace(/[^0-9]/gi, "");
}
