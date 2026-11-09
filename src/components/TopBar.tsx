import React from 'react';
import { Download } from 'lucide-react';

interface TopBarProps {
  onExportJsonl: () => void;
  batchCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({ onExportJsonl, batchCount }) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white/95 backdrop-blur border-b border-slate-200">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#workbench-top"
        className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
      >
        ClinRLHF Workbench
      </a>

      {/* Zone 2: 4 concise single-line text navigation links */}
      <nav
        aria-label="Primary Workbench Navigation"
        className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
      >
        <a
          href="#case-selector"
          className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
        >
          Clinical Cases
        </a>
        <a
          href="#model-comparison"
          className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
        >
          Model Comparison
        </a>
        <a
          href="#rubric-scorer"
          className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
        >
          Clinical Rubric
        </a>
        <a
          href="#golden-inspector"
          className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
        >
          Golden Reference
        </a>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onExportJsonl}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Export RLHF JSONL ({batchCount})</span>
        </button>
      </div>
    </header>
  );
};
