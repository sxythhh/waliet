import { AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const HeartIcon = ({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className = "",
}: AnimatedIconProps) => {
  const [scope, animate] = useAnimate();

  const startAnimate = async () => {
    await animate(
      ".heart",
      {
        scale: [1, 1.15, 1, 1.25, 1],
      },
      {
        duration: 0.6,
        ease: "easeOut",
      },
    );
  };

  const endAnimation = () => {
    animate(
      ".heart",
      { scale: 1 },
      {
        duration: 0.2,
        ease: "easeOut",
      },
    );
  };

  return (
    <motion.svg
      ref={scope}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} cursor-pointer`}
      onHoverStart={startAnimate}
      onHoverEnd={endAnimation}
    >
      <motion.path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <motion.path
        className="heart"
        style={{ transformOrigin: "50% 50%" }}
        d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"
      />
    </motion.svg>
  );
};

export default HeartIcon;
