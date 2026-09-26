import type { ButtonHTMLAttributes, ReactNode } from "react";

type AddButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
};

export default function AddButton({
  children,
  className = "",
  type = "button",
  ...props
}: AddButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`add-button ${className}`.trim()}
    >
      {children}
    </button>
  );
}
