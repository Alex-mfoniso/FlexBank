import React, { useState, useEffect } from "react";
import { useParams, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { Loader2, AlertTriangle, Menu, X, LogOut, FolderKanban, FileCode } from "lucide-react";

// Reusable console components
import { ProjectSidebar } from "./ProjectSidebar";
import { ProjectHeader } from "./ProjectHeader";
import { Breadcrumbs } from "./Breadcrumbs";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { ProjectContent } from "./ProjectContent";

export const Layout: React.FC = () => {
  const {
    projects,
    setSelectedProjectId,
    environment,
    setEnvironment,
    logout
  } = useApp();

  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeProject, setActiveProject] = useState<any>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [projectError, setProjectError] = useState<{ status: number; message: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authoritatively load the active project context from backend (Section 1 compliance)
  const fetchProjectDetails = async () => {
    if (!projectId) {
      setActiveProject(null);
      setLoadingProject(false);
      return;
    }
    setLoadingProject(true);
    setProjectError(null);
    try {
      const response = await api.get(`/api/v1/projects/${projectId}`);
      const proj = response.data.project;
      setActiveProject(proj);
      setSelectedProjectId(proj.id);
      
      if (proj.environment) {
        setEnvironment(proj.environment.toLowerCase() as "test" | "live");
      }
    } catch (err: any) {
      console.error("Failed to load project context details from database", err);
      let status = err.response?.status || 500;
      let message = err.response?.data?.message || err.message || "An unexpected error occurred.";

      if (!err.response || err.message === "Network Error") {
        status = 0;
        message = "FlexBank could not connect to the API. Verify that the backend server is active.";
      }
      setProjectError({ status, message });
    } finally {
      setLoadingProject(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  // Handle route and ESC keyboard triggers
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (projectError && projectId) {
    let title = "Console Unavailable";
    let desc = projectError.message;
    let buttonText = "Back to Projects";
    let buttonAction = () => navigate("/projects");

    if (projectError.status === 404) {
      title = "Project Not Found";
      desc = "The selected project may have been deleted or you may not have permission to access it.";
    } else if (projectError.status === 403) {
      title = "Access Forbidden";
      desc = "You don't have authorization rights to enter this console.";
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#030303] text-white p-6 text-center font-mono">
        <div className="w-full max-w-sm rounded border border-neutral-900 bg-neutral-950 p-8 shadow-xl">
          <AlertTriangle className="mx-auto h-12 w-12 text-rose-500" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">{title}</h3>
          <p className="mt-2 text-[11px] text-neutral-500 leading-relaxed font-semibold">{desc}</p>
          <button
            onClick={buttonAction}
            className="mt-6 w-full rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-indigo-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            {buttonText}
          </button>
        </div>
      </div>
    );
  }

  // Segment workspace items for global pages (e.g. /dashboard)
  const workspaceLinks = [
    { name: "Overview", path: "/dashboard", icon: FolderKanban },
    { name: "Projects", path: "/projects", icon: FolderKanban }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#030303] text-white select-none">
      
      {/* A. Dynamic Sidebars */}
      {projectId && activeProject ? (
        <ProjectSidebar projectId={projectId} projectName={activeProject.name} />
      ) : (
        /* Global Sidebar wrapper for Workspace level dashboard */
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-neutral-900 lg:bg-[#030303] font-mono h-full text-left">
          <div className="flex h-16 items-center px-6 border-b border-neutral-900 shrink-0">
            <Link to="/dashboard" className="flex items-center space-x-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-600 font-black text-white text-md">
                F
              </div>
              <span className="text-sm font-black uppercase tracking-widest text-white">FlexBank</span>
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 px-3">Workspace</span>
              <div className="space-y-0.5">
                {workspaceLinks.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center space-x-2.5 rounded px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                        active
                          ? "bg-neutral-950 text-indigo-400 border border-neutral-900"
                          : "text-neutral-500 hover:bg-neutral-950/50 hover:text-neutral-300 border border-transparent"
                      }`}
                    >
                      <FolderKanban className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
          <div className="p-4 border-t border-neutral-900 shrink-0 flex items-center justify-between text-[10px] text-neutral-600">
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
        </aside>
      )}

      {/* B. Content Context layout */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#030303]">
        
        {/* Dynamic header assembly */}
        <ProjectHeader
          projectId={projectId}
          projectName={activeProject?.name}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Global Sandbox Test Mode Banner (Section 2 Compliance) */}
        {environment === "test" && projectId && (
          <div className="flex items-center justify-between bg-indigo-950/20 border-b border-indigo-950/40 px-5 py-2.5 text-[9px] font-bold text-indigo-400 font-mono">
            <div className="flex items-center space-x-2">
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white uppercase tracking-widest animate-pulse">
                TEST MODE
              </span>
              <span className="text-neutral-400 font-semibold uppercase">
                This project uses the FlexBank sandbox. No real money is involved.
              </span>
            </div>
            <div className="hidden sm:block text-neutral-600 text-[8px] uppercase tracking-wider">
              SANDBOX SIMULATOR ACTIVE
            </div>
          </div>
        )}

        {/* Global Live State Alert Banner */}
        {environment === "live" && projectId && (
          <div className="flex items-center justify-between bg-rose-950/60 border-y border-rose-900 px-4 py-2.5 text-[10px] font-bold text-rose-300 font-mono">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>LIVE PRODUCTION MODE IS COMING SOON. INTEGRATION PIPELINES ARE UNDER AUDIT.</span>
            </div>
            <button
              onClick={() => setEnvironment("test")}
              className="rounded bg-rose-900/30 text-rose-400 border border-rose-900/40 px-2.5 py-0.5 text-[9px] font-bold uppercase hover:bg-rose-900/50 cursor-pointer"
            >
              Switch back to test
            </button>
          </div>
        )}

        {/* Console layout content viewport (loading checks included) */}
        {loadingProject ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 font-mono">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Retrieving console ledger metadata...</p>
          </div>
        ) : environment === "live" && projectId ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-sm mx-auto font-mono">
            <div className="flex h-11 w-11 items-center justify-center rounded border border-rose-900/40 bg-rose-950/10 text-rose-500 mb-4 select-none">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-xs font-black uppercase text-white tracking-wider">Live Workspace Pending Setup</h2>
            <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed font-medium">
              Live transactional routing requires corporate validation and merchant compliance. Switch back to your Test environment to run simulated ledger transfers.
            </p>
            <button
              onClick={() => setEnvironment("test")}
              className="mt-6 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              Explore Sandbox Console
            </button>
          </div>
        ) : (
          <ProjectContent>
            {/* Integrated Breadcrumbs section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 select-none">
              <Breadcrumbs />
              {projectId && <EnvironmentBadge />}
            </div>

            {/* Outlet slot */}
            <div className="mt-6">
              <Outlet />
            </div>
          </ProjectContent>
        )}
      </div>

      {/* C. Responsive mobile sliding drawers */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden font-mono">
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
          />

          <div className="relative flex w-full max-w-xs flex-col bg-[#030303] border-r border-neutral-900 p-6 text-neutral-400 shadow-2xl z-10 text-left">
            <div className="absolute right-4 top-4">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex items-center space-x-2.5 pb-6 border-b border-neutral-900">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-600 font-black text-white text-md">
                F
              </div>
              <span className="text-sm font-black uppercase tracking-widest text-white">FlexBank</span>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 space-y-6">
              {projectId && activeProject ? (
                <>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 px-3">Project Menu</span>
                    <div className="space-y-0.5">
                      {[
                        { name: "Overview", path: `/projects/${projectId}/overview` },
                        { name: "Customers", path: `/projects/${projectId}/customers` },
                        { name: "Accounts", path: `/projects/${projectId}/accounts` },
                        { name: "Transfers", path: `/projects/${projectId}/transfers` },
                        { name: "Transactions", path: `/projects/${projectId}/transactions` },
                        { name: "Webhooks", path: `/projects/${projectId}/webhooks` },
                        { name: "API Keys", path: `/projects/${projectId}/api-keys` },
                        { name: "Logs", path: `/projects/${projectId}/logs` },
                        { name: "Settings", path: `/projects/${projectId}/settings` }
                      ].map((item) => {
                        const active = location.pathname.startsWith(item.path);
                        return (
                          <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`block px-3 py-2 text-xs font-bold uppercase tracking-wider rounded ${
                              active
                                ? "bg-neutral-950 text-indigo-400 border border-neutral-900"
                                : "text-neutral-500 hover:bg-neutral-950 hover:text-white"
                            }`}
                          >
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 px-3">Developer</span>
                    <Link
                      to="/docs"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 text-xs font-bold uppercase tracking-wider rounded text-neutral-500 hover:bg-neutral-950 hover:text-white"
                    >
                      Documentation
                    </Link>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 px-3">Workspace</span>
                  {workspaceLinks.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block px-3 py-2 text-xs font-bold uppercase tracking-wider rounded ${
                          active
                            ? "bg-neutral-950 text-indigo-400 border border-neutral-900"
                            : "text-neutral-500 hover:bg-neutral-950 hover:text-white"
                        }`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </nav>

            <div className="pt-4 border-t border-neutral-900 flex items-center justify-between text-[10px] text-neutral-600">
              <span>Env: <b className="text-neutral-400 uppercase font-bold">{environment}</b></span>
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                  navigate("/login");
                }}
                className="flex items-center space-x-1 hover:text-rose-400 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Layout;
