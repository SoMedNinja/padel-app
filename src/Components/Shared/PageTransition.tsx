import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

// Note: A true iOS transition would require knowing if we are pushing or popping.
// Since we don't track navigation direction easily in simple React Router,
// we default to a "slide up/fade" for entering and "fade out" for leaving, or a subtle lateral move.
// A full "slide from right" (push) vs "slide from left" (pop) requires history state management.
// For now, we implement a high-quality "modern app" feel:
// Enter: slight slide up + fade in
// Exit: slight scale down + fade out (mimics iOS modal dismissal or Android default)
//
// OR, if the user explicitly asked for "slide-in (right-to-left)", we can do that,
// but without direction awareness it looks weird on "Back".
//
// Let's try a "Forward" assumption (slide from right) but keep it subtle so "Back" doesn't look broken.
// Or we can use the location key to determine order if we had a history stack.

// Given the "iOS Alignment" request, a subtle "cupertino-like" transition is usually:
// New page slides in from right (covering old).
// Old page slides a bit to left (parallax) and darkens.

// Since we can't reliably know direction without a custom router wrapper,
// we will use a "Fade + slight zoom/slide" which feels native on both forward/back.

const variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
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
        mass: 1
      }}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </motion.div>
  );
}
