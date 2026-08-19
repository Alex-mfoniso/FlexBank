import React from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const norm = status?.toLowerCase().trim();

  let styles = "bg-slate-100 text-slate-700 border-slate-200";
  let label = status;

  switch (norm) {
    // Transfer / Webhook / Ledger statuses
    case "successful":
    case "success":
    case "delivered":
    case "posted":
    case "active":
      styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
      label = norm === "delivered" ? "Delivered" : norm === "posted" ? "Posted" : norm === "active" ? "Active" : "Successful";
      break;

    case "pending":
    case "processing":
    case "draft":
      styles = "bg-amber-50 text-amber-700 border-amber-200";
      label = norm === "pending" ? "Pending" : norm === "processing" ? "Processing" : "Draft";
      break;

    case "failed":
    case "error":
    case "cancelled":
    case "void":
    case "disabled":
    case "closed":
      styles = "bg-rose-50 text-rose-700 border-rose-200";
      label = norm === "failed" ? "Failed" : norm === "disabled" ? "Disabled" : norm === "closed" ? "Closed" : norm === "cancelled" ? "Cancelled" : "Void";
      break;

    case "frozen":
    case "suspended":
    case "reversed":
      styles = "bg-blue-50 text-indigo-700 border-indigo-200";
      label = norm === "frozen" ? "Frozen" : norm === "suspended" ? "Suspended" : "Reversed";
      break;

    default:
      break;
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold border capitalize shadow-2xs ${styles}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0" />
      {label}
    </span>
  );
};
export default StatusBadge;
