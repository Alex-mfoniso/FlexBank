import React, { useState, useEffect } from "react";
import { Play, RotateCcw, Check, Sparkles, Terminal } from "lucide-react";

export const ApiDemo: React.FC = () => {
  const [animationState, setAnimationState] = useState<"idle" | "sending" | "success">("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (animationState === "idle") {
      timer = setTimeout(() => {
        setAnimationState("sending");
      }, 3000);
    } else if (animationState === "sending") {
      // Simulate loading progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setAnimationState("success");
            return 0;
          }
          return prev + 15;
        });
      }, 100);
    } else if (animationState === "success") {
      timer = setTimeout(() => {
        setAnimationState("idle");
      }, 7000);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [animationState]);

  // Request Code payload
  const requestCode = `{
  "type": "internal",
  "sourceAccountId": "acc_82ef10b9",
  "destinationAccountId": "acc_91ab45f2",
  "amount": 10000,
  "currency": "NGN",
  "reference": "ref_demo_01"
}`;

  // Response Code payload
  const responseCode = `{
  "id": "tx_220ffc15",
  "sourceAccountId": "acc_82ef10b9",
  "destinationAccountId": "acc_91ab45f2",
  "amount": 10000,
  "currency": "NGN",
  "status": "COMPLETED",
  "createdAt": "2026-08-25T20:20:10Z"
}`;

  const triggerReset = () => {
    setProgress(0);
    setAnimationState("idle");
  };

  const triggerStart = () => {
    setProgress(0);
    setAnimationState("sending");
  };

  return (
    <div className="w-full max-w-[440px] rounded-lg border border-neutral-900 bg-neutral-950/80 shadow-2xl relative overflow-hidden font-mono text-[11px] text-neutral-300">
      
      {/* 1. Terminal Header bar */}
      <div className="flex items-center justify-between h-9 px-4 border-b border-neutral-900 bg-neutral-950/90 select-none">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-neutral-800" />
          <div className="h-2 w-2 rounded-full bg-neutral-800" />
          <div className="h-2 w-2 rounded-full bg-neutral-800" />
          <span className="text-[10px] text-neutral-500 font-bold ml-1 tracking-wider uppercase flex items-center">
            <Terminal className="h-3 w-3 mr-1.5 text-neutral-500" />
            POST /api/v1/transfers
          </span>
        </div>
        
        {/* Play/Reset trigger icons */}
        <div className="flex items-center space-x-2">
          {animationState === "success" ? (
            <button
              onClick={triggerReset}
              className="text-neutral-500 hover:text-white transition-colors focus:outline-none p-1 rounded hover:bg-neutral-900 cursor-pointer"
              title="Replay sequence"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={triggerStart}
              disabled={animationState === "sending"}
              className="text-neutral-500 hover:text-white transition-colors focus:outline-none p-1 rounded hover:bg-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Run transfer"
            >
              <Play className="h-3 w-3 fill-current" />
            </button>
          )}
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* 2. Main Console viewport split */}
      <div className="p-4 space-y-4">
        
        {/* A. REQUEST BOX */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-neutral-500 select-none uppercase tracking-wider font-bold">
            <span>Payload Request</span>
            <span className="text-neutral-600">Bearer fb_test_81bc...</span>
          </div>
          <div className="rounded border border-neutral-900 bg-neutral-950 p-3 leading-relaxed text-neutral-400 overflow-x-auto">
            <pre>
              <span className="text-neutral-500">{"{"}</span>
              {"\n"}  <span className="text-indigo-400">"type"</span>: <span className="text-emerald-400">"internal"</span>,
              {"\n"}  <span className="text-indigo-400">"sourceAccountId"</span>: <span className="text-emerald-400">"acc_82ef10b9"</span>,
              {"\n"}  <span className="text-indigo-400">"destinationAccountId"</span>: <span className="text-emerald-400">"acc_91ab45f2"</span>,
              {"\n"}  <span className="text-indigo-400">"amount"</span>: <span className="text-violet-400">10000</span>,
              {"\n"}  <span className="text-indigo-400">"currency"</span>: <span className="text-emerald-400">"NGN"</span>,
              {"\n"}  <span className="text-indigo-400">"reference"</span>: <span className="text-emerald-400">"ref_demo_01"</span>
              {"\n"}<span className="text-neutral-500">{"}"}</span>
            </pre>
          </div>
        </div>

        {/* B. ANIMATION INTERMEDIATE LAYER */}
        <div className="h-6 flex items-center justify-between select-none">
          {animationState === "idle" && (
            <div className="text-neutral-600 text-[10px] flex items-center">
              <span>Waiting to settle transaction...</span>
            </div>
          )}
          
          {animationState === "sending" && (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-400 text-[10px]">
                <div className="h-3 w-3 animate-spin rounded-full border border-amber-500/20 border-t-amber-400" />
                <span className="font-bold uppercase tracking-wider">Ricarut Settle Engine Settle...</span>
              </div>
              <div className="flex-1 max-w-[120px] h-1 bg-neutral-900 rounded overflow-hidden ml-4">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 transition-all duration-100 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {animationState === "success" && (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-emerald-400 text-[10px]">
                <Check className="h-3.5 w-3.5" />
                <span className="font-bold uppercase tracking-wider">✓ Settle successful</span>
              </div>
              <div className="text-[10px] text-neutral-500 font-bold bg-neutral-900/60 px-2 py-0.5 rounded border border-neutral-900/40">
                231ms
              </div>
            </div>
          )}
        </div>

        {/* C. RESPONSE BOX */}
        <div className="space-y-1 relative min-h-[140px]">
          <div className="flex items-center justify-between text-[10px] text-neutral-500 select-none uppercase tracking-wider font-bold">
            <span>Response Payload</span>
            <span className={animationState === "success" ? "text-emerald-400" : "text-neutral-600"}>
              {animationState === "success" ? "201 Created" : "redacted"}
            </span>
          </div>

          {animationState === "success" ? (
            <div className="rounded border border-emerald-500/10 bg-neutral-950 p-3 leading-relaxed text-neutral-400 overflow-x-auto transition-all duration-300 shadow-md shadow-emerald-500/5">
              <pre className="animate-fade-in">
                <span className="text-neutral-500">{"{"}</span>
                {"\n"}  <span className="text-indigo-400">"id"</span>: <span className="text-emerald-400">"tx_220ffc15"</span>,
                {"\n"}  <span className="text-indigo-400">"sourceAccountId"</span>: <span className="text-emerald-400">"acc_82ef10b9"</span>,
                {"\n"}  <span className="text-indigo-400">"destinationAccountId"</span>: <span className="text-emerald-400">"acc_91ab45f2"</span>,
                {"\n"}  <span className="text-indigo-400">"amount"</span>: <span className="text-violet-400">10000</span>,
                {"\n"}  <span className="text-indigo-400">"currency"</span>: <span className="text-emerald-400">"NGN"</span>,
                {"\n"}  <span className="text-indigo-400">"status"</span>: <span className="text-emerald-400 font-bold">"COMPLETED"</span>,
                {"\n"}  <span className="text-indigo-400">"createdAt"</span>: <span className="text-emerald-400">"2026-08-25T20:20:10Z"</span>
                {"\n"}<span className="text-neutral-500">{"}"}</span>
              </pre>
            </div>
          ) : (
            <div className="absolute inset-0 rounded border border-neutral-900 border-dashed bg-neutral-950/30 flex items-center justify-center select-none">
              <div className="text-center space-y-1.5 p-4 text-neutral-600">
                <Sparkles className="h-5 w-5 mx-auto opacity-30 text-indigo-400 animate-pulse" />
                <p className="text-[10px] max-w-[200px] leading-relaxed">
                  Await active requests to inspect response schemas...
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ApiDemo;
