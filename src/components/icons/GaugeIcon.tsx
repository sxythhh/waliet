import { AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const GaugeIcon = ({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className = "",
}: AnimatedIconProps) => {
  const [scope, animate] = useAnimate();

  const hoverAnimation = async () => {
    animate(
      ".needle",
      { rotate: [0, 45, -20, 30, 0] },
      { duration: 0.8, ease: "easeInOut" },
    );
  };

  const resetAnimation = () => {
    animate(".needle", { rotate: 0 }, { duration: 0.3, ease: "easeInOut" });
  };

  return (
    <motion.svg
      ref={scope}
      onHoverStart={hoverAnimation}
      onHoverEnd={resetAnimation}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`cursor-pointer ${className}`}
    >
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
      <motion.path
        className="needle"
        style={{ transformOrigin: "12px 14px" }}
        d="m12 14 4-4"
      />
    </motion.svg>
  );
};

export default GaugeIcon;
