import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  LayoutDashboard,
  Users,
  Wallet,
  ArrowLeftRight,
  Receipt,
  Webhook,
  Terminal,
  KeyRound,
  Settings,
  FileCode,
  LogOut,
  FolderKanban,
  ChevronLeft
} from "lucide-react";

interface ProjectSidebarProps {
  projectId: string;
  projectName: string;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ projectId, projectName }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { environment, logout } = useApp();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const projectLinks = [
    { name: "Overview", path: `/projects/${projectId}/overview`, icon: LayoutDashboard },
    { name: "Customers", path: `/projects/${projectId}/customers`, icon: Users },
    { name: "Accounts", path: `/projects/${projectId}/accounts`, icon: Wallet },
    { name: "Transfers", path: `/projects/${projectId}/transfers`, icon: ArrowLeftRight },
    { name: "Transactions", path: `/projects/${projectId}/transactions`, icon: Receipt },
    { name: "Webhooks", path: `/projects/${projectId}/webhooks`, icon: Webhook },
    { name: "API Keys", path: `/projects/${projectId}/api-keys`, icon: KeyRound },
    { name: "Logs", path: `/projects/${projectId}/logs`, icon: Terminal },
    { name: "Settings", path: `/projects/${projectId}/settings`, icon: Settings },
  ];

  const devLinks = [
    { name: "Documentation", path: "/docs", icon: FileCode }
  ];

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-neutral-900 lg:bg-[#030303] font-mono h-full select-none text-left">
      
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-neutral-900 shrink-0">
        <Link to="/dashboard" className="flex items-center space-x-2.5">
          <span className="text-sm font-black uppercase tracking-widest text-white">Ricarut</span>
        </Link>
      </div>

      {/* Scope Header */}
      <div className="px-6 py-4 border-b border-neutral-900 bg-neutral-950/20 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-600">Active Console</span>
          <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide border border-amber-900/40 bg-amber-950/20 text-amber-500">
            {environment} MODE
          </span>
        </div>
        <div>
          <h4 className="text-xs font-bold text-neutral-300 truncate" title={projectName}>
            {projectName}
          </h4>
          <p className="text-[9px] text-neutral-600 font-mono mt-0.5 select-all truncate">
            ID: {projectId}
          </p>
        </div>
      </div>

      {/* Main Nav Links Segmented */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        
        {/* PROJECT SECTION */}
        <div className="space-y-1.5">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 px-3 truncate" title={projectName}>
            Project: {projectName}
          </h3>
          <div className="space-y-0.5">
            {projectLinks.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-2.5 rounded px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                    active
                      ? "bg-neutral-950 text-indigo-400 border border-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:bg-neutral-950/50 hover:text-neutral-300 border border-transparent"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* DEVELOPER SECTION */}
        <div className="space-y-1.5">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 px-3">
            Developer
          </h3>
          <div className="space-y-0.5">
            {devLinks.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-2.5 rounded px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                    active
                      ? "bg-neutral-950 text-indigo-400 border border-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:bg-neutral-950/50 hover:text-neutral-300 border border-transparent"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

      </nav>

      {/* Back to Projects Button */}
      <div className="p-4 border-t border-neutral-900 shrink-0 space-y-2">
        <Link
          to="/projects"
          className="flex w-full items-center justify-center space-x-1.5 rounded border border-neutral-900 bg-neutral-950/40 py-2 text-[10px] font-bold uppercase text-neutral-500 hover:text-white hover:border-neutral-800 transition-all"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Back to Projects</span>
        </Link>

        <div className="flex items-center justify-between text-[10px] text-neutral-600 px-2 pt-2">
          <span>Env: <b className="text-neutral-400 font-bold uppercase">{environment}</b></span>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex items-center space-x-1 hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

    </aside>
  );
};

export default ProjectSidebar;
