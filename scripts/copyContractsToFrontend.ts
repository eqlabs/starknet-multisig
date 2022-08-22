import * as fs from "fs";

// Used for copying the contracts artifacts for the frontend

async function main() {
  const sourceFolderBase = __dirname + "/../starknet-artifacts/contracts/";
  const targetFolder = __dirname + "/../../frontend/public/";

  const multisigContract = "Multisig.json";

  const copyFile = async (sourcePath: string, fileName: string) => {
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder);
    }

    const file = sourceFolderBase + sourcePath + fileName;
    await fs.copyFileSync(file, targetFolder + fileName);
    console.log("Copied file " + file + " to " + targetFolder + fileName);
  };
  copyFile("Multisig.cairo/", multisigContract);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
