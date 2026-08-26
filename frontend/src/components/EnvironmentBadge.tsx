import React from "react";

export const EnvironmentBadge: React.FC = () => {
  return (
    <div className="flex flex-col items-start font-mono text-left select-none shrink-0">
      <span className="text-[9px] font-black px-2.5 py-0.5 rounded border border-amber-900/40 bg-amber-950/20 text-amber-500 uppercase tracking-widest leading-none">
        TEST MODE
      </span>
      <span className="text-[7.5px] font-bold text-neutral-600 mt-1 uppercase tracking-wider">
        No real money
      </span>
    </div>
  );
};

export default EnvironmentBadge;
