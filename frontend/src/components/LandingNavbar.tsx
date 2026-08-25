import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Menu, X, ArrowRight, FolderKanban } from "lucide-react";
import logoImg from "../assets/logo.png";

export const LandingNavbar: React.FC = () => {
  const { token } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Monitor scrolling to transition the sticky background smoothly
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard Event: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Mouse Event: Close when clicking outside of the navbar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Smooth scroll helper for hash anchors
  const handleScrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      // Offset slightly to account for the sticky header
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
    <header
      ref={navRef}
      role="banner"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b ${
        isScrolled
          ? "bg-[#030303]/85 backdrop-blur-md border-neutral-900 shadow-lg"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Brand Logo Link */}
        <Link 
          to="/" 
          className="flex items-center space-x-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1"
          aria-label="FlexBank Home"
        >
          <img
            src={logoImg}
            alt=""
            className="h-7 w-7 rounded object-contain transition-transform group-hover:scale-105"
          />
          <span className="text-sm font-bold uppercase tracking-widest text-white">
            FlexBank
          </span>
        </Link>

        {/* Center: Desktop Navigation Anchor Links */}
        <nav role="navigation" aria-label="Main" className="hidden md:flex items-center space-x-8">
          <button
            onClick={() => handleScrollToSection("products")}
            className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1.5 py-0.5"
          >
            Products
          </button>
          <button
            onClick={() => handleScrollToSection("developers")}
            className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1.5 py-0.5"
          >
            Developers
          </button>
          <Link
            to="/docs"
            className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1.5 py-0.5"
          >
            Documentation
          </Link>
          <button
            onClick={() => handleScrollToSection("pricing")}
            className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1.5 py-0.5"
          >
            Pricing
          </button>
        </nav>

        {/* Right side: Desktop Session Actions */}
        <div className="hidden md:flex items-center space-x-4">
          {token ? (
            <Link
              to="/projects"
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1"
            >
              <FolderKanban className="h-4 w-4" />
              <span>Go to Console</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-2 py-1"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center space-x-1.5 rounded bg-white hover:bg-neutral-200 px-4 py-1.5 text-xs font-bold text-black active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303]"
              >
                <span>Start building</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Menu Toggle Button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors cursor-pointer"
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay Container (Animated smoothly via Tailwind height/opacity) */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 border-b border-neutral-900 bg-[#030303] px-6 py-4 space-y-6 ${
          isMobileMenuOpen
            ? "max-h-96 opacity-100 visible"
            : "max-h-0 opacity-0 invisible"
        }`}
      >
        <nav role="navigation" aria-label="Mobile" className="flex flex-col space-y-4 text-left">
          <button
            onClick={() => handleScrollToSection("products")}
            className="text-sm font-semibold text-neutral-400 hover:text-white text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded py-0.5"
          >
            Products
          </button>
          <button
            onClick={() => handleScrollToSection("developers")}
            className="text-sm font-semibold text-neutral-400 hover:text-white text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded py-0.5"
          >
            Developers
          </button>
          <Link
            to="/docs"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-sm font-semibold text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded py-0.5"
          >
            Documentation
          </Link>
          <button
            onClick={() => handleScrollToSection("pricing")}
            className="text-sm font-semibold text-neutral-400 hover:text-white text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded py-0.5"
          >
            Pricing
          </button>
        </nav>

        {/* Mobile session panel splits */}
        <div className="border-t border-neutral-900 pt-4 flex flex-col space-y-3">
          {token ? (
            <Link
              to="/projects"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center space-x-2 text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            >
              <FolderKanban className="h-4 w-4" />
              <span>Go to Console</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm font-semibold text-neutral-400 hover:text-white text-center py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded bg-white hover:bg-neutral-200 py-2.5 text-center text-sm font-bold text-black active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303]"
              >
                Start building
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default LandingNavbar;
