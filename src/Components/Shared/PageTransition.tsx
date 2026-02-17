import { motion } from "framer-motion";
import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Box } from "@mui/material";

const getRouteDepth = (pathname: string): number => {
  const path = pathname.toLowerCase();
  // Level 0: Main Tabs
  if (path === "/" || path === "/dashboard" || path === "/history" || path === "/profile" || path === "/schedule" || path === "/schema") return 0;

  // Level 2: Detail views
  if (path.startsWith("/match/") || path.includes("/email")) return 2;

  // Level 1: Feature pages
  return 1;
};

// Global variable to track depth across remounts
let prevDepth = 0;

export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const depth = getRouteDepth(location.pathname);

  let direction = 0;
  if (depth > prevDepth) direction = 1;
  else if (depth < prevDepth) direction = -1;

  useEffect(() => {
    prevDepth = depth;
  }, [depth]);

  const variants = {
    initial: (dir: number) => ({
      x: dir > 0 ? "100%" : dir < 0 ? "-25%" : 0,
      opacity: dir === 0 ? 0 : 1,
      zIndex: dir > 0 ? 10 : 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
      zIndex: 1,
      transition: { type: "spring", stiffness: 260, damping: 20 }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? "100%" : dir > 0 ? "-25%" : 0,
      opacity: dir === 0 ? 0 : 1,
      zIndex: dir < 0 ? 10 : 0,
      transition: { type: "spring", stiffness: 260, damping: 20 }
    })
  };

  return (
    <Box
      component={motion.div}
      custom={direction}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
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
