import { motion } from "framer-motion";
import { styled } from "../../stitches.config";

const BorderedContainer = styled(motion.div, {
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "520px",
  margin: "0 auto",
  border: "3px solid $indigo12",
  padding: "$8",
});

export default BorderedContainer
