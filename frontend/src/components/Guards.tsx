import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useApp } from "../context/AppContext";

export const PrivateRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useApp();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030303] text-white relative">
        <div className="absolute inset-0 opacity-5 bg-dot-pattern pointer-events-none" />
        <div className="flex flex-col items-center space-y-4 relative z-10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-900 border-t-indigo-600" />
          <p className="text-xs font-bold text-neutral-500 font-mono uppercase tracking-widest">Initializing secure session...</p>
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
      <div className="flex min-h-screen items-center justify-center bg-[#030303] text-white relative">
        <div className="absolute inset-0 opacity-5 bg-dot-pattern pointer-events-none" />
        <div className="flex flex-col items-center space-y-4 relative z-10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-900 border-t-indigo-600" />
          <p className="text-xs font-bold text-neutral-500 font-mono uppercase tracking-widest">Redirecting secure session...</p>
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
