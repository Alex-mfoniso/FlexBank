import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import type { ApiErrorPayload } from "../lib/api";
import {
  Settings as SettingsIcon,
  Save,
  Trash2,
  Building,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ShieldAlert
} from "lucide-react";

export const Settings: React.FC = () => {
  const { activeProject, user, refreshProjects, setSelectedProjectId } = useApp();
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Derive organization context and member roles from active state
  const membership = (user as any)?.memberships?.find(
    (m: any) => m.organizationId === activeProject?.organizationId
  );
  const userRole = membership?.role || "owner"; // Fallback securely
  const orgName = membership?.organizationName || "FlexBank Developer Workspace";
  const orgSlug = membership?.organizationSlug || "dev-org";

  const isAuthorizedToEdit = ["owner", "admin", "developer"].includes(userRole);
  const isAuthorizedToDelete = ["owner", "admin"].includes(userRole);

  useEffect(() => {
    if (activeProject) {
      setName(activeProject.name);
      setDescription(activeProject.description || "");
      setError(null);
      setSuccess(null);
    }
  }, [activeProject]);

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      await api.patch(`/api/v1/projects/${activeProject.id}`, {
        name: name.trim(),
        description: description.trim() || null,
      });

      setSuccess("Project settings successfully updated!");
      await refreshProjects();
    } catch (err: any) {
      setError(err as ApiErrorPayload);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || deleteConfirm !== activeProject.name) return;

    setError(null);
    setIsDeleting(true);

    try {
      await api.delete(`/api/v1/projects/${activeProject.id}`);
      
      // Clear context selected project and refresh list
      localStorage.removeItem("selectedProjectId");
      setSelectedProjectId(null);
      await refreshProjects();
      
      navigate("/projects");
    } catch (err: any) {
      setError(err as ApiErrorPayload);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex h-[50vh] items-center justify-center font-mono">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left font-mono select-none">
      
      {/* Page Header */}
      <div className="pb-5 border-b border-neutral-900">
        <h1 className="text-xl font-black text-white uppercase tracking-tight">Project Settings</h1>
        <p className="text-[10px] text-neutral-500 font-semibold mt-1">
          Manage your project workspace settings, environments, and developer details
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-950/60 bg-red-950/5 p-4 flex items-start space-x-3 text-red-200/90 leading-relaxed max-w-2xl">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-red-400">Operation failed</h3>
            <p className="mt-1 text-[11px] font-semibold leading-normal">{error.message}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded border border-emerald-900/60 bg-emerald-950/5 p-4 flex items-start space-x-3 text-emerald-200/90 leading-relaxed max-w-2xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider">{success}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Panel: Configuration form & Danger Zone */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* General Metadata Card */}
          <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-neutral-900 bg-neutral-950/20">
              <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center space-x-2">
                <SettingsIcon className="h-4.5 w-4.5 text-neutral-500" />
                <span>General Workspace Configuration</span>
              </h2>
            </div>
            
            <form onSubmit={handleUpdateProject} className="p-5 space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Project ID
                </label>
                <div className="mt-1.5 font-mono text-xs bg-neutral-950 border border-neutral-900 text-neutral-400 px-3 py-2 rounded select-all">
                  {activeProject.id}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Environment Tier Mode
                </label>
                <div className="mt-1.5">
                  <span className="inline-flex items-center rounded border border-amber-900/40 bg-amber-950/20 px-2.5 py-0.5 text-[9px] font-bold uppercase text-amber-500 font-mono">
                    {activeProject.environment} Environment
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="projName" className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Project Name
                </label>
                <input
                  id="projName"
                  type="text"
                  required
                  disabled={!isAuthorizedToEdit}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label htmlFor="projDesc" className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Project Description
                </label>
                <textarea
                  id="projDesc"
                  rows={3}
                  disabled={!isAuthorizedToEdit}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                  placeholder="Optional description of this workspace"
                />
              </div>

              {isAuthorizedToEdit && (
                <div className="flex justify-end pt-4 border-t border-neutral-900/60">
                  <button
                    type="submit"
                    disabled={isSaving || !name.trim()}
                    className="inline-flex items-center space-x-2 rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Danger Zone */}
          {isAuthorizedToDelete && (
            <div className="rounded-lg border border-red-950/60 bg-red-950/5 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-red-950/60 bg-red-950/10">
                <h2 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center space-x-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />
                  <span>Danger Zone</span>
                </h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Delete this project</h4>
                  <p className="mt-1 text-[11px] text-neutral-500 leading-relaxed font-medium">
                    Once deleted, all sandbox customers, accounts, ledger records, API credentials, and webhooks will be permanently erased. This operation is absolute and cannot be undone.
                  </p>
                </div>

                <form onSubmit={handleDeleteProject} className="space-y-3 bg-neutral-950/40 p-4 rounded border border-neutral-900/60">
                  <label htmlFor="confirmInput" className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider leading-relaxed">
                    To confirm deletion, type: <span className="font-mono bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-900 select-all font-black text-white">{activeProject.name}</span>
                  </label>
                  <input
                    id="confirmInput"
                    type="text"
                    required
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-mono"
                    placeholder="Type project name exactly"
                  />
                  <button
                    type="submit"
                    disabled={isDeleting || deleteConfirm !== activeProject.name}
                    className="inline-flex w-full justify-center items-center space-x-2 rounded bg-red-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Permanently Delete Project</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Organization Info Widget */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-5">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center space-x-2 border-b border-neutral-900 pb-3">
              <Building className="h-4.5 w-4.5 text-neutral-500" />
              <span>Parent Organization</span>
            </h3>

            <div className="space-y-4 text-left text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Organization Name</p>
                <p className="mt-1 text-xs font-bold text-neutral-300">{orgName}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Organization Slug</p>
                <p className="mt-1 text-xs font-mono text-indigo-400">/{orgSlug}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Your Membership Role</p>
                <p className="mt-1">
                  <span className="inline-flex items-center rounded border border-indigo-900/40 bg-indigo-950/20 px-2.5 py-0.5 text-[9px] font-bold text-indigo-400 uppercase tracking-wider font-mono">
                    {userRole}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
