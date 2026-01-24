import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useScrollToFragment = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        requestAnimationFrame(() => {
          element.scrollIntoView({ behavior: "smooth" });
        });
      }
    }
  }, [hash]);
};
