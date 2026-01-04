import { AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const MailIcon = ({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className = "",
}: AnimatedIconProps) => {
  const [scope, animate] = useAnimate();

  const hoverAnimation = async () => {
    animate(".mail-path", { pathLength: 0, opacity: 0 }, { duration: 0 });

    await animate(
      ".mail-path",
      { pathLength: [0, 1], opacity: [0, 1] },
      { duration: 0.6, ease: "easeInOut" },
    );

    animate(
      ".mail-path",
      { scale: [1, 1.05, 1] },
      { duration: 0.3, ease: "easeOut" },
    );
  };

  const hoverEndAnimation = () => {
    animate(
      ".mail-path",
      { pathLength: 1, opacity: 1, scale: 1 },
      { duration: 0.2 },
    );
  };

  return (
    <motion.div
      ref={scope}
      onHoverStart={hoverAnimation}
      onHoverEnd={hoverEndAnimation}
      className="inline-flex"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <motion.rect
          className="mail-path"
          x="2"
          y="4"
          width="20"
          height="16"
          rx="2"
          initial={{ pathLength: 1, opacity: 1 }}
          style={{ transformOrigin: "center" }}
        />
        <motion.path
          className="mail-path"
          d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
          initial={{ pathLength: 1, opacity: 1 }}
          style={{ transformOrigin: "center" }}
        />
      </svg>
    </motion.div>
  );
};

export default MailIcon;
