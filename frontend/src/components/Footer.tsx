import React from "react";
import { Link } from "react-router-dom";
import logoImg from "../assets/logo.png";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  // Scroll to section helper with slight header offset
  const handleScrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 64;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <footer id="pricing" className="bg-[#030303] border-t border-neutral-900 px-6 py-16 lg:px-12 select-none relative">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Top Split section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-neutral-900/60">
          
          {/* Brand info (col-span-4) */}
          <div className="md:col-span-4 space-y-4 text-left">
            <Link 
              to="/" 
              className="flex items-center space-x-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1"
            >
              <span className="text-sm font-black uppercase tracking-widest text-white">
                Ricarut
              </span>
            </Link>
            <p className="text-[11px] text-neutral-500 leading-relaxed max-w-xs font-medium">
              Developer-first financial core ledger infrastructure. Provision virtual accounts, maintain balanced transactional logs, and build products seamlessly in our sandbox.
            </p>
          </div>

          {/* Symmetrical Link Columns (col-span-8) */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
            
            {/* Column 1: Product */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-wider text-neutral-400 font-mono">Product</h4>
              <ul className="space-y-2 text-[11px] font-semibold text-neutral-500">
                <li>
                  <button
                    onClick={() => handleScrollToSection("products")}
                    className="hover:text-white transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                  >
                    Overview
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleScrollToSection("products")}
                    className="hover:text-white transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                  >
                    Accounts
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleScrollToSection("products")}
                    className="hover:text-white transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                  >
                    Transfers
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleScrollToSection("products")}
                    className="hover:text-white transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                  >
                    Transactions
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleScrollToSection("developers")}
                    className="hover:text-white transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                  >
                    Sandbox
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 2: Developers */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-wider text-neutral-400 font-mono">Developers</h4>
              <ul className="space-y-2 text-[11px] font-semibold text-neutral-500">
                <li>
                  <Link 
                    to="/docs" 
                    className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/docs" 
                    className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                  >
                    API Reference
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => handleScrollToSection("developers")}
                    className="hover:text-white transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                  >
                    Quickstart
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleScrollToSection("developers")}
                    className="hover:text-white transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                  >
                    API Logs
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Company */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-wider text-neutral-400 font-mono">Company</h4>
              <ul className="space-y-2 text-[11px] font-semibold text-neutral-500">
                <li>
                  <span className="cursor-default text-neutral-600 font-medium">About Ricarut</span>
                </li>
                <li>
                  <span className="cursor-default text-neutral-600 font-medium">Contact</span>
                </li>
              </ul>
            </div>

            {/* Column 4: Legal */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-wider text-neutral-400 font-mono">Legal</h4>
              <ul className="space-y-2 text-[11px] font-semibold text-neutral-500">
                <li>
                  <span className="cursor-default text-neutral-600 font-medium">Privacy Policy</span>
                </li>
                <li>
                  <span className="cursor-default text-neutral-600 font-medium">Terms of Service</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

        {/* Bottom copyright notice */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left select-none text-[10px] text-neutral-600 font-bold tracking-tight uppercase">
          <p>© {currentYear} Ricarut Inc. All rights reserved.</p>
          <p>DEVELOPER INFRASTRUCTURE SERVICES • TEST MODE GATEWAY</p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
