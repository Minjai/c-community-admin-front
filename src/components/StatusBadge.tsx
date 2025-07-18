import React from "react";

interface StatusBadgeProps {
  status: "온라인" | "오프라인" | "삭제";
  className?: string;
}

const statusStyle = {
  온라인: "bg-green-200 text-green-600 font-semibold",
  오프라인: "bg-gray-400 text-black font-semibold",
  삭제: "bg-red-300 text-red-700 font-semibold",
};

export const statusNumberColor = {
  온라인: "text-green-600 font-bold",
  오프라인: "text-black font-bold",
  삭제: "text-red-600 font-bold",
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => (
  <span
    className={`inline-flex items-center px-4 py-2 rounded-md text-base ${statusStyle[status]} ${className}`}
  >
    {status}
  </span>
);

export default StatusBadge;
