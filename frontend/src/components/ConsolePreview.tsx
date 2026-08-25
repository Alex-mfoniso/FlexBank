import React, { useState, useEffect } from "react";
import { Server, Activity, Database, CheckCircle2, Cpu } from "lucide-react";

interface RequestLog {
  id: string;
  method: string;
  endpoint: string;
  status: number;
  latency: string;
  timestamp: string;
}

export const ConsolePreview: React.FC = () => {
  const [requestsCount, setRequestsCount] = useState(12482);
  const [transactionsCount, setTransactionsCount] = useState(1284);
  const [logs, setLogs] = useState<RequestLog[]>([
    { id: "log_1", method: "POST", endpoint: "/api/v1/transfers", status: 201, latency: "14ms", timestamp: "Just now" },
    { id: "log_2", method: "GET", endpoint: "/api/v1/accounts", status: 200, latency: "8ms", timestamp: "12s ago" },
    { id: "log_3", method: "POST", endpoint: "/api/v1/customers", status: 201, latency: "22ms", timestamp: "1m ago" },
    { id: "log_4", method: "GET", endpoint: "/api/v1/accounts/acc_test_82ef10b9/transactions", status: 200, latency: "11ms", timestamp: "3m ago" },
  ]);

  useEffect(() => {
    const templates = [
      { method: "POST", endpoint: "/api/v1/transfers", status: 201, isTx: true },
      { method: "GET", endpoint: "/api/v1/accounts", status: 200, isTx: false },
      { method: "POST", endpoint: "/api/v1/customers", status: 201, isTx: false },
      { method: "POST", endpoint: "/api/v1/sandbox/fund", status: 200, isTx: false },
      { method: "GET", endpoint: "/api/v1/accounts/acc_test_82ef10b9/transactions", status: 200, isTx: false },
    ];

    const interval = setInterval(() => {
      // Pick a random trace template
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      setRequestsCount((prev) => prev + 1);
      if (template.isTx) {
        setTransactionsCount((prev) => prev + 1);
      }

      const randomLatency = Math.floor(Math.random() * 15) + 6 + "ms";
      const newLog: RequestLog = {
        id: `log_${Date.now()}`,
        method: template.method,
        endpoint: template.endpoint,
        status: template.status,
        latency: randomLatency,
        timestamp: "Just now",
      };

      // Update old logs timestamp
      setLogs((prevLogs) => {
        const updated = prevLogs.map((l, idx) => ({
          ...l,
          timestamp: idx === 0 ? "8s ago" : idx === 1 ? "34s ago" : "1m ago",
        }));
        return [newLog, ...updated.slice(0, 4)];
      });

    }, 5500);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 bg-[#030303] border-b border-neutral-900 px-6 lg:px-12 select-none relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Title Section */}
        <div className="text-left space-y-4 max-w-2xl">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">
            Metrics Interface
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Developer Console Preview
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Monitor transaction volumes, query logs, system latencies, and ledger audit counts in real-time.
          </p>
        </div>

        {/* Dashboard Box Preview (Section 9 Specs precisely) */}
        <div className="max-w-4xl mx-auto rounded-lg border border-neutral-900 bg-neutral-950/40 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          
          {/* Main Header bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-900 pb-4 mb-6 font-mono text-[10px] gap-3">
            <div className="flex items-center space-x-3 text-neutral-400">
              <span className="text-[10px] text-neutral-500 font-bold uppercase select-none">Project:</span>
              <span className="text-white font-black uppercase tracking-wider">My Wallet</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[8px] bg-neutral-900 text-neutral-600 font-bold px-2 py-0.5 rounded border border-neutral-900/60 uppercase">
                DEMO DATA
              </span>
              <span className="text-[8px] font-black uppercase tracking-wide bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-amber-400">
                TEST MODE
              </span>
            </div>
          </div>

          {/* Three Aggregate Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 font-mono">
            
            {/* Metric 1: API Requests */}
            <div className="rounded border border-neutral-900 bg-neutral-950 p-5 text-left space-y-2 relative overflow-hidden group">
              <div className="flex justify-between items-center text-neutral-600 select-none">
                <span className="text-[9px] font-bold uppercase tracking-wider">API Requests</span>
                <Cpu className="h-4 w-4 text-neutral-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              <p className="text-2xl font-black text-white tracking-tight select-all">
                {requestsCount.toLocaleString()}
              </p>
              <div className="text-[8px] text-neutral-500 font-medium select-none">
                Accumulated sandboxed calls
              </div>
            </div>

            {/* Metric 2: Transactions */}
            <div className="rounded border border-neutral-900 bg-neutral-950 p-5 text-left space-y-2 relative overflow-hidden group">
              <div className="flex justify-between items-center text-neutral-600 select-none">
                <span className="text-[9px] font-bold uppercase tracking-wider">Transactions</span>
                <Database className="h-4 w-4 text-neutral-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              <p className="text-2xl font-black text-white tracking-tight select-all">
                {transactionsCount.toLocaleString()}
              </p>
              <div className="text-[8px] text-neutral-500 font-medium select-none">
                Settled ledger journal posts
              </div>
            </div>

            {/* Metric 3: Success Rate */}
            <div className="rounded border border-neutral-900 bg-neutral-950 p-5 text-left space-y-2 relative overflow-hidden group">
              <div className="flex justify-between items-center text-neutral-600 select-none">
                <span className="text-[9px] font-bold uppercase tracking-wider">Success Rate</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-400 tracking-tight select-all">
                99.2%
              </p>
              <div className="text-[8px] text-neutral-500 font-medium select-none">
                Gateway compilation uptime
              </div>
            </div>

          </div>

          {/* Recent API Requests Tracer feed */}
          <div className="space-y-4 text-left font-mono">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-neutral-500 select-none border-b border-neutral-900/60 pb-2">
              <span className="flex items-center">
                <Server className="h-3.5 w-3.5 mr-1.5 text-neutral-600 animate-pulse" />
                Live API Request Log Stream
              </span>
              <span>Latency (ms)</span>
            </div>

            {/* Logs List Container */}
            <div className="rounded border border-neutral-900 bg-neutral-950 divide-y divide-neutral-900/80 overflow-hidden select-text">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-neutral-900/20 transition-all duration-300 animate-fade-in"
                >
                  <div className="flex items-center space-x-2.5 text-[11px]">
                    {/* Method indicators */}
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black border uppercase tracking-wider ${
                      log.method === "POST" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10" : "bg-sky-500/10 text-sky-400 border-sky-500/10"
                    }`}>
                      {log.method}
                    </span>

                    <span className="text-neutral-300 font-semibold truncate max-w-xs sm:max-w-md">
                      {log.endpoint}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-[10px] font-bold select-none">
                    <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[8px] tracking-wide border border-emerald-500/10">
                      {log.status}
                    </span>
                    <span className="text-neutral-500 w-12 text-right font-medium">{log.latency}</span>
                    <span className="text-neutral-600 w-16 text-right font-medium text-[9px]">{log.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[8px] font-bold text-neutral-600 uppercase tracking-wider select-none">
              // New API calls are simulated and stream in real time every 5 seconds.
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default ConsolePreview;
