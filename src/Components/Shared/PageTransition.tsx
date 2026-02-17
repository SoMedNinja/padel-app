import { motion } from "framer-motion";
import { ReactNode } from "react";

const variants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </motion.div>
  );
}
