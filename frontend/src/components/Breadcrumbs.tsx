import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ChevronRight } from "lucide-react";

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { projects } = useApp();

  const activeProject = projects.find((p) => p.id === projectId);
  const pathParts = location.pathname.split("/").filter(Boolean);

  const crumbs: Array<{ label: string; path: string }> = [];

  // Base parent
  crumbs.push({ label: "Projects", path: "/projects" });

  if (projectId) {
    const name = activeProject ? activeProject.name : "Loading...";
    crumbs.push({ label: name, path: `/projects/${projectId}/overview` });

    const subpages = pathParts.slice(2); // Skip ["projects", ":projectId"]
    let accumulatedPath = `/projects/${projectId}`;

    subpages.forEach((part) => {
      accumulatedPath += `/${part}`;
      let label = part;
      
      if (part.toLowerCase() === "overview") label = "Overview";
      else if (part.toLowerCase() === "customers") label = "Customers";
      else if (part.toLowerCase() === "accounts") label = "Accounts";
      else if (part.toLowerCase() === "transfers") label = "Transfers";
      else if (part.toLowerCase() === "transactions") label = "Transactions";
      else if (part.toLowerCase() === "webhooks") label = "Webhooks";
      else if (part.toLowerCase() === "api-keys") label = "API Keys";
      else if (part.toLowerCase() === "logs") label = "Logs";
      else if (part.toLowerCase() === "settings") label = "Settings";
      else if (part.toLowerCase() === "docs") label = "Documentation";
      else if (part.startsWith("cust_") || part.startsWith("acc_") || part.startsWith("trf_") || part.startsWith("req_")) {
        label = part.substring(0, 10) + "...";
      } else {
        label = part.charAt(0).toUpperCase() + part.slice(1);
      }

      crumbs.push({ label, path: accumulatedPath });
    });
  } else if (location.pathname === "/dashboard") {
    crumbs.push({ label: "Workspace Overview", path: "/dashboard" });
  }

  return (
    <nav className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-600 font-mono select-none">
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <React.Fragment key={`${crumb.path}-${idx}`}>
            {idx > 0 && <ChevronRight className="h-3 w-3 text-neutral-800 shrink-0" />}
            {isLast ? (
              <span className="text-neutral-400 font-black truncate max-w-[120px] sm:max-w-[180px]">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="hover:text-neutral-300 transition-colors">
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
