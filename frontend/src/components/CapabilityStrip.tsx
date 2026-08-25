import React from "react";
import { Wallet, ArrowLeftRight, Layers, FileCode, CheckSquare, ShieldCheck } from "lucide-react";

export const CapabilityStrip: React.FC = () => {
  const capabilities = [
    { label: "Accounts", icon: Wallet },
    { label: "Transfers", icon: ArrowLeftRight },
    { label: "Transactions", icon: ShieldCheck },
    { label: "Webhooks", icon: FileCode },
    { label: "Ledger", icon: Layers },
    { label: "Sandbox", icon: CheckSquare },
  ];

  return (
    <div className="w-full bg-[#030303] border-y border-neutral-900 select-none">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
        
        {/* Left side minimal descriptor statement */}
        <div className="text-left max-w-sm">
          <p className="text-xs font-bold text-white uppercase tracking-wider">
            Infrastructure Core
          </p>
          <p className="text-[11px] text-neutral-500 mt-1 leading-normal font-medium">
            One API for the financial infrastructure your product needs. Zero dependencies on legacy bank interfaces.
          </p>
        </div>

        {/* Right side horizontal cap array */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 w-full md:w-auto">
          {capabilities.map((cap) => {
            const IconComponent = cap.icon;
            return (
              <div
                key={cap.label}
                className="flex items-center space-x-2.5 px-4 py-2.5 rounded border border-neutral-900/60 bg-neutral-950/40 text-neutral-400 hover:text-white hover:border-neutral-800 transition-all duration-300"
              >
                <IconComponent className="h-4 w-4 text-neutral-500 shrink-0" />
                <span className="text-xs font-bold tracking-tight">{cap.label}</span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default CapabilityStrip;
