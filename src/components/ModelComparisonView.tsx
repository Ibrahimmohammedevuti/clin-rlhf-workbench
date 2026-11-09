import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  countSpanSeverities,
  type AnnotatedSpan,
  type ClinicalCase,
} from '../utils/rlhfLogic';

interface ModelComparisonViewProps {
  activeCase: ClinicalCase;
  showHighlights: boolean;
  onToggleHighlights: () => void;
  selectedSpan: AnnotatedSpan | null;
  onSelectSpan: (span: AnnotatedSpan) => void;
}

export const ModelComparisonView: React.FC<ModelComparisonViewProps> = ({
  activeCase,
  showHighlights,
  onToggleHighlights,
  selectedSpan,
  onSelectSpan,
}) => {
  const countsA = countSpanSeverities(activeCase.candidateA.spans);
  const countsB = countSpanSeverities(activeCase.candidateB.spans);

  const allAnnotatedSpans = [
    ...activeCase.candidateA.spans.filter((s) => s.isAnnotation),
    ...activeCase.candidateB.spans.filter((s) => s.isAnnotation),
  ];

  const activeInspectedSpan =
    selectedSpan && allAnnotatedSpans.some((s) => s.id === selectedSpan.id)
      ? selectedSpan
      : allAnnotatedSpans[0] ?? null;

  return (
    <section id="model-comparison" className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
      {/* Header & Highlight Toggle Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-display">
            02. Side-by-Side Model Comparison &amp; Inline Hallucination Auditor
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Click any highlighted red (Critical Harm), amber (Minor/Moderate Error), or emerald (Verified Safety Gate) inline span to inspect its pharmacokinetic mechanism and guideline remediation.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleHighlights}
            aria-pressed={showHighlights}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showHighlights
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {showHighlights ? (
              <>
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Hallucination Highlights: ON</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Hallucination Highlights: OFF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Two-Column Candidate Trajectory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Candidate Model A (Unaligned Base LLM) */}
        <div className="flex flex-col justify-between border border-slate-200 rounded-lg p-5 bg-slate-50/40">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  {activeCase.candidateA.modelName}
                </h3>
                <span className="text-xs font-mono font-semibold text-red-700 whitespace-nowrap">
                  ✖ {countsA.criticalCount} Critical · ▲ {countsA.minorCount} Minor
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                <span>{activeCase.candidateA.architectureTag}</span>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span>{activeCase.candidateA.latencyMs} ms</span>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span>{activeCase.candidateA.tokenCount} tokens</span>
              </div>
            </div>

            <div className="text-sm text-slate-800 leading-relaxed space-y-2">
              {activeCase.candidateA.spans.map((span) => {
                if (!span.isAnnotation || !showHighlights) {
                  return <span key={span.id}>{span.text}</span>;
                }
                const isSelected = activeInspectedSpan?.id === span.id;
                const isCritical = span.severity === 'critical';

                return (
                  <button
                    key={span.id}
                    type="button"
                    onClick={() => onSelectSpan(span)}
                    className={`block w-full text-left rounded-md px-3 py-2 my-1.5 font-medium transition-colors cursor-pointer ${
                      isCritical
                        ? isSelected
                          ? 'bg-red-700 text-white shadow-xs'
                          : 'bg-red-100/90 text-red-950 hover:bg-red-200 border border-red-300'
                        : isSelected
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-amber-100/90 text-amber-950 hover:bg-amber-200 border border-amber-300'
                    }`}
                  >
                    <span className="font-mono text-[11px] font-bold mr-1.5">
                      {isCritical ? '[✖ CRITICAL HARM] ' : '[▲ DOSING ERROR] '}
                    </span>
                    <span>{span.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium text-red-800">{activeCase.candidateA.summaryVerdict}</span>
            <span className="font-mono">Trajectory Role: REJECTED</span>
          </div>
        </div>

        {/* Candidate Model B (Chain-of-Thought Prompted LLM) */}
        <div className="flex flex-col justify-between border border-slate-200 rounded-lg p-5 bg-slate-50/40">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  {activeCase.candidateB.modelName}
                </h3>
                <span className="text-xs font-mono font-semibold text-emerald-700 whitespace-nowrap">
                  ● {countsB.verifiedCount} Safety Gates Verified
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                <span>{activeCase.candidateB.architectureTag}</span>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span>{activeCase.candidateB.latencyMs} ms</span>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span>{activeCase.candidateB.tokenCount} tokens</span>
              </div>
            </div>

            <div className="text-sm text-slate-800 leading-relaxed space-y-2">
              {activeCase.candidateB.spans.map((span) => {
                if (!span.isAnnotation || !showHighlights) {
                  return <span key={span.id}>{span.text}</span>;
                }
                const isSelected = activeInspectedSpan?.id === span.id;

                return (
                  <button
                    key={span.id}
                    type="button"
                    onClick={() => onSelectSpan(span)}
                    className={`block w-full text-left rounded-md px-3 py-2 my-1.5 font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border border-emerald-300'
                    }`}
                  >
                    <span className="font-mono text-[11px] font-bold mr-1.5">
                      {'[● VERIFIED GATE] '}
                    </span>
                    <span>{span.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium text-emerald-800">{activeCase.candidateB.summaryVerdict}</span>
            <span className="font-mono">Trajectory Role: ALIGNED CoT</span>
          </div>
        </div>
      </div>

      {/* Interactive Clinical Span Forensic Inspector Panel */}
      {activeInspectedSpan && (
        <div
          aria-live="polite"
          className={`rounded-lg border p-5 space-y-4 ${
            activeInspectedSpan.severity === 'critical'
              ? 'bg-red-50/50 border-red-200'
              : activeInspectedSpan.severity === 'minor'
              ? 'bg-amber-50/50 border-amber-200'
              : 'bg-emerald-50/50 border-emerald-200'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-3 border-b border-slate-200/80">
            <div className="space-y-0.5">
              <div className="text-xs font-mono text-slate-600">
                <span>Forensic Span Inspector</span>
                <span aria-hidden="true" className="mx-2">·</span>
                <span>Span ID: {activeInspectedSpan.id}</span>
                <span aria-hidden="true" className="mx-2">·</span>
                <span
                  className={
                    activeInspectedSpan.severity === 'critical'
                      ? 'text-red-700 font-semibold'
                      : activeInspectedSpan.severity === 'minor'
                      ? 'text-amber-700 font-semibold'
                      : 'text-emerald-700 font-semibold'
                  }
                >
                  {activeInspectedSpan.severity === 'critical'
                    ? '✖ Severity: Critical Patient Harm'
                    : activeInspectedSpan.severity === 'minor'
                    ? '▲ Severity: Moderate / Dosing Error'
                    : '● Severity: Verified Safety Gate'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 font-display">
                {activeInspectedSpan.category}
              </h4>
            </div>

            {/* Quick Span Switcher Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {allAnnotatedSpans.map((s, idx) => {
                const isActive = s.id === activeInspectedSpan.id;
                const labelPrefix =
                  s.severity === 'critical'
                    ? `Err #${idx + 1} (Crit)`
                    : s.severity === 'minor'
                    ? `Err #${idx + 1} (Mod)`
                    : `Gate #${idx + 1}`;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelectSpan(s)}
                    className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {labelPrefix}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded text-xs font-mono text-slate-800">
            &ldquo;{activeInspectedSpan.text}&rdquo;
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white border border-slate-200 rounded p-3.5 space-y-1">
              <div className="font-semibold text-slate-900">
                Clinical &amp; Pathophysiological Audit
              </div>
              <p className="text-slate-700 leading-relaxed">
                {activeInspectedSpan.explanation}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded p-3.5 space-y-1">
              <div className="font-semibold text-slate-900">
                Pharmacokinetic / Physiological Mechanism &amp; Citation
              </div>
              {activeInspectedSpan.pharmacokineticMechanism && (
                <p className="text-slate-700 leading-relaxed mb-2">
                  {activeInspectedSpan.pharmacokineticMechanism}
                </p>
              )}
              <p className="font-mono text-[11px] text-slate-600">
                Ref: {activeInspectedSpan.guidelineReference}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded p-3.5 space-y-1">
              <div className="font-semibold text-slate-900">
                Required Alignment Remediation
              </div>
              <p className="text-slate-700 leading-relaxed">
                {activeInspectedSpan.remediation ??
                  'Maintain this verified 5-Gate clinical reasoning constraint in the chosen DPO trajectory.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
