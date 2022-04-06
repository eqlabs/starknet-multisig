import Box from "~/components/Box";
import { Horizontal as HorizontalLogo } from "~/components/Logos";
import ThemeChanger from "~/components/ThemeChanger";

const Header: React.FC = () => {
  return (
    <Box
      css={{
        display: "flex",
        alignItems: "middle",
        justifyContent: "space-between",
        padding: "$6 0",
      }}
    >
      <Box css={{ width: "100%", maxWidth: "190px" }}>
        <HorizontalLogo />
      </Box>
      <ThemeChanger />
    </Box>
  );
};

export default Header;
