import React, { useState } from 'react';
import { Check, Copy, Download, Trash2 } from 'lucide-react';
import {
  buildRlhfJsonlRecord,
  serializeRecordsToJsonl,
  type ClinicalCase,
  type RlhfJsonlRecord,
  type RubricScores,
} from '../utils/rlhfLogic';

interface GoldenReferenceInspectorProps {
  activeCase: ClinicalCase;
  rubric: RubricScores;
  batchRecords: RlhfJsonlRecord[];
  onExportCurrentCaseJsonl: () => void;
  onExportFullBatchJsonl: () => void;
  onRemoveBatchRecord: (id: string) => void;
}

type InspectorTab = 'golden-rewrite' | 'meta-prompt' | 'jsonl-payload';

export const GoldenReferenceInspector: React.FC<GoldenReferenceInspectorProps> = ({
  activeCase,
  rubric,
  batchRecords,
  onExportCurrentCaseJsonl,
  onExportFullBatchJsonl,
  onRemoveBatchRecord,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('golden-rewrite');
  const [copiedState, setCopiedState] = useState<string | null>(null);

  const liveRecord = buildRlhfJsonlRecord(activeCase, rubric);
  const singleLineJsonl = serializeRecordsToJsonl([liveRecord]).trim();
  const formattedJsonPreview = JSON.stringify(liveRecord, null, 2);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(label);
      setTimeout(() => setCopiedState(null), 2000);
    } catch {
      setCopiedState(null);
    }
  };

  return (
    <section id="golden-inspector" className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-display">
            04. Golden Reference Rewrite, Zero-Hallucination Meta-Prompt &amp; RLHF JSONL Inspector
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Inspect Dr. Ibrahim Mohammed&apos;s verified clinical rewrite, the 5-Gate system instructions, and the live DPO/RLHF `.jsonl` training payload.
          </p>
        </div>

        {/* Segmented Tab Controls */}
        <div
          role="tablist"
          aria-label="Golden Reference and System Prompt Tabs"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'golden-rewrite'}
            type="button"
            onClick={() => setActiveTab('golden-rewrite')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'golden-rewrite'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Golden Reference Rewrite
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'meta-prompt'}
            type="button"
            onClick={() => setActiveTab('meta-prompt')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'meta-prompt'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            5-Gate System Meta-Prompt
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'jsonl-payload'}
            type="button"
            onClick={() => setActiveTab('jsonl-payload')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'jsonl-payload'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            RLHF JSONL Payload ({batchRecords.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Golden Reference Rewrite */}
      {activeTab === 'golden-rewrite' && (
        <div role="tabpanel" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-800">
                  Author: {activeCase.goldenReference.author}
                </span>
                <span aria-hidden="true" className="mx-2">·</span>
                <span>Verified: {activeCase.goldenReference.lastVerified}</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopy(activeCase.goldenReference.rewriteText, 'golden')
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedState === 'golden' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    <span>Copied Golden Rewrite</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy Golden Rewrite</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-900 whitespace-pre-wrap leading-relaxed">
              {activeCase.goldenReference.rewriteText}
            </pre>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="border border-slate-200 rounded-md p-4 bg-slate-50/50 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-900 font-display">
                Non-Negotiable Pharmacotherapy Invariants
              </h3>
              <ul className="space-y-2 text-xs text-slate-700">
                {activeCase.goldenReference.keyPharmacotherapyInvariants.map(
                  (inv) => (
                    <li
                      key={inv}
                      className="p-2.5 bg-white border border-slate-200 rounded leading-relaxed"
                    >
                      {inv}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="border border-slate-200 rounded-md p-4 bg-slate-50/50 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 font-display">
                Evidence &amp; Society Guideline Anchors
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-600 font-mono">
                {activeCase.goldenReference.guidelineCitations.map((cite) => (
                  <li key={cite} className="leading-relaxed">
                    • {cite}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 5-Gate System Meta-Prompt */}
      {activeTab === 'meta-prompt' && (
        <div role="tabpanel" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-slate-600">
                <span>Architecture Version: {activeCase.metaPromptArchitecture.version}</span>
                <span aria-hidden="true" className="mx-2">·</span>
                <span>Zero-Hallucination CoT Protocol</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    activeCase.metaPromptArchitecture.zeroHallucinationSystemInstructions,
                    'metaprompt'
                  )
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedState === 'metaprompt' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    <span>Copied Meta-Prompt</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy System Instructions</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-slate-100 border border-slate-800 rounded-md text-xs font-mono whitespace-pre-wrap leading-relaxed">
              {activeCase.metaPromptArchitecture.zeroHallucinationSystemInstructions}
            </pre>
          </div>

          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 font-display">
              Scenario-Specific Hard Safety Gates ({activeCase.code})
            </h3>
            <div className="space-y-3">
              {activeCase.metaPromptArchitecture.safetyGates.map((g) => (
                <div
                  key={g.gate}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5 text-xs"
                >
                  <div className="font-bold text-slate-900 font-display">{g.gate}</div>
                  <p className="text-slate-700 leading-relaxed">{g.constraint}</p>
                  <div className="pt-1 font-mono text-[11px] text-blue-800">
                    Target Check: {g.verificationTarget}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: RLHF JSONL Payload & Batch Queue */}
      {activeTab === 'jsonl-payload' && (
        <div role="tabpanel" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-800">
                Live DPO / RLHF Training Record (`{activeCase.code}.jsonl`)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(singleLineJsonl, 'jsonl')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedState === 'jsonl' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      <span>Copied .jsonl Line</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copy Single-Line JSONL</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onExportCurrentCaseJsonl}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Download Case .jsonl</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-900 text-slate-100 border border-slate-800 rounded-md text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
              {formattedJsonPreview}
            </pre>
          </div>

          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 font-display">
                Staged Multi-Case RLHF Dataset Queue ({batchRecords.length} Records)
              </h3>
              <button
                type="button"
                onClick={onExportFullBatchJsonl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Export Full Batch .jsonl ({batchRecords.length})</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-md divide-y divide-slate-200 bg-slate-50/40">
              {batchRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-white transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-slate-900 truncate">
                      {rec.case_code} · Pref: {rec.preference_ranking} · Score:{' '}
                      {rec.rubric_scores.composite_clinical_score}/100
                    </div>
                    <div className="text-slate-500 truncate mt-0.5">
                      Severity: {rec.hallucination_severity} · Auditor: {rec.auditor}
                    </div>
                  </div>
                  {batchRecords.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveBatchRecord(rec.id)}
                      aria-label={`Remove ${rec.case_code} from batch`}
                      className="p-1.5 text-slate-500 hover:text-red-700 rounded hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
