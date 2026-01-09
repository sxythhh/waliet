import { AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const LayersIcon = ({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className = "",
}: AnimatedIconProps) => {
  const [scope, animate] = useAnimate();

  const hoverAnimation = async () => {
    await animate(
      ".top-block",
      { x: -20 },
      { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    );
  };

  const hoverEndAnimation = async () => {
    await animate(
      ".top-block",
      { x: 0 },
      { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    );
  };

  return (
    <motion.svg
      ref={scope}
      onHoverStart={hoverAnimation}
      onHoverEnd={hoverEndAnimation}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      strokeWidth={strokeWidth}
      xmlns="http://www.w3.org/2000/svg"
      className={`cursor-pointer ${className}`}
    >
      <motion.rect
        className="top-block"
        x="44"
        y="22"
        width="56"
        height="36"
        rx="10"
        fill={color}
      />
      <rect x="20" y="62" width="64" height="40" rx="12" fill={color} />
    </motion.svg>
  );
};

export default LayersIcon;
