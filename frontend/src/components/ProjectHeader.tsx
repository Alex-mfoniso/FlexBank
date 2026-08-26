import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  FolderKanban,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Plus,
  AlertTriangle,
  Menu,
  FileCode
} from "lucide-react";

interface ProjectHeaderProps {
  projectId?: string;
  projectName?: string;
  onOpenMobileMenu: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  projectId,
  projectName,
  onOpenMobileMenu
}) => {
  const {
    projects,
    environment,
    setEnvironment,
    user,
    logout
  } = useApp();

  const navigate = useNavigate();
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const projectRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside clicks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProjectSwitch = (id: string) => {
    setIsProjectDropdownOpen(false);
    navigate(`/projects/${id}/overview`);
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-900 bg-[#030303] px-4 lg:px-8 font-mono relative z-20 select-none">
      <div className="flex items-center space-x-4">
        
        {/* Mobile Hamburger toggle */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden text-neutral-500 hover:text-white transition-colors cursor-pointer"
          aria-label="Open project menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Console Switcher Dropdown */}
        {projects.length > 0 ? (
          <div ref={projectRef} className="relative">
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center space-x-2 rounded border border-neutral-900 bg-neutral-950 px-3.5 py-1.5 text-xs font-bold text-neutral-300 hover:text-white hover:border-neutral-800 transition-all focus:outline-none cursor-pointer"
            >
              <FolderKanban className="h-4 w-4 text-neutral-500 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[180px] uppercase tracking-wide">
                {projectId && projectName ? projectName : "Select Project"}
              </span>
              <ChevronDown className="h-4 w-4 text-neutral-500 shrink-0" />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 origin-top-left rounded border border-neutral-900 bg-neutral-950 shadow-xl focus:outline-none z-50 p-1 font-mono">
                <div className="p-2 border-b border-neutral-900">
                  <span className="block text-[8px] font-black text-neutral-600 uppercase tracking-widest">
                    Switch Active Console
                  </span>
                </div>
                <div className="py-1 max-h-60 overflow-y-auto">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => handleProjectSwitch(proj.id)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs rounded transition-all uppercase tracking-wide cursor-pointer ${
                        proj.id === projectId
                          ? "bg-indigo-950/40 font-black text-indigo-400 border border-indigo-900/30"
                          : "text-neutral-400 hover:bg-neutral-900 hover:text-white border border-transparent"
                      }`}
                    >
                      <span className="truncate pr-4">{proj.name}</span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 uppercase bg-amber-950/20 text-amber-500 border border-amber-900/40 rounded">
                        {proj.environment}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="p-1 border-t border-neutral-900">
                  <Link
                    to="/projects"
                    onClick={() => setIsProjectDropdownOpen(false)}
                    className="flex w-full items-center justify-center space-x-1.5 rounded bg-indigo-600 py-1.5 text-center text-[10px] font-bold uppercase text-white hover:bg-indigo-500 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Create Project</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Symmetrical Environment Toggle switch */}
        {projectId && (
          <div className="flex items-center space-x-1 bg-neutral-950/80 p-0.5 rounded border border-neutral-900 text-[10px]">
            <button
              onClick={() => setEnvironment("test")}
              className={`px-2 py-1 text-[9px] font-bold rounded uppercase tracking-wider transition-all cursor-pointer ${
                environment === "test"
                  ? "bg-amber-950/30 text-amber-500 border border-amber-900/40 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-400"
              }`}
            >
              Test
            </button>
            <button
              onClick={() => setEnvironment("live")}
              className={`px-2 py-1 text-[9px] font-bold rounded uppercase tracking-wider transition-all ${
                environment === "live"
                  ? "bg-rose-950/30 text-rose-500 border border-rose-900/40 shadow-xs"
                  : "text-neutral-700 cursor-not-allowed"
              }`}
              title="Live environments are coming soon"
            >
              Live
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        
        {/* Sandbox Active Banner */}
        {environment === "test" && projectId && (
          <div className="hidden md:flex items-center space-x-1 border border-amber-900/40 bg-amber-950/10 px-2.5 py-1 text-[9px] font-bold uppercase text-amber-500 rounded animate-pulse">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>Sandbox Simulator Active</span>
          </div>
        )}

        {/* Global API Docs button */}
        <Link
          to="/docs"
          className="hidden sm:flex items-center space-x-1 border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 px-3 py-1.5 text-[10px] font-bold uppercase text-neutral-400 hover:text-white rounded transition-colors"
        >
          <FileCode className="h-3.5 w-3.5" />
          <span>API Docs</span>
        </Link>

        {/* User Account Settings Dropdown */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-900 bg-neutral-950 text-neutral-400 hover:text-white transition-all focus:outline-none cursor-pointer"
            aria-label="Account Settings Menu"
          >
            <UserIcon className="h-4 w-4" />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded border border-neutral-900 bg-neutral-950 p-1 shadow-xl focus:outline-none z-50 font-mono">
              <div className="px-3 py-2 border-b border-neutral-900 text-left">
                <p className="text-[11px] font-bold text-white uppercase tracking-wider truncate">
                  {user ? user.name : "Alexander Mfoniso"}
                </p>
                <p className="text-[9px] text-neutral-500 mt-0.5 truncate font-mono">
                  {user ? user.email : ""}
                </p>
              </div>
              <div className="py-1">
                <Link
                  to="/dashboard"
                  onClick={() => setIsUserDropdownOpen(false)}
                  className="block px-3 py-1.5 text-left text-[10px] font-bold uppercase text-neutral-400 hover:text-indigo-400 transition-colors rounded"
                >
                  Dashboard
                </Link>
                <Link
                  to="/projects"
                  onClick={() => setIsUserDropdownOpen(false)}
                  className="block px-3 py-1.5 text-left text-[10px] font-bold uppercase text-neutral-400 hover:text-indigo-400 transition-colors rounded"
                >
                  Projects
                </Link>
                <Link
                  to="/docs"
                  onClick={() => setIsUserDropdownOpen(false)}
                  className="block px-3 py-1.5 text-left text-[10px] font-bold uppercase text-neutral-400 hover:text-indigo-400 transition-colors rounded"
                >
                  Documentation
                </Link>
                {projectId && (
                  <Link
                    to={`/projects/${projectId}/settings`}
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="block px-3 py-1.5 text-left text-[10px] font-bold uppercase text-neutral-400 hover:text-indigo-400 transition-colors rounded"
                  >
                    Settings
                  </Link>
                )}
                <div className="border-t border-neutral-900 my-1" />
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="flex w-full items-center px-3 py-1.5 text-left text-[10px] font-bold uppercase text-rose-500 hover:bg-rose-950/10 transition-colors rounded cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ProjectHeader;
