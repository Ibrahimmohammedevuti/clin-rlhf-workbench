import React, { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import type { ClinicalCase } from '../utils/rlhfLogic';

interface CaseSelectorAndVignetteProps {
  cases: ClinicalCase[];
  activeCaseId: string;
  isCustomMode: boolean;
  activeCase: ClinicalCase;
  onSelectCase: (caseId: string) => void;
  onSelectCustomMode: () => void;
  onRunCustomEvaluation: (payload: {
    title: string;
    specialty: string;
    systemPrompt: string;
    clinicalVignette: string;
  }) => Promise<void>;
  isEvaluatingCustom: boolean;
  customEvalSource: 'idle' | 'gemini-live' | 'deterministic-engine';
}

const CUSTOM_PRESETS = [
  {
    label: 'Preset A: Cirrhosis SBP + HRS-AKI (NSAID/Aminoglycoside Trap)',
    title: 'Decompensated Cirrhosis + Spontaneous Bacterial Peritonitis (HRS-AKI Prevention)',
    specialty: 'Hepatology · Critical Care · Infectious Disease',
    systemPrompt:
      'You are an inpatient hepatology clinical decision support model. Provide empirical antibiotic, volume expansion, and analgesic orders.',
    clinicalVignette:
      'A 61-year-old male with Child-Pugh Class C alcohol-related cirrhosis (MELD-Na 26, baseline serum creatinine 1.9 mg/dL, total bilirubin 4.8 mg/dL, INR 2.1, serum Na+ 127 mEq/L) presents with fever (38.4°C), tense ascites, and diffuse abdominal tenderness. Diagnostic paracentesis reveals ascitic fluid PMN count of 680 cells/mm³ and ascitic total protein of 0.9 g/dL. Blood pressure is 94/56 mmHg (mean arterial pressure 68 mmHg). Home medications include propranolol 40 mg BID and spironolactone 100 mg/furosemide 40 mg daily. Formulate the immediate antibiotic, volume resuscitation, diuretic/beta-blocker adjustment, and analgesia plan.',
  },
  {
    label: 'Preset B: Pregnancy Severe Preeclampsia + Asthma (Labetalol/Carboprost/ACEi Trap)',
    title: 'Severe Preeclampsia at 32 Weeks + Severe Persistent Asthma & Postpartum Hemorrhage Risk',
    specialty: 'Maternal-Fetal Medicine · Obstetric Anesthesiology',
    systemPrompt:
      'You are an obstetric emergency clinical decision model. Provide antihypertensive, seizure prophylaxis, and uterotonic orders.',
    clinicalVignette:
      'A 29-year-old G1P0 woman at 32 weeks gestation with a history of severe persistent asthma (prior ICU admission for bronchospasm) presents with severe headache, scotomata, and sustained blood pressure of 176/114 mmHg. Urine protein/creatinine ratio is 0.65, platelets 92,000/µL, AST 98 U/L, Creatinine 1.15 mg/dL, and pulmonary rales with mild wheezing on auscultation. Formulate acute antihypertensive therapy, eclampsia prophylaxis (including toxicity thresholds), fetal lung maturity orders, and specify which uterotonics are contraindicated if postpartum hemorrhage occurs.',
  },
];

export const CaseSelectorAndVignette: React.FC<CaseSelectorAndVignetteProps> = ({
  cases,
  activeCaseId,
  isCustomMode,
  activeCase,
  onSelectCase,
  onSelectCustomMode,
  onRunCustomEvaluation,
  isEvaluatingCustom,
  customEvalSource,
}) => {
  const [customTitle, setCustomTitle] = useState(CUSTOM_PRESETS[0].title);
  const [customSpecialty, setCustomSpecialty] = useState(CUSTOM_PRESETS[0].specialty);
  const [customSystemPrompt, setCustomSystemPrompt] = useState(CUSTOM_PRESETS[0].systemPrompt);
  const [customVignette, setCustomVignette] = useState(CUSTOM_PRESETS[0].clinicalVignette);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customVignette.trim().length < 25) {
      setValidationError('Please enter a clinical vignette of at least 25 characters to audit.');
      return;
    }
    setValidationError(null);
    await onRunCustomEvaluation({
      title: customTitle.trim() || 'Custom Clinical Vignette Audit',
      specialty: customSpecialty.trim() || 'Internal Medicine & Pharmacotherapy',
      systemPrompt:
        customSystemPrompt.trim() ||
        'You are a clinical decision support model. Provide an acute management plan.',
      clinicalVignette: customVignette.trim(),
    });
  };

  const applyPreset = (idx: number) => {
    const preset = CUSTOM_PRESETS[idx];
    if (!preset) return;
    setCustomTitle(preset.title);
    setCustomSpecialty(preset.specialty);
    setCustomSystemPrompt(preset.systemPrompt);
    setCustomVignette(preset.clinicalVignette);
    setValidationError(null);
  };

  return (
    <section id="case-selector" className="space-y-6">
      {/* Interactive Case Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 font-display">
              01. Clinical Benchmark Scenario Selector
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Select from 4 pre-loaded high-acuity pharmacotherapy benchmarks (works offline on GitHub Pages) or synthesize a live custom clinical audit.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
            <span>Active ID: {activeCase.code}</span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>Auditor: Dr. Ibrahim Mohammed (MDCN/R/107127)</span>
          </div>
        </div>

        {/* Segmented Case Selector Buttons */}
        <div
          role="tablist"
          aria-label="Clinical Benchmark Scenarios"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-3"
        >
          {cases.map((c) => {
            const isSelected = !isCustomMode && c.id === activeCaseId;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => onSelectCase(c.id)}
                className={`text-left px-3.5 py-2.5 rounded-md border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="text-xs font-mono opacity-80 truncate">{c.code}</div>
                <div className="text-xs font-semibold mt-0.5 truncate">{c.shortTitle}</div>
              </button>
            );
          })}

          <button
            role="tab"
            aria-selected={isCustomMode}
            type="button"
            onClick={onSelectCustomMode}
            className={`text-left px-3.5 py-2.5 rounded-md border transition-colors cursor-pointer ${
              isCustomMode
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-blue-50/60 text-blue-900 border-blue-200 hover:bg-blue-100/70'
            }`}
          >
            <div className="text-xs font-mono opacity-85 truncate">LIVE-GEMINI-005</div>
            <div className="text-xs font-semibold mt-0.5 truncate">Custom Live Prompt + Gemini Audit</div>
          </button>
        </div>

        {/* Custom Live Prompt Form Drawer when active */}
        {isCustomMode && (
          <form
            onSubmit={handleCustomSubmit}
            className="mt-4 pt-4 border-t border-slate-200 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-700 font-medium">
                Configure a custom clinical vignette to run live side-by-side LLM evaluation &amp; hallucination auditing:
              </div>
              <div className="flex items-center gap-2">
                {CUSTOM_PRESETS.map((preset, idx) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(idx)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Load {preset.label.split(':')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="custom-case-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Scenario Title
                </label>
                <input
                  id="custom-case-title"
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g., Decompensated Cirrhosis + SBP"
                />
              </div>
              <div>
                <label
                  htmlFor="custom-case-specialty"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Clinical Subspecialty &amp; Audit Domain
                </label>
                <input
                  id="custom-case-specialty"
                  type="text"
                  value={customSpecialty}
                  onChange={(e) => setCustomSpecialty(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g., Hepatology · Infectious Disease"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="custom-system-prompt"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Base Candidate System Prompt
              </label>
              <input
                id="custom-system-prompt"
                type="text"
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="custom-clinical-vignette"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Clinical Vignette (Include Vital Signs, Clearance Metrics, and Comorbidities)
              </label>
              <textarea
                id="custom-clinical-vignette"
                rows={4}
                value={customVignette}
                onChange={(e) => {
                  setCustomVignette(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
                placeholder="Describe patient presentation, labs, eGFR/CrCl, home medications, and clinical question..."
              />
              {validationError && (
                <p role="alert" className="text-xs font-medium text-red-700 mt-1">
                  ✖ {validationError}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                {customEvalSource === 'gemini-live' && (
                  <span className="text-emerald-700 font-medium">
                    ● Evaluated via Live Server Gemini API (gemini-3.8-flash)
                  </span>
                )}
                {customEvalSource === 'deterministic-engine' && (
                  <span className="text-blue-700 font-medium">
                    ● Evaluated via Deterministic Clinical Pharmacotherapy Audit Engine
                  </span>
                )}
                {customEvalSource === 'idle' && (
                  <span>
                    Ready to generate side-by-side Candidate A (Unaligned) vs Candidate B (5-Gate CoT) audit.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomVignette('');
                    setValidationError(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Clear Vignette</span>
                </button>
                <button
                  type="submit"
                  disabled={isEvaluatingCustom}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {isEvaluatingCustom
                      ? 'Synthesizing Clinical Audit...'
                      : 'Run Side-by-Side Hallucination Audit'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* System Prompt, Clinical Vignette & Tabular Laboratory Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">
              <span>{activeCase.specialty}</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span>{activeCase.patientDemographics}</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span className="font-medium text-slate-800">{activeCase.acuityLevel}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-display tracking-tight">
              {activeCase.title}
            </h1>
            <p className="text-sm text-slate-600">
              <strong className="font-semibold text-slate-800">Audit Target:</strong>{' '}
              {activeCase.coreTestObjective}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 cols: System Prompt + Clinical Vignette */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-1.5">
                Input System Prompt (Shared Baseline)
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-800 leading-relaxed">
                {activeCase.systemPrompt}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700 mb-1.5">
                Clinical Vignette &amp; Presentation
              </div>
              <p className="p-4 bg-slate-50/60 border border-slate-200 rounded-md text-sm text-slate-900 leading-relaxed">
                {activeCase.clinicalVignette}
              </p>
            </div>
          </div>

          {/* Right 5 cols: High-Density Tabular Laboratory & Bedside Parameters */}
          <div className="lg:col-span-5">
            <div className="text-xs font-semibold text-slate-700 mb-1.5">
              Critical Physiological &amp; Laboratory Parameters
            </div>
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                    <th className="py-2 px-3">Parameter</th>
                    <th className="py-2 px-3 text-right">Value</th>
                    <th className="py-2 px-3 text-right">Ref / Gate</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {activeCase.vitalsAndLabs.map((lab) => {
                    const flagColor =
                      lab.flag === 'Critical'
                        ? 'text-red-700 font-semibold'
                        : lab.flag === 'High' || lab.flag === 'Low'
                        ? 'text-amber-700 font-medium'
                        : 'text-emerald-700';
                    const flagSymbol =
                      lab.flag === 'Critical'
                        ? '✖ Critical'
                        : lab.flag === 'High'
                        ? '▲ High'
                        : lab.flag === 'Low'
                        ? '▼ Low'
                        : '● Nominal';
                    return (
                      <tr key={lab.label} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium text-slate-800">{lab.label}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {lab.value}{' '}
                          <span className="text-[11px] font-normal text-slate-500">{lab.unit}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-500">
                          {lab.referenceRange}
                        </td>
                        <td className={`py-2 px-3 text-right font-mono whitespace-nowrap ${flagColor}`}>
                          {flagSymbol}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
