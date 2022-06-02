import Box from "~/components/Box";

const Footer: React.FC = () => {
  return (
    <Box
      css={{
        display: "flex",
        alignItems: "middle",
        justifyContent: "center",
        padding: "$3 0",
      }}
    >
      <p>
        Please check{" "}
        <a href="https://github.com/eqlabs/starknet-multisig" target="_blank" rel="noreferrer">
          GitHub
        </a>{" "}
        for more information.
      </p>
    </Box>
  );
};

export default Footer;
