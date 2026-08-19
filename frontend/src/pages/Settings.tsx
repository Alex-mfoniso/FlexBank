import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  FolderDot,
  CheckCircle2,
} from "lucide-react";

export const Settings: React.FC = () => {
  const { activeProject, user, refreshProjects, setSelectedProjectId } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Derive organization context and member roles
  const membership = (user as any)?.memberships?.find(
    (m: any) => m.organizationId === activeProject?.organizationId
  );
  const userRole = membership?.role || "viewer";
  const orgName = membership?.organizationName || "Unknown Organization";
  const orgSlug = membership?.organizationSlug || "";

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
        name,
        description: description || null,
      });

      setSuccess("Project settings successfully updated!");
      await refreshProjects();
    } catch (err: any) {
      setError(err as ApiErrorPayload);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProject || deleteConfirm !== activeProject.name) return;

    setError(null);
    setIsDeleting(true);

    try {
      await api.delete(`/api/v1/projects/${activeProject.id}`);
      
      // Clear selected project and refresh list
      localStorage.removeItem("selectedProjectId");
      setSelectedProjectId(null);
      await refreshProjects();
      
      navigate("/projects");
    } catch (err: any) {
      setError(err as ApiErrorPayload);
      setIsDeleting(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Project Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your project workspace settings, environments, and developer details
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-100">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-red-800">Operation failed</h3>
              <p className="mt-1 text-xs text-red-700">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-100">
          <div className="flex">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="ml-3">
              <p className="text-sm font-semibold text-emerald-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Double Panel: Config forms */}
        <div className="space-y-8 lg:col-span-2">
          {/* General Metadata Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-md font-bold text-slate-900 flex items-center space-x-2">
                <SettingsIcon className="h-4 w-4 text-indigo-500" />
                <span>General Workspace Configuration</span>
              </h2>
            </div>
            
            <form onSubmit={handleUpdateProject} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Project ID
                </label>
                <div className="mt-2 font-mono text-xs bg-slate-50 border border-slate-200 text-slate-600 px-3 py-2 rounded-md select-all">
                  {activeProject.id}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Environment Mode
                </label>
                <div className="mt-2 flex items-center">
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                      activeProject.environment === "live"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {activeProject.environment} Environment
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAuthorizedToEdit}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Project Description
                </label>
                <textarea
                  rows={3}
                  disabled={!isAuthorizedToEdit}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-2 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="Optional description of this workspace"
                />
              </div>

              {isAuthorizedToEdit && (
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSaving || !name.trim()}
                    className="inline-flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Danger Zone */}
          {isAuthorizedToDelete && (
            <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-red-100 bg-red-50/20">
                <h2 className="text-md font-bold text-red-900 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>Danger Zone</span>
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Delete this project</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Once deleted, all sandbox customers, accounts, ledger records, API credentials, and webhooks will be permanently erased. This operation is absolute and cannot be undone.
                  </p>
                </div>

                <div className="space-y-3 bg-red-50/50 p-4 rounded-lg border border-red-100">
                  <label className="block text-xs font-bold text-red-800 uppercase tracking-wider">
                    To confirm deletion, type: <span className="font-mono bg-white px-2 py-0.5 rounded border border-red-200 select-all">{activeProject.name}</span>
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="block w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="Type project name exactly"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteProject}
                    disabled={isDeleting || deleteConfirm !== activeProject.name}
                    className="inline-flex w-full justify-center items-center space-x-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-300"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span>Permanently Delete Project</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Org Info */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
            <h3 className="text-md font-bold text-slate-950 flex items-center space-x-2 border-b border-slate-100 pb-4">
              <Building className="h-4 w-4 text-indigo-500" />
              <span>Parent Organization</span>
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Organization Name</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{orgName}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Organization Slug</p>
                <p className="mt-1 text-sm font-mono text-slate-600">/{orgSlug}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Membership Role</p>
                <p className="mt-1 flex items-center">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-100 uppercase tracking-wider">
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
