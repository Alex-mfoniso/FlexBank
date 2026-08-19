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
} from "lucide-react";

export const Projects: React.FC = () => {
  const { user, projects, setSelectedProjectId, refreshProjects } = useApp();
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
        name,
        description: description || null,
        environment,
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
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        
        {/* Upper Header Header Branding Info */}
        <div className="flex items-center justify-between pb-8 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white text-lg shadow-md shadow-indigo-600/20">
              F
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">FlexBank Console</h1>
              <p className="text-xs text-slate-500 font-medium">Select a project context workspace to access developer credentials and ledger histories</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Logged in as: <span className="text-slate-600 font-semibold">{user?.email}</span>
          </div>
        </div>

        {/* Main Double-Panel layout */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel 1: Current Project Workspaces (List) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2">
                <FolderKanban className="h-4 w-4 text-slate-400" />
                <span>Your Active Workspaces ({projects.length})</span>
              </h2>
            </div>

            {projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
                <FolderDot className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-sm font-bold text-slate-900">No projects yet</h3>
                <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Project workspaces segregate distinct sandbox credentials, webhook endpoints, API logging limits, and customer lists.
                </p>
                <p className="mt-4 text-xs font-semibold text-indigo-600">
                  Use the registration workspace form to initialize your first project →
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => handleSelectProject(proj.id)}
                    className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left shadow-xs hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500 hover:shadow-md transition-all focus:outline-none"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-base tracking-tight group-hover:text-indigo-600 transition-colors truncate pr-2">
                          {proj.name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 border ${
                          proj.environment === "test"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {proj.environment} environment
                        </span>
                      </div>
                      
                      <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {proj.description || "No description provided for this financial workspace project."}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <span className="font-mono text-[10px]">ID: {proj.id}</span>
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
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm self-start">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2 pb-4 border-b border-slate-100">
              <Code2 className="h-4.5 w-4.5 text-slate-400" />
              <span>Create New Workspace</span>
            </h2>

            {error && (
              <div className="mt-4 flex items-start space-x-2.5 rounded-lg bg-red-50 p-3 border border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-normal">{error.message}</p>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="mt-5 space-y-4">
              <div>
                <label htmlFor="projName" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Project Name
                </label>
                <input
                  id="projName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Startup API"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label htmlFor="projDesc" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  id="projDesc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Core financial model or ledger structure..."
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Environment Tier
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEnvironment("test")}
                    className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wider border transition-all ${
                      environment === "test"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Test Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvironment("live")}
                    className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wider border transition-all ${
                      environment === "live"
                        ? "bg-rose-50 text-rose-700 border-rose-300 shadow-xs"
                        : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                    }`}
                    title="Live environments are currently coming soon"
                  >
                    Live Mode
                  </button>
                </div>
                <div className="mt-2 flex items-start space-x-1.5 rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500 leading-normal">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    Sandbox tier allocates NGN/USD test codes and enables transfer simulation mocks. Live accounts require compliance onboarding.
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex w-full justify-center items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Creating workspace...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
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
