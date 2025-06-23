import React from "react";
import {
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  action: "add" | "delete" | "refresh" | "edit" | "up" | "down";
  label?: string;
  size?: "sm" | "md" | "lg";
}

const ActionButton: React.FC<ActionButtonProps> = ({
  action,
  label,
  size = "md",
  className = "",
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-md focus:outline-none transition-colors";

  const actionClasses = {
    add: "bg-blue-600 text-white hover:bg-blue-700",
    delete: "bg-red-600 text-white hover:bg-red-700",
    refresh: "bg-blue-600 text-white hover:bg-blue-700",
    edit: "bg-yellow-600 text-white hover:bg-yellow-700",
    up: "bg-gray-600 text-white hover:bg-gray-700",
    down: "bg-gray-600 text-white hover:bg-gray-700",
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-sm",
    md: "px-3 py-1.5 text-base",
    lg: "px-4 py-2 text-lg",
  };

  const getIcon = () => {
    switch (action) {
      case "add":
        return <PlusIcon className="h-5 w-5" />;
      case "delete":
        return <TrashIcon className="h-5 w-5" />;
      case "refresh":
        return <ArrowPathIcon className="h-5 w-5" />;
      case "edit":
        return <PencilIcon className="h-5 w-5" />;
      case "up":
        return <ChevronUpIcon className="h-5 w-5" />;
      case "down":
        return <ChevronDownIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${actionClasses[action]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {getIcon()}
      {label && <span className="ml-1">{label}</span>}
    </button>
  );
};

export default ActionButton;
