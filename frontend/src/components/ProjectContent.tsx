import React from "react";

interface ProjectContentProps {
  children: React.ReactNode;
}

export const ProjectContent: React.FC<ProjectContentProps> = ({ children }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
      {/* Dynamic backdrop dot grids */}
      <div className="absolute inset-0 opacity-[0.02] bg-dot-pattern pointer-events-none" />
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8">
        {children}
      </div>
    </div>
  );
};

export default ProjectContent;
