import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import logoImg from "../assets/logo.png";
import {
  LayoutDashboard,
  Users,
  Wallet,
  ArrowLeftRight,
  Receipt,
  BookOpen,
  Webhook,
  Terminal,
  KeyRound,
  FileCode,
  Settings,
  Beaker,
  Menu,
  X,
  ChevronDown,
  LogOut,
  FolderKanban,
  User as UserIcon,
  Layers,
  AlertTriangle,
} from "lucide-react";

export const Layout: React.FC = () => {
  const {
    user,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    environment,
    setEnvironment,
    logout,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const [activeProject, setActiveProject] = useState<any>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<{ status: number; message: string; code?: string } | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const projectRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Fetch project details authoritatively from backend on mount or route param updates
  const fetchProjectDetails = async () => {
    if (!projectId) {
      setLoadingProject(false);
      return;
    }
    setLoadingProject(true);
    setProjectError(null);
    try {
      const response = await api.get(`/api/v1/projects/${projectId}`);
      const proj = response.data.project;
      setActiveProject(proj);
      
      // Synchronize globally
      setSelectedProjectId(proj.id);
      if (proj.environment) {
        setEnvironment(proj.environment.toLowerCase() as "test" | "live");
      }
    } catch (err: any) {
      console.error("Failed to fetch project details from backend", err);
      let status = err.response?.status || 500;
      let message = err.response?.data?.message || err.message || "An unexpected error occurred.";
      let code = err.code || "";

      // If there is no response, it is a network connectivity failure (Backend unavailable)
      if (!err.response || err.message === "Network Error" || err.code === "ERR_NETWORK") {
        status = 0; // custom status for connection offline / unavailable
        message = "FlexBank could not connect to the API. Please ensure the backend server is running.";
      }

      setProjectError({ status, message, code });
    } finally {
      setLoadingProject(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

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

  // Active path checker matching nested children
  const isActive = (path: string) => {
    if (path.includes(":projectId")) {
      const compiled = path.replace(":projectId", projectId || "");
      return location.pathname === compiled || location.pathname.startsWith(compiled + "/");
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleProjectSwitch = (id: string) => {
    setIsProjectDropdownOpen(false);
    navigate(`/projects/${id}/overview`);
  };

  const navigationItems = [
    {
      name: "Overview",
      path: "/projects/:projectId/overview",
      icon: LayoutDashboard,
    },
    {
      name: "Customers",
      path: "/projects/:projectId/customers",
      icon: Users,
    },
    {
      name: "Accounts",
      path: "/projects/:projectId/accounts",
      icon: Wallet,
    },
    {
      name: "Transfers",
      path: "/projects/:projectId/transfers",
      icon: ArrowLeftRight,
    },
    {
      name: "Transactions",
      path: "/projects/:projectId/transactions",
      icon: Receipt,
    },
    {
      name: "Ledger",
      path: "/projects/:projectId/ledger",
      icon: Layers,
    },
    {
      name: "Webhooks",
      path: "/projects/:projectId/webhooks",
      icon: Webhook,
    },
    {
      name: "API Logs",
      path: "/projects/:projectId/logs",
      icon: Terminal,
    },
    {
      name: "API Keys",
      path: "/projects/:projectId/api-keys",
      icon: KeyRound,
    },
    {
      name: "Sandbox Console",
      path: "/projects/:projectId/sandbox",
      icon: Beaker,
    },
    {
      name: "Developer Docs",
      path: "/projects/:projectId/docs",
      icon: FileCode,
    },
    {
      name: "Settings",
      path: "/projects/:projectId/settings",
      icon: Settings,
    },
  ];
  if (projectError) {
    let title = "An Error Occurred";
    let desc = projectError.message;
    let buttonText = "Back to Projects";
    let buttonAction = () => navigate("/projects");

    if (projectError.status === 0) {
      title = "Backend Unavailable";
      desc = "FlexBank could not connect to the API. Please ensure the backend server is running.";
      buttonText = "Retry Connection";
      buttonAction = () => fetchProjectDetails();
    } else if (projectError.status === 404) {
      title = "Project Not Found";
      desc = "The project ID you are trying to access does not exist or may have been deleted.";
      buttonText = "Back to Projects";
      buttonAction = () => navigate("/projects");
    } else if (projectError.status === 403) {
      title = "Access Forbidden";
      desc = "You don't have access to this project workspace. Please contact your organization administrator.";
      buttonText = "Back to Projects";
      buttonAction = () => navigate("/projects");
    } else if (projectError.status === 401) {
      title = "Authentication Required";
      desc = "Your session has expired or is invalid. Please log in again.";
      buttonText = "Go to Login";
      buttonAction = () => {
        logout();
        navigate("/login");
      };
    } else if (projectError.status >= 500) {
      title = "Server Error";
      desc = `The server encountered an error (HTTP ${projectError.status}). Please try again later.`;
      buttonText = "Retry Connection";
      buttonAction = () => fetchProjectDetails();
    } else {
      buttonText = "Retry Connection";
      buttonAction = () => fetchProjectDetails();
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-rose-500" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">{desc}</p>
          <button
            onClick={buttonAction}
            className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm transition-all"
          >
            {buttonText}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-slate-900 lg:text-slate-300">
        {/* Sidebar Header Brand Logo */}
        <div className="flex h-16 items-center px-6 border-b border-slate-800">
          <Link to="/projects" className="flex items-center space-x-2.5">
            <img src={logoImg} alt="FlexBank Logo" className="h-8 w-8 rounded-md object-contain shadow-md shadow-indigo-500/10" />
            <span className="text-lg font-bold tracking-tight text-white">FlexBank</span>
            <span className="text-[10px] bg-slate-800 text-indigo-400 font-semibold px-1.5 py-0.5 rounded border border-slate-700">
              v0.1
            </span>
          </Link>
        </div>

        {/* Sidebar Project Card */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Project</span>
            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wide border uppercase ${
              environment === "test"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}>
              {environment} MODE
            </span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white truncate" title={activeProject?.name || "test"}>
              {activeProject ? activeProject.name : "Loading..."}
            </h4>
            <p className="text-[10px] text-slate-500 font-mono mt-1 break-all select-all flex items-center justify-between cursor-pointer" title="Project ID">
              <span className="truncate">ID: {projectId}</span>
            </p>
          </div>
        </div>

        {/* Sidebar Main Scrollable Nav Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {navigationItems.map((item) => {
            const compiledPath = item.path.replace(":projectId", projectId || "");
            const active = isActive(item.path);

            return (
              <Link
                key={item.name}
                to={compiledPath}
                className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                  active
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 ${active ? "text-indigo-400" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Bottom Profile/Help Section */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Environment: <b className="text-slate-300 font-bold uppercase">{environment}</b></span>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            title="Sign out of FlexBank"
            className="flex items-center space-x-1 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Page Context Layout container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header toolbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <div className="flex items-center space-x-4">
            {/* Hamburger menu for small screens */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-700"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Back to Console Button */}
            <Link
              to="/projects"
              className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all shrink-0"
            >
              <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Projects</span>
              <span className="sm:hidden">Back</span>
            </Link>

            {/* A. Project Selector Dropdown */}
            {projectId ? (
              <div ref={projectRef} className="relative">
                <button
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100/80 transition-all focus:outline-none"
                >
                  <FolderKanban className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-[180px]">
                    {activeProject ? activeProject.name : "Select Project"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                </button>

                {isProjectDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-64 origin-top-left rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
                    <div className="p-2 border-b border-slate-100">
                      <span className="block px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Switch Project Workspace
                      </span>
                    </div>
                    <div className="py-1 max-h-60 overflow-y-auto">
                      {projects.map((proj) => (
                        <button
                          key={proj.id}
                          onClick={() => handleProjectSwitch(proj.id)}
                          className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-all ${
                            proj.id === projectId
                              ? "bg-indigo-50 font-semibold text-indigo-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate pr-4">{proj.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 uppercase bg-slate-100 text-slate-400 rounded shrink-0">
                            {proj.environment}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-lg">
                      <Link
                        to="/projects"
                        onClick={() => setIsProjectDropdownOpen(false)}
                        className="flex w-full items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Create / Manage Projects
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm font-semibold text-slate-400">No projects found</span>
            )}

            {/* B. Environment Switcher Toggle */}
            {projectId && (
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setEnvironment("test")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wider transition-all ${
                    environment === "test"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Test Mode
                </button>
                <button
                  onClick={() => setEnvironment("live")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wider transition-all ${
                    environment === "live"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-500 cursor-not-allowed"
                  }`}
                  title="Live accounts are currently coming soon"
                >
                  Live
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Global Test Mode Header Alert */}
            {environment === "test" && (
              <div className="hidden md:flex items-center space-x-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200 shadow-sm animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Sandbox Sandbox Simulators Active</span>
              </div>
            )}

            {/* C. User Dropdown Menu */}
            <div ref={userRef} className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all border border-slate-200 focus:outline-none"
              >
                <UserIcon className="h-4.5 w-4.5 text-slate-500" />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900 leading-tight">
                      {user ? user.name : "Developer"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {user ? user.email : ""}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/projects"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Workspace Overviews
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        navigate("/login");
                      }}
                      className="flex w-full items-center px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4 mr-2 shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Global Banner for Live State coming soon */}
        {environment === "live" && (
          <div className="flex items-center justify-between bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Live production transactions are coming soon. Switch to "Test Mode" to use fully operational sandbox ledger movements.</span>
            </div>
            <button
              onClick={() => setEnvironment("test")}
              className="rounded bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white hover:bg-white/30 transition-all uppercase"
            >
              Switch back to test
            </button>
          </div>
        )}

        {/* 3. Main Dashboard Screen Content viewport */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {loadingProject ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
              <p className="text-sm font-semibold text-slate-500">Loading project configuration...</p>
              <div className="w-full max-w-lg p-6 space-y-4 border border-slate-200 rounded-xl bg-white shadow-xs animate-pulse">
                <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                <div className="h-8 bg-slate-200 rounded-md w-2/3" />
                <div className="h-4 bg-slate-100 rounded-md w-3/4" />
              </div>
            </div>
          ) : environment === "live" ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4 border border-rose-100">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Live Workspace Coming Soon</h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Production-grade payment processing, live integrations with commercial banking and digital provider networks are undergoing regulatory compliance audits.
              </p>
              <button
                onClick={() => setEnvironment("test")}
                className="mt-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-4 py-2 shadow-sm transition-all"
              >
                Explore Sandbox Features (Test Mode)
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* 4. Sliding Mobile Navigation Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop mask Overlay */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Nav Sheet Drawer menu container */}
          <div className="relative flex w-full max-w-xs flex-col bg-slate-900 p-6 text-slate-300 shadow-xl ring-1 ring-black/10">
            {/* Close Sheet button */}
            <div className="absolute right-4 top-4">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Sheet brand title logo */}
            <div className="flex items-center space-x-2.5 pb-6 border-b border-slate-800">
              <img src={logoImg} alt="FlexBank Logo" className="h-8 w-8 rounded-md object-contain" />
              <span className="text-lg font-bold text-white">FlexBank</span>
            </div>

            {/* Main scroll links */}
            <nav className="flex-1 overflow-y-auto py-6 space-y-1">
              {navigationItems.map((item) => {
                const compiledPath = item.path.replace(":projectId", projectId || "");
                const active = isActive(item.path);

                return (
                  <Link
                    key={item.name}
                    to={compiledPath}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                      active
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    }`}
                  >
                    <item.icon className={`h-4.5 w-4.5 ${active ? "text-indigo-400" : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Bottom session logs */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Env: <b className="text-slate-300 uppercase">{environment}</b></span>
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                  navigate("/login");
                }}
                className="flex items-center space-x-1 hover:text-white transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
