import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import type { ApiErrorPayload } from "../lib/api";
import {
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Rocket,
  FolderPlus,
  Key,
  BookOpen,
  ArrowRight,
  Code,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

export const Onboarding: React.FC = () => {
  const { user, refreshProjects, setSelectedProjectId } = useApp();
  const navigate = useNavigate();

  // Onboarding Stage Steps:
  // 1: WELCOME SCREEN
  // 2: CREATE PROJECT FORM
  // 3: PROJECT CREATION SUCCESS
  // 4: API KEY SECURE CREATION & SHOW
  // 5: API KEY SUCCESS -> QUICKSTART CTA
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [projectName, setProjectName] = useState("My First Fintech App");
  const [description, setDescription] = useState("Sandbox testing project space");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiErrorPayload | null>(null);
  
  const [createdProject, setCreatedProject] = useState<any>(null);
  const [createdPlaintextKey, setCreatedPlaintextKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Retrieve organization ID from user membership profile (identical to Projects.tsx)
  const defaultOrgId = (user as any)?.memberships?.[0]?.organizationId || null;

  // Auto-redirect if they already have projects (do not force onboarding on existing project owners)
  useEffect(() => {
    const checkExistingProjects = async () => {
      try {
        const response = await api.get("/api/v1/projects");
        const userProjects = response.data.projects || response.data.data || [];
        if (userProjects.length > 0 && step === 1) {
          // If they already have projects, redirect straight to their first project
          const firstProj = userProjects[0];
          setSelectedProjectId(firstProj.id);
          navigate(`/projects/${firstProj.id}/overview`);
        }
      } catch (err) {
        console.warn("Failed to retrieve existing projects", err);
      }
    };
    checkExistingProjects();
  }, [navigate, setSelectedProjectId, step]);

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
        name: projectName.trim() || "My First Fintech App",
        description: description.trim() || null,
        environment: "test", // Every new project starts in TEST/SANDBOX mode
      });

      const project = response.data.project;
      setCreatedProject(project);
      
      // Hydrate projects list across AppContext
      await refreshProjects();
      setSelectedProjectId(project.id);

      // Move to success display step
      setStep(3);
    } catch (err: any) {
      console.error("Failed to create onboarding project", err);
      setError(err.response?.data || { code: "CREATION_FAILED", message: "Failed to establish project. Try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateApiKey = async () => {
    if (!createdProject) return;
    setError(null);
    setIsSubmitting(true);

    try {
      // Call standard project API Key generator endpoint
      const response = await api.post(`/api/v1/projects/${createdProject.id}/api-keys`, {
        name: "Default Onboarding Key",
      });
      
      setCreatedPlaintextKey(response.data.key);
      setStep(4);
    } catch (err: any) {
      console.error("Failed to provision onboarding API key", err);
      setError(err.response?.data || { code: "KEY_PROVISIONING_FAILED", message: "Could not create API Key. Try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyKey = () => {
    if (!createdPlaintextKey) return;
    navigator.clipboard.writeText(createdPlaintextKey);
    setCopiedKey(true);
    setTimeout(() => {
      setCopiedKey(false);
      setStep(5); // Progress to API KEY SUCCESS stage after copying
    }, 2000);
  };

  const handleGoToQuickstart = () => {
    if (createdProject) {
      navigate(`/projects/${createdProject.id}/quickstart`);
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
              {/* Step 1: Account */}
              <div className="flex items-start space-x-3">
                <div className="flex h-5 w-5 rounded-full bg-neutral-900 border border-indigo-500/40 text-indigo-400 text-[10px] font-bold items-center justify-center shrink-0">
                  ✓
                </div>
                <div>
                  <span className="text-xs text-neutral-300 font-bold block leading-none">Create account</span>
                  <span className="text-[9px] text-neutral-500 font-medium mt-1 block">Successfully established</span>
                </div>
              </div>

              {/* Step 2: Project */}
              <div className="flex items-start space-x-3">
                <div className={`flex h-5 w-5 rounded-full text-[10px] font-bold items-center justify-center shrink-0 border transition-colors ${
                  step > 2
                    ? "bg-neutral-900 border-indigo-500/40 text-indigo-400"
                    : step === 2
                    ? "bg-indigo-600 border-indigo-500 text-white animate-pulse"
                    : "bg-neutral-950 border-neutral-900 text-neutral-600"
                }`}>
                  {step > 2 ? "✓" : "02"}
                </div>
                <div>
                  <span className={`text-xs font-bold block leading-none ${step >= 2 ? "text-neutral-300" : "text-neutral-600"}`}>Create project</span>
                  <span className="text-[9px] text-neutral-500 font-medium mt-1 block">Specify name & metadata</span>
                </div>
              </div>

              {/* Step 3: API Key */}
              <div className="flex items-start space-x-3">
                <div className={`flex h-5 w-5 rounded-full text-[10px] font-bold items-center justify-center shrink-0 border ${
                  step > 4
                    ? "bg-neutral-900 border-indigo-500/40 text-indigo-400"
                    : step === 3 || step === 4
                    ? "bg-indigo-600 border-indigo-500 text-white animate-pulse"
                    : "bg-neutral-950 border-neutral-900 text-neutral-600"
                }`}>
                  {step > 4 ? "✓" : "03"}
                </div>
                <div>
                  <span className={`text-xs font-bold block leading-none ${step >= 3 ? "text-neutral-300" : "text-neutral-600"}`}>Get API key</span>
                  <span className="text-[9px] text-neutral-500 font-medium mt-1 block">Retrieve testing credentials</span>
                </div>
              </div>

              {/* Step 4: First Request */}
              <div className="flex items-start space-x-3">
                <div className={`flex h-5 w-5 rounded-full text-[10px] font-bold items-center justify-center shrink-0 border ${
                  step === 5 ? "bg-indigo-600/30 border-indigo-500 text-indigo-400 animate-pulse" : "bg-neutral-950 border-neutral-900 text-neutral-600"
                }`}>
                  04
                </div>
                <div>
                  <span className={`text-xs font-bold block leading-none ${step === 5 ? "text-neutral-200" : "text-neutral-600"}`}>Make first request</span>
                  <span className="text-[9px] text-neutral-500 font-medium mt-1 block">Execute sandboxed tests</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: INTERACTIVE PANEL */}
          <div className="lg:col-span-8 w-full">
            {step === 1 && (
              /* ONBOARDING STEP 1: WELCOME SCREEN */
              <div className="rounded-lg border border-neutral-900 bg-neutral-950/60 p-6 sm:p-8 shadow-2xl space-y-6 text-left relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-indigo-500/0 via-indigo-500/20 to-indigo-500/0" />
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Rocket className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-md sm:text-lg font-extrabold text-white uppercase">WELCOME TO FLEXBANK</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed uppercase">
                    Build and test financial products using the FlexBank API.
                  </p>
                </div>

                <p className="text-neutral-500 text-[10px] leading-relaxed uppercase font-semibold">
                  Get up and running in minutes with real-time sandbox ledgers, multi-currency accounts, and live outcome simulations.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 flex justify-center items-center space-x-2 rounded bg-indigo-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-500 transition-all active:scale-[0.98] cursor-pointer animate-pulse"
                  >
                    <span>Create your first project</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <Link
                    to="/docs"
                    className="flex-1 flex justify-center items-center space-x-2 rounded border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white hover:border-neutral-700 transition-all cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Explore documentation</span>
                  </Link>
                </div>
              </div>
            )}

            {step === 2 && (
              /* ONBOARDING STEP 2: CREATE PROJECT FORM */
              <div className="rounded-lg border border-neutral-900 bg-neutral-950/60 p-6 sm:p-8 shadow-2xl space-y-6 text-left relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-indigo-500/0 via-indigo-500/20 to-indigo-500/0" />
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FolderPlus className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-md sm:text-lg font-extrabold text-white">Create your first project</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Set up your first financial sandbox workspace. We'll generate balanced double-entry accounts automatically.
                  </p>
                </div>

                {/* TEST ENVIRONMENT BANNER (Locked in Test) */}
                <div className="flex items-center space-x-2.5 rounded border border-amber-950/40 bg-amber-950/5 p-3 text-amber-500 text-xs select-none">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-bold uppercase tracking-wider">ENVIRONMENT: TEST</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5 leading-normal uppercase">
                      Test mode only. Sandbox uses simulated financial activity with no real money operations.
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start space-x-2.5 rounded border border-red-950/60 bg-red-950/5 p-3 text-red-200/90">
                    <ShieldAlert className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs leading-normal">{error.message}</p>
                  </div>
                )}

                <form onSubmit={handleCreateFirstProject} className="space-y-4">
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
                      placeholder="e.g. My First Fintech App"
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
                      placeholder="e.g. Sandbox testing project space"
                      className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3.5 py-2 text-white placeholder:text-neutral-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full justify-center items-center space-x-2 rounded bg-indigo-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
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
            )}

            {step === 3 && (
              /* ONBOARDING STEP 3: PROJECT CREATION SUCCESS */
              <div className="rounded-lg border border-neutral-900 bg-neutral-950/60 p-6 sm:p-8 shadow-2xl space-y-6 text-left relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-indigo-500/20" />

                <div className="space-y-2">
                  <div className="flex h-10 w-10 rounded-full bg-indigo-950/50 border border-indigo-500/30 items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">✓ Project created</h3>
                  <p className="text-xs text-neutral-400">
                    Your sandbox ledger core has been initialized successfully.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border border-neutral-900 bg-neutral-950 p-4 rounded text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase block tracking-wider">PROJECT</span>
                    <span className="text-white font-semibold mt-1 block truncate">{createdProject?.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase block tracking-wider">ENVIRONMENT</span>
                    <span className="text-amber-500 font-bold mt-1 block uppercase tracking-wide">TEST Sandbox</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-neutral-500 uppercase block tracking-widest">NEXT</span>
                  <p className="text-xs text-neutral-300">Create your first API key to connect clients securely.</p>
                </div>

                <button
                  onClick={handleGenerateApiKey}
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center space-x-2 rounded bg-indigo-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-500 transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Provisioning key...</span>
                    </>
                  ) : (
                    <>
                      <Key className="h-3.5 w-3.5" />
                      <span>Create TEST API key</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 4 && (
              /* ONBOARDING STEP 4: API KEY SECURE CREATION & ONE-TIME DISPLAY */
              <div className="rounded-lg border border-neutral-900 bg-neutral-950/60 p-6 sm:p-8 shadow-2xl space-y-6 text-left relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-indigo-500/20" />

                <div className="space-y-2">
                  <div className="flex h-10 w-10 rounded-full bg-emerald-950/50 border border-emerald-900/30 items-center justify-center">
                    <ShieldCheck className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">✓ API Key Generated</h3>
                  <p className="text-xs text-neutral-400">
                    This secret API key is only displayed **ONCE**. Store it carefully.
                  </p>
                </div>

                {/* Secure one-time display block */}
                <div className="rounded border border-neutral-900 bg-neutral-950 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">SECRET API KEY</span>
                    <span className="text-[7.5px] font-black uppercase text-amber-500 bg-amber-950/20 border border-amber-900/30 px-1.5 py-0.2 rounded">
                      ONE-TIME VIEW
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={createdPlaintextKey || ""}
                      className="flex-1 bg-neutral-950 text-emerald-400 font-mono text-[11px] font-bold focus:outline-none p-1.5 border border-neutral-900 rounded select-all"
                    />
                    <button
                      onClick={handleCopyKey}
                      className="p-2 rounded border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedKey ? <Check className="h-4.5 w-4.5 text-emerald-500" /> : <Copy className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Security warning block */}
                <div className="flex items-start space-x-2.5 rounded border border-amber-950/40 bg-amber-950/5 p-3 text-amber-500 text-xs leading-relaxed uppercase font-semibold text-[10px]">
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                  <p>
                    Store this key securely. Never expose secret API keys in frontend code or public repositories.
                  </p>
                </div>

                <button
                  onClick={handleCopyKey}
                  className="w-full flex justify-center items-center space-x-2 rounded bg-indigo-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-500 transition-all active:scale-[0.98] cursor-pointer"
                >
                  {copiedKey ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>✓ API key copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy API key</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 5 && (
              /* ONBOARDING STEP 5: API KEY SUCCESS -> START QUICKSTART */
              <div className="rounded-lg border border-neutral-900 bg-neutral-950/60 p-6 sm:p-8 shadow-2xl space-y-6 text-left relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-indigo-500/20" />

                <div className="space-y-2">
                  <div className="flex h-10 w-10 rounded-full bg-indigo-950/50 border border-indigo-500/30 items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">✓ API Key Copied</h3>
                  <p className="text-xs text-neutral-400">
                    Your environment is fully initialized and credentials are ready.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-neutral-500 uppercase block tracking-widest">NEXT STEP</span>
                  <p className="text-xs text-neutral-200">Make your first API request in our interactive quickstart suite.</p>
                </div>

                <button
                  onClick={handleGoToQuickstart}
                  className="w-full flex justify-center items-center space-x-2 rounded bg-white py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-sm hover:bg-neutral-200 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Start Quickstart</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer Branding Info */}
      <footer className="border-t border-neutral-900 bg-neutral-950/30 py-4 px-6 text-center text-[10px] text-neutral-600 uppercase">
        FlexBank Sandbox Core Ledger Engine © 2026. Secure Sandboxed Platform Environment. No real money.
      </footer>
    </div>
  );
};

export default Onboarding;
