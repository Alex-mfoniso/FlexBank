import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import type { ApiErrorPayload } from "../lib/api";
import {
  FolderKanban,
  Plus,
  ArrowRight,
  Code2,
  FolderDot,
  Loader2,
  AlertCircle,
  HelpCircle,
  LogOut,
  Sparkles
} from "lucide-react";

export const Projects: React.FC = () => {
  const { user, projects, setSelectedProjectId, refreshProjects, logout } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [environment, setEnvironment] = useState<"test" | "live">("test");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<ApiErrorPayload | null>(null);

  // Retrieve organization ID from user membership profiles
  const defaultOrgId = (user as any)?.memberships?.[0]?.organizationId || null;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!defaultOrgId) {
      setError({
        code: "NO_ORGANIZATION_FOUND",
        message: "You are not registered in any organization workspace context yet.",
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await api.post("/api/v1/projects", {
        organizationId: defaultOrgId,
        name: name.trim(),
        description: description.trim() || null,
        environment, // Every project starts in TEST mode by default, can select environment in selector
      });

      const newProject = response.data.project;
      await refreshProjects();
      
      setName("");
      setDescription("");
      
      // Auto-select the newly created workspace
      setSelectedProjectId(newProject.id);
      navigate(`/projects/${newProject.id}/overview`);
    } catch (err: any) {
      setError(err as ApiErrorPayload);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    navigate(`/projects/${projectId}/overview`);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white py-12 px-6 lg:px-12 select-none relative font-mono">
      <div className="absolute inset-0 opacity-5 bg-dot-pattern pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px]" />

      <div className="mx-auto max-w-6xl relative z-10">
        
        {/* Upper Header Branding Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-8 border-b border-neutral-900 gap-4">
          <div className="flex items-center space-x-3 text-left">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-indigo-600 font-black text-white text-lg shadow-md shadow-indigo-600/20">
              F
            </div>
            <div>
              <h1 className="text-lg font-black text-white uppercase leading-none">FlexBank Console</h1>
              <p className="text-[10px] text-neutral-500 mt-1 leading-normal font-medium">Select a project context workspace to access developer credentials and ledger histories</p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 text-[10px]">
            <span className="text-neutral-500 text-left">
              Logged in as: <span className="text-indigo-400 font-semibold block sm:inline">{user?.email}</span>
            </span>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="flex items-center space-x-1 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer border border-neutral-900 rounded bg-neutral-950/60 px-2 py-1"
            >
              <LogOut className="h-3 w-3" />
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* Main Double-Panel layout */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Panel 1: Current Project Workspaces (List) */}
          <div className="lg:col-span-8 space-y-6 text-left">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center space-x-2">
                <FolderKanban className="h-4 w-4 text-neutral-600" />
                <span>Your Active Workspaces ({projects.length})</span>
              </h2>
            </div>

            {projects.length === 0 ? (
              /* EMPTY STATE: Matches Section 18 specs exactly */
              <div className="rounded-lg border border-dashed border-neutral-900 bg-neutral-950/30 p-12 text-center shadow-xs">
                <FolderDot className="mx-auto h-12 w-12 text-neutral-700" />
                <h3 className="mt-4 text-xs font-bold text-white uppercase tracking-wider font-mono">No projects yet.</h3>
                <p className="mt-2 text-[11px] text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  Create a project to start building with FlexBank. Project workspaces segregate distinct sandbox credentials, webhook endpoints, and customer lists.
                </p>
                <p className="mt-4 text-[11px] font-bold text-indigo-400 font-mono">
                  Use the registration workspace form to initialize your first project →
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => handleSelectProject(proj.id)}
                    className="group relative flex flex-col justify-between rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 text-left shadow-xs hover:border-neutral-800 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/[0.003] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm tracking-tight group-hover:text-indigo-400 transition-colors truncate pr-2">
                          {proj.name}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase shrink-0 border font-mono ${
                          proj.environment === "test"
                            ? "bg-amber-950/20 text-amber-500 border-amber-900/40"
                            : "bg-rose-950/20 text-rose-500 border-rose-900/40"
                        }`}>
                          {proj.environment}
                        </span>
                      </div>
                      
                      <p className="mt-2 text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                        {proj.description || "No description provided for this financial workspace project."}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-neutral-900/60 flex items-center justify-between text-[10px] font-bold text-neutral-600 group-hover:text-indigo-400 transition-colors font-mono">
                      <span className="text-[9px]">ID: {proj.id.substring(0, 8)}...</span>
                      <div className="flex items-center space-x-1 shrink-0">
                        <span>Open console</span>
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Panel 2: Register/Create Project Workspace Form */}
          <div className="lg:col-span-4 rounded-lg border border-neutral-900 bg-neutral-950/60 p-6 shadow-sm self-start text-left font-mono">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center space-x-2 pb-4 border-b border-neutral-900">
              <Code2 className="h-4.5 w-4.5 text-neutral-600" />
              <span>Create Workspace</span>
            </h2>

            {error && (
              <div className="mt-4 flex items-start space-x-2.5 rounded border border-red-950/60 bg-red-950/5 p-3 text-red-200/90 leading-relaxed">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold leading-normal">{error.message}</p>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="mt-5 space-y-4">
              <div>
                <label htmlFor="projName" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Project Name
                </label>
                <input
                  id="projName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Wallet"
                  className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-white placeholder:text-neutral-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all"
                />
              </div>

              <div>
                <label htmlFor="projDesc" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  id="projDesc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Core financial model or ledger..."
                  className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-white placeholder:text-neutral-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Environment Tier
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEnvironment("test")}
                    className={`rounded py-2 text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                      environment === "test"
                        ? "bg-indigo-950/20 text-indigo-400 border-indigo-900 shadow-xs"
                        : "bg-transparent text-neutral-600 border-neutral-900 hover:text-neutral-400"
                    }`}
                  >
                    Test Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvironment("live")}
                    className={`rounded py-2 text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                      environment === "live"
                        ? "bg-rose-950/20 text-rose-500 border-rose-900 shadow-xs"
                        : "bg-transparent text-neutral-600 border-neutral-900 hover:text-neutral-400"
                    }`}
                    title="Live environments are coming soon"
                  >
                    Live Mode
                  </button>
                </div>
                
                <div className="mt-2.5 flex items-start space-x-2 rounded border border-neutral-900 bg-neutral-950/20 p-2.5 text-[9px] text-neutral-500 leading-normal font-medium select-none">
                  <HelpCircle className="h-3.5 w-3.5 text-neutral-600 shrink-0 mt-0.5" />
                  <span>
                    Sandbox tier allocates test codes and enables transfer simulation mocks. Live production environments require compliance onboarding.
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex w-full justify-center items-center space-x-2 rounded bg-indigo-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create Project</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
