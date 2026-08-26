import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import type { ApiErrorPayload } from "../lib/api";
import {
  Sparkles,
  ShieldAlert,
  Terminal,
  CheckCircle2,
  Rocket,
  FolderPlus,
  Key,
  BookOpen,
  ArrowRight,
  Code
} from "lucide-react";

export const Onboarding: React.FC = () => {
  const { user, refreshProjects, setSelectedProjectId } = useApp();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState("My Wallet");
  const [description, setDescription] = useState("A test wallet application");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const [createdProject, setCreatedProject] = useState<any>(null);

  // Retrieve organization ID from user membership profile (identical to Projects.tsx)
  const defaultOrgId = (user as any)?.memberships?.[0]?.organizationId || null;

  const handleCreateFirstProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!defaultOrgId) {
      setError({
        code: "NO_ORGANIZATION_FOUND",
        message: "We could not resolve your default developer organization membership. Please contact support.",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Create first project in TEST environment using actual API
      const response = await api.post("/api/v1/projects", {
        organizationId: defaultOrgId,
        name: projectName.trim(),
        description: description.trim() || null,
        environment: "test", // Every new project must start in TEST mode
      });

      const project = response.data.project;
      
      // Hydrate projects list
      await refreshProjects();
      
      // Set the active project locally
      setCreatedProject(project);
    } catch (err: any) {
      setError(err as ApiErrorPayload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    if (createdProject) {
      setSelectedProjectId(createdProject.id);
      navigate(`/projects/${createdProject.id}/overview`);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col justify-between select-none relative font-mono">
      <div className="absolute inset-0 opacity-5 bg-dot-pattern pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px]" />

      {/* Header Toolbar */}
      <header className="border-b border-neutral-900 bg-neutral-950/60 py-4 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 font-black text-white text-md shadow-lg shadow-indigo-600/20">
            F
          </div>
          <span className="text-md font-bold tracking-tight text-white uppercase">FlexBank Console</span>
        </div>
        <div className="text-[10px] text-neutral-500">
          User: <span className="text-indigo-400 font-semibold">{user?.email}</span>
        </div>
      </header>

      {/* Main Stepper Body */}
      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: STEP PROGRESS TRACKER */}
          <div className="lg:col-span-4 space-y-6 text-left">
            <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              Developer Pipeline
            </h2>
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start space-x-3">
                <div className="flex h-5 w-5 rounded-full bg-neutral-900 border border-indigo-500/40 text-indigo-400 text-[10px] font-bold items-center justify-center shrink-0">
                  ✓
                </div>
                <div>
                  <span className="text-xs text-neutral-300 font-bold block leading-none">Create account</span>
                  <span className="text-[9px] text-neutral-500 font-medium mt-1 block">Successfully established</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-3">
                <div className={`flex h-5 w-5 rounded-full text-[10px] font-bold items-center justify-center shrink-0 border transition-colors ${
                  createdProject
                    ? "bg-neutral-900 border-indigo-500/40 text-indigo-400"
                    : "bg-indigo-600 border-indigo-500 text-white animate-pulse"
                }`}>
                  {createdProject ? "✓" : "02"}
                </div>
                <div>
                  <span className={`text-xs font-bold block leading-none ${createdProject ? "text-neutral-300" : "text-white"}`}>Create project</span>
                  <span className="text-[9px] text-neutral-500 font-medium mt-1 block">Specify name & metadata</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-3">
                <div className={`flex h-5 w-5 rounded-full text-[10px] font-bold items-center justify-center shrink-0 border ${
                  createdProject ? "bg-indigo-600/30 border-indigo-500 text-indigo-400 animate-pulse" : "bg-neutral-950 border-neutral-900 text-neutral-600"
                }`}>
                  03
                </div>
                <div>
                  <span className={`text-xs font-bold block leading-none ${createdProject ? "text-neutral-200" : "text-neutral-600"}`}>Get API key</span>
                  <span className="text-[9px] text-neutral-500 font-medium mt-1 block">Retrieve testing credentials</span>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start space-x-3">
                <div className="flex h-5 w-5 rounded-full bg-neutral-950 border border-neutral-900 text-neutral-600 text-[10px] font-bold items-center justify-center shrink-0">
                  04
                </div>
                <div>
                  <span className="text-xs text-neutral-600 font-bold block leading-none">Make first request</span>
                  <span className="text-[9px] text-neutral-500 font-medium mt-1 block">Execute double-entry tests</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: INTERACTIVE PANEL */}
          <div className="lg:col-span-8 w-full">
            {!createdProject ? (
              /* ONBOARDING FORM SCREEN */
              <div className="rounded-lg border border-neutral-900 bg-neutral-950/60 p-6 sm:p-8 shadow-2xl space-y-6 text-left relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-indigo-500/0 via-indigo-500/20 to-indigo-500/0" />
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Rocket className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-md sm:text-lg font-extrabold text-white">Let's get you building.</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Set up your first financial sandbox workspace. We'll generate balanced double-entry accounts automatically.
                  </p>
                </div>

                {/* TEST ENVIRONMENT BANNER */}
                <div className="flex items-center space-x-2.5 rounded border border-amber-950/40 bg-amber-950/5 p-3 text-amber-500 text-xs select-none">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-bold uppercase tracking-wider">TEST SANDBOX ACTIVE</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5 leading-normal">
                      Every new workspace is registered in sandbox mode. No real money operations can be initiated.
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start space-x-2.5 rounded border border-red-950/60 bg-red-950/5 p-3 text-red-200/90">
                    <ShieldAlert className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs leading-normal">{error.message}</p>
                  </div>
                )}

                <form onSubmit={handleCreateFirstProject} className="space-y-4 font-mono">
                  <div>
                    <label htmlFor="projName" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Project name
                    </label>
                    <input
                      id="projName"
                      type="text"
                      required
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. My Wallet"
                      className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3.5 py-2 text-white placeholder:text-neutral-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="projDesc" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      id="projDesc"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. A test wallet application"
                      className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3.5 py-2 text-white placeholder:text-neutral-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full justify-center items-center space-x-2 rounded bg-indigo-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Creating project...</span>
                      </>
                    ) : (
                      <>
                        <FolderPlus className="h-3.5 w-3.5" />
                        <span>Create Project & Initialize Sandbox</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* WELCOME / FINISH ONBOARDING SCREEN */
              <div className="rounded-lg border border-neutral-900 bg-neutral-950/60 p-6 sm:p-8 shadow-2xl space-y-6 text-left relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-indigo-500/20" />
                <div className="absolute top-0 left-0 w-[2px] h-full bg-indigo-500/20" />

                <div className="space-y-2">
                  <div className="flex h-10 w-10 rounded-full bg-indigo-950/50 border border-indigo-500/30 items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">Welcome to FlexBank</h3>
                  <p className="text-xs text-neutral-400">
                    Your sandbox ledger core has been initialized successfully.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border border-neutral-900 bg-neutral-950 p-4 rounded text-xs select-text">
                  <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase block tracking-wider">PROJECT</span>
                    <span className="text-white font-semibold mt-1 block truncate">{createdProject.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase block tracking-wider">ENVIRONMENT</span>
                    <span className="text-amber-500 font-bold mt-1 block uppercase tracking-wide">TEST Sandbox</span>
                  </div>
                </div>

                {/* Checklist indicators matching Section 13 */}
                <div className="space-y-3 pt-2">
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block">Next steps checklist</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-neutral-400">
                      <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span>Create your project workspace (Complete!)</span>
                    </div>
                    <div className="flex items-center space-x-2 text-neutral-500">
                      <Key className="h-4 w-4 text-neutral-600 shrink-0" />
                      <span className="text-neutral-400">Get your API secret key</span>
                    </div>
                    <div className="flex items-center space-x-2 text-neutral-500">
                      <BookOpen className="h-4 w-4 text-neutral-600 shrink-0" />
                      <span className="text-neutral-400">Read the platform quickstart</span>
                    </div>
                    <div className="flex items-center space-x-2 text-neutral-500">
                      <Code className="h-4 w-4 text-neutral-600 shrink-0" />
                      <span className="text-neutral-400">Make your first simulated API request</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleFinish}
                  className="w-full flex justify-center items-center space-x-2 rounded bg-white py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-sm hover:bg-neutral-200 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Open project console</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer Branding Info */}
      <footer className="border-t border-neutral-900 bg-neutral-950/30 py-4 px-6 text-center text-[10px] text-neutral-600">
        FlexBank Sandbox Core Ledger Engine © 2026. Secure Sandboxed Platform Environment.
      </footer>
    </div>
  );
};
