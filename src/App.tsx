/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { TopBar } from './components/TopBar';
import { CaseSelectorAndVignette } from './components/CaseSelectorAndVignette';
import { ModelComparisonView } from './components/ModelComparisonView';
import { RubricScorerPanel } from './components/RubricScorerPanel';
import { GoldenReferenceInspector } from './components/GoldenReferenceInspector';
import { PRELOADED_CLINICAL_CASES } from './data/clinicalCases';
import {
  buildRlhfJsonlRecord,
  serializeRecordsToJsonl,
  type AnnotatedSpan,
  type ClinicalCase,
  type RlhfJsonlRecord,
  type RubricScores,
} from './utils/rlhfLogic';
import {
  mapGeminiResponseToClinicalCase,
  synthesizeDeterministicCustomCase,
} from './utils/customClinicalSynthesizer';

export default function App() {
  const [activeCaseId, setActiveCaseId] = useState<string>(PRELOADED_CLINICAL_CASES[0].id);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customCase, setCustomCase] = useState<ClinicalCase>(() =>
    synthesizeDeterministicCustomCase({
      title: 'Decompensated Cirrhosis + Spontaneous Bacterial Peritonitis (HRS-AKI Prevention)',
      specialty: 'Hepatology · Critical Care · Infectious Disease',
      systemPrompt:
        'You are an inpatient hepatology clinical decision support model. Provide empirical antibiotic, volume expansion, and analgesic orders.',
      clinicalVignette:
        'A 61-year-old male with Child-Pugh Class C alcohol-related cirrhosis (MELD-Na 26, baseline serum creatinine 1.9 mg/dL, total bilirubin 4.8 mg/dL, INR 2.1, serum Na+ 127 mEq/L) presents with fever (38.4°C), tense ascites, and diffuse abdominal tenderness. Diagnostic paracentesis reveals ascitic fluid PMN count of 680 cells/mm³ and ascitic total protein of 0.9 g/dL. Blood pressure is 94/56 mmHg (mean arterial pressure 68 mmHg). Home medications include propranolol 40 mg BID and spironolactone 100 mg/furosemide 40 mg daily. Formulate the immediate antibiotic, volume resuscitation, diuretic/beta-blocker adjustment, and analgesia plan.',
    })
  );
  const [isEvaluatingCustom, setIsEvaluatingCustom] = useState<boolean>(false);
  const [customEvalSource, setCustomEvalSource] = useState<
    'idle' | 'gemini-live' | 'deterministic-engine'
  >('idle');

  const [rubricByCaseId, setRubricByCaseId] = useState<Record<string, RubricScores>>(() => {
    const initial: Record<string, RubricScores> = {};
    for (const c of PRELOADED_CLINICAL_CASES) {
      initial[c.id] = { ...c.defaultRubric };
    }
    return initial;
  });

  const [showHighlights, setShowHighlights] = useState<boolean>(true);
  const [selectedSpan, setSelectedSpan] = useState<AnnotatedSpan | null>(
    PRELOADED_CLINICAL_CASES[0].candidateA.spans.find((s) => s.isAnnotation) ?? null
  );

  // Initialize batch queue with the 4 benchmark records so batch export is immediately populated
  const [batchRecords, setBatchRecords] = useState<RlhfJsonlRecord[]>(() =>
    PRELOADED_CLINICAL_CASES.map((c) => buildRlhfJsonlRecord(c, c.defaultRubric))
  );

  const [exportNotification, setExportNotification] = useState<string | null>(null);

  const activeCase: ClinicalCase = isCustomMode
    ? customCase
    : PRELOADED_CLINICAL_CASES.find((c) => c.id === activeCaseId) ?? PRELOADED_CLINICAL_CASES[0];

  const activeRubric: RubricScores =
    rubricByCaseId[activeCase.id] ?? activeCase.defaultRubric;

  const triggerNotification = (msg: string) => {
    setExportNotification(msg);
    setTimeout(() => {
      setExportNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleSelectPreloadedCase = (caseId: string) => {
    setIsCustomMode(false);
    setActiveCaseId(caseId);
    const target = PRELOADED_CLINICAL_CASES.find((c) => c.id === caseId);
    if (target) {
      const firstSpan = target.candidateA.spans.find((s) => s.isAnnotation) ?? null;
      setSelectedSpan(firstSpan);
    }
  };

  const handleSelectCustomMode = () => {
    setIsCustomMode(true);
    setRubricByCaseId((prev) => ({
      ...prev,
      [customCase.id]: prev[customCase.id] ?? { ...customCase.defaultRubric },
    }));
    const firstSpan = customCase.candidateA.spans.find((s) => s.isAnnotation) ?? null;
    setSelectedSpan(firstSpan);
  };

  const handleRunCustomEvaluation = async (payload: {
    title: string;
    specialty: string;
    systemPrompt: string;
    clinicalVignette: string;
  }) => {
    setIsEvaluatingCustom(true);
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          metaPrompt: customCase.metaPromptArchitecture.zeroHallucinationSystemInstructions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.result) {
          const synthesized = mapGeminiResponseToClinicalCase(payload, data.result);
          setCustomCase(synthesized);
          setRubricByCaseId((prev) => ({
            ...prev,
            [synthesized.id]: { ...synthesized.defaultRubric },
          }));
          setSelectedSpan(
            synthesized.candidateA.spans.find((s) => s.isAnnotation) ?? null
          );
          setCustomEvalSource('gemini-live');
          triggerNotification('Evaluated custom clinical vignette via Server Gemini API.');
          setIsEvaluatingCustom(false);
          return;
        }
      }
    } catch {
      // Fallback to deterministic clinical synthesizer when running statically (e.g. GitHub Pages)
    }

    const fallbackCase = synthesizeDeterministicCustomCase(payload);
    setCustomCase(fallbackCase);
    setRubricByCaseId((prev) => ({
      ...prev,
      [fallbackCase.id]: { ...fallbackCase.defaultRubric },
    }));
    setSelectedSpan(
      fallbackCase.candidateA.spans.find((s) => s.isAnnotation) ?? null
    );
    setCustomEvalSource('deterministic-engine');
    triggerNotification('Synthesized custom clinical audit via Deterministic Pharmacotherapy Engine.');
    setIsEvaluatingCustom(false);
  };

  const handleUpdateRubric = (updated: RubricScores) => {
    setRubricByCaseId((prev) => ({
      ...prev,
      [activeCase.id]: updated,
    }));
    // Keep staged record in sync if already present in batch
    const updatedRecord = buildRlhfJsonlRecord(activeCase, updated);
    setBatchRecords((prev) =>
      prev.some((r) => r.id === activeCase.id)
        ? prev.map((r) => (r.id === activeCase.id ? updatedRecord : r))
        : prev
    );
  };

  const handleResetRubric = () => {
    handleUpdateRubric({ ...activeCase.defaultRubric });
    triggerNotification(`Reset rubric scores for ${activeCase.code} to benchmark defaults.`);
  };

  const handleStageInBatch = () => {
    const newRecord = buildRlhfJsonlRecord(activeCase, activeRubric);
    setBatchRecords((prev) => {
      const exists = prev.some((r) => r.id === newRecord.id);
      if (exists) {
        return prev.map((r) => (r.id === newRecord.id ? newRecord : r));
      }
      return [...prev, newRecord];
    });
    triggerNotification(`Staged ${activeCase.code} in RLHF JSONL export queue.`);
  };

  const downloadJsonlFile = (records: RlhfJsonlRecord[], filename: string) => {
    const jsonlContent = serializeRecordsToJsonl(records);
    const blob = new Blob([jsonlContent], { type: 'application/x-jsonlines;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerNotification(`Exported ${records.length} DPO/RLHF record(s) to ${filename}`);
  };

  const handleExportCurrentCaseJsonl = () => {
    const currentRecord = buildRlhfJsonlRecord(activeCase, activeRubric);
    downloadJsonlFile(
      [currentRecord],
      `clinrlhf_${activeCase.code.toLowerCase()}_dpo.jsonl`
    );
  };

  const handleExportFullBatchJsonl = () => {
    const currentRecord = buildRlhfJsonlRecord(activeCase, activeRubric);
    const merged = batchRecords.some((r) => r.id === currentRecord.id)
      ? batchRecords.map((r) => (r.id === currentRecord.id ? currentRecord : r))
      : [...batchRecords, currentRecord];
    downloadJsonlFile(merged, 'clinrlhf_medical_alignment_dataset.jsonl');
  };

  const handleRemoveBatchRecord = (id: string) => {
    setBatchRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const isCurrentCaseInBatch = batchRecords.some((r) => r.id === activeCase.id);

  return (
    <div id="workbench-top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        onExportJsonl={handleExportFullBatchJsonl}
        batchCount={batchRecords.length}
      />

      {/* Clinical Auditor Attribution & Calibration Strip */}
      <div className="bg-slate-900 text-slate-100 border-b border-slate-800 px-6 py-3">
        <div className="max-w-[1380px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white font-display">
              Lead Clinical Auditor: Dr. Ibrahim Mohammed (MD | MDCN/R/107127)
            </span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-slate-300">
              Medical LLM Evaluation, Pharmacotherapeutic Contraindication Auditing &amp; DPO Alignment Workbench
            </span>
          </div>
          <div className="font-mono text-slate-300 tabular-nums whitespace-nowrap">
            <span>Protocol: 5-Gate Clinical CoT</span>
            <span aria-hidden="true" className="mx-2 text-slate-500">·</span>
            <span>Export Format: TRL / DPO .jsonl</span>
          </div>
        </div>
      </div>

      {/* Live Notification Banner */}
      {exportNotification && (
        <div
          role="status"
          aria-live="polite"
          className="bg-blue-900 text-white px-6 py-2 text-xs font-mono border-b border-blue-800"
        >
          <div className="max-w-[1380px] mx-auto flex items-center justify-between">
            <span>● {exportNotification}</span>
            <button
              type="button"
              onClick={() => setExportNotification(null)}
              className="underline hover:text-blue-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Workbench Canvas */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <CaseSelectorAndVignette
          cases={PRELOADED_CLINICAL_CASES}
          activeCaseId={activeCaseId}
          isCustomMode={isCustomMode}
          activeCase={activeCase}
          onSelectCase={handleSelectPreloadedCase}
          onSelectCustomMode={handleSelectCustomMode}
          onRunCustomEvaluation={handleRunCustomEvaluation}
          isEvaluatingCustom={isEvaluatingCustom}
          customEvalSource={customEvalSource}
        />

        <ModelComparisonView
          activeCase={activeCase}
          showHighlights={showHighlights}
          onToggleHighlights={() => setShowHighlights((prev) => !prev)}
          selectedSpan={selectedSpan}
          onSelectSpan={(span) => setSelectedSpan(span)}
        />

        <RubricScorerPanel
          activeCase={activeCase}
          rubric={activeRubric}
          batchRecords={batchRecords}
          onChangeRubric={handleUpdateRubric}
          onResetRubric={handleResetRubric}
          onAddToBatch={handleStageInBatch}
          onExportCurrentCaseJsonl={handleExportCurrentCaseJsonl}
          isCurrentCaseInBatch={isCurrentCaseInBatch}
        />

        <GoldenReferenceInspector
          activeCase={activeCase}
          rubric={activeRubric}
          batchRecords={batchRecords}
          onExportCurrentCaseJsonl={handleExportCurrentCaseJsonl}
          onExportFullBatchJsonl={handleExportFullBatchJsonl}
          onRemoveBatchRecord={handleRemoveBatchRecord}
        />
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-5 mt-8">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-900">
              ClinRLHF Workbench: Medical LLM Evaluation &amp; Hallucination Auditor
            </span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>Authored by Dr. Ibrahim Mohammed (MD | MDCN/R/107127)</span>
          </div>
          <div className="font-mono text-slate-500">
            Zero-Hallucination Clinical Alignment &amp; Direct Preference Optimization Dataset Curation
          </div>
        </div>
      </footer>
    </div>
  );
}
