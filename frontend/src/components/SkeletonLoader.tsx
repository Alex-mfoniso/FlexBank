import React from "react";

interface SkeletonLoaderProps {
  rows?: number;
  columns?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ rows = 4, columns = 5 }) => {
  const rowArray = Array.from({ length: rows });
  const colArray = Array.from({ length: columns });

  return (
    <div className="w-full space-y-4 animate-pulse">
      {/* Visual Header Skeleton placeholder */}
      <div className="h-6 bg-slate-200 rounded-lg w-1/4 mb-6" />

      {/* Row Block structures */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
        <div className="bg-slate-50 border-b border-slate-200 h-10 flex items-center px-4">
          <div className="h-4 bg-slate-200 rounded-md w-1/3" />
        </div>
        <div className="p-4 space-y-3">
          {rowArray.map((_, rIdx) => (
            <div key={rIdx} className="flex space-x-4 items-center justify-between py-1.5 border-b border-slate-100 last:border-none">
              {colArray.map((_, cIdx) => (
                <div
                  key={cIdx}
                  className={`h-4 bg-slate-200 rounded-md ${
                    cIdx === 0 ? "w-1/5" : cIdx === columns - 1 ? "w-1/12" : "w-1/6"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3].map((idx) => (
        <div key={idx} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
          <div className="h-4 bg-slate-200 rounded-md w-1/2" />
          <div className="h-8 bg-slate-200 rounded-md w-2/3" />
          <div className="h-3 bg-slate-100 rounded-md w-3/4" />
        </div>
      ))}
    </div>
  );
};
