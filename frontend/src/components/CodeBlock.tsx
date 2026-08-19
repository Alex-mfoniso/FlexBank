import React, { useState } from "react";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  copyable?: boolean;
  expandable?: boolean;
  maxLines?: number;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "json",
  copyable = true,
  expandable = false,
  maxLines = 15,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!expandable);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code block", err);
    }
  };

  // Custom high-performance, regex-driven client-side syntax highlighter
  const highlightCode = (rawCode: string, lang: string) => {
    if (!rawCode) return "";
    
    // Escape standard HTML tags to prevent execution injection
    let escaped = rawCode
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    if (lang === "json") {
      return escaped.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
        (match) => {
          let cls = "text-slate-300"; // Default
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = "text-sky-400 font-semibold"; // JSON Key
            } else {
              cls = "text-emerald-400"; // JSON String Value
            }
          } else if (/true|false/.test(match)) {
            cls = "text-amber-400 font-bold"; // Boolean
          } else if (/null/.test(match)) {
            cls = "text-slate-500 italic"; // Null
          } else {
            cls = "text-violet-400 font-medium"; // Number
          }
          return `<span class="${cls}">${match}</span>`;
        }
      );
    }

    if (lang === "bash" || lang === "curl") {
      return escaped
        .replace(/(^curl\s|(?<=\s)-[a-zA-Z-]+\b|(?<=\s)--[a-zA-Z-]+\b)/g, '<span class="text-indigo-400 font-bold">$1</span>')
        .replace(/(https?:\/\/[^\s"\\]+)/g, '<span class="text-emerald-400 underline">$1</span>')
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")/g, '<span class="text-emerald-400">$1</span>')
        .replace(/(fb_test_[a-zA-Z0-9_]+)/g, '<span class="text-amber-400 font-bold tracking-tight">$1</span>');
    }

    if (lang === "javascript" || lang === "typescript" || lang === "node") {
      const keywords = /\b(const|let|var|function|return|import|from|async|await|try|catch|if|else|throw|new|export|default)\b/g;
      return escaped
        .replace(keywords, '<span class="text-indigo-400 font-semibold">$1</span>')
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"|'(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\'])*')/g, '<span class="text-emerald-400">$1</span>')
        .replace(/(\b\d+\b)/g, '<span class="text-violet-400">$1</span>')
        .replace(/(\/\/.*)/g, '<span class="text-slate-500 italic">$1</span>')
        .replace(/(fb_test_[a-zA-Z0-9_]+)/g, '<span class="text-amber-400 font-bold tracking-tight">$1</span>');
    }

    if (lang === "python") {
      const keywords = /\b(def|import|from|return|async|await|try|except|if|else|elif|print|in|is|not|None|True|False)\b/g;
      return escaped
        .replace(keywords, '<span class="text-indigo-400 font-semibold">$1</span>')
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"|'(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\'])*')/g, '<span class="text-emerald-400">$1</span>')
        .replace(/(\b\d+\b)/g, '<span class="text-violet-400">$1</span>')
        .replace(/(#.*)/g, '<span class="text-slate-500 italic">$1</span>')
        .replace(/(fb_test_[a-zA-Z0-9_]+)/g, '<span class="text-amber-400 font-bold tracking-tight">$1</span>');
    }

    return escaped;
  };

  const lines = code.trim().split("\n");
  const isTruncated = expandable && !isExpanded && lines.length > maxLines;
  const displayedLines = isTruncated ? lines.slice(0, maxLines) : lines;
  const highlightedHTML = highlightCode(displayedLines.join("\n"), language);

  return (
    <div className="relative group rounded-xl border border-slate-800 bg-slate-900 overflow-hidden text-left shadow-lg">
      
      {/* Code Header Bar details */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/60">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
          {language}
        </span>
        
        {copyable && (
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none transition-all"
            title="Copy snippet"
          >
            {copied ? (
              <div className="flex items-center space-x-1">
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400 text-[10px] font-bold">Copied</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <Copy className="h-3 w-3 text-slate-400 group-hover:text-slate-200" />
                <span className="text-[10px]">Copy</span>
              </div>
            )}
          </button>
        )}
      </div>

      {/* Code Content text blocks */}
      <div className="p-4 overflow-x-auto font-mono text-xs leading-relaxed text-slate-300">
        <pre dangerouslySetInnerHTML={{ __html: highlightedHTML }} className="font-mono text-[11px]" />
        
        {isTruncated && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Expand/Collapse Action Buttons */}
      {expandable && lines.length > maxLines && (
        <div className="flex justify-center border-t border-slate-800/60 bg-slate-950/20 py-1.5">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-slate-400 hover:text-white text-xs font-bold font-mono focus:outline-none"
          >
            {isExpanded ? (
              <div className="flex items-center space-x-1">
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Show Less</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Show More ({lines.length - maxLines} lines hidden)</span>
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
export default CodeBlock;
