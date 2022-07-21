import Box from "~/components/Box";
import { Horizontal as HorizontalLogo } from "~/components/Logos";
import ThemeChanger from "~/components/ThemeChanger";
import Breadcrumb from "./Breadcrumb";

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
      <Box css={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", gap: "2em" }}>
        <div style={{ width: "100%", maxWidth: "190px", display: "flex" }}>
          <HorizontalLogo />
        </div>
        <Breadcrumb />
      </Box>
      <ThemeChanger />
    </Box>
  );
};

export default Header;
