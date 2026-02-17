import { ReactNode } from "react";
import { Box } from "@mui/material";

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        gridArea: "1/1",
        width: "100%",
        height: "100%",
        bgcolor: "background.default",
        overflowX: "hidden"
      }}
    >
      {children}
    </Box>
  );
}
