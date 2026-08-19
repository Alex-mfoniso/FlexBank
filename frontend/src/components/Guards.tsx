import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useApp } from "../context/AppContext";

export const PrivateRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useApp();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    // Preserve the location state for graceful post-auth return redirection
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const PublicRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { token, selectedProjectId, projects, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (token) {
    // Elegant redirect fallback based on whether they already have an active project
    if (selectedProjectId) {
      return <Navigate to={`/projects/${selectedProjectId}`} replace />;
    } else if (projects.length > 0) {
      return <Navigate to={`/projects/${projects[0].id}`} replace />;
    } else {
      return <Navigate to="/projects" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
