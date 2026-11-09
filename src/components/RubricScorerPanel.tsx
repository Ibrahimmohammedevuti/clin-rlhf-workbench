import React, { useState } from 'react';
import { PlusCircle, RotateCcw, Download } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  calculateCompositeClinicalScore,
  computeBatchRubricDistribution,
  resolveChosenAndRejected,
  type ClinicalCase,
  type HallucinationSeverity,
  type PreferenceRanking,
  type RlhfJsonlRecord,
  type RubricScores,
} from '../utils/rlhfLogic';

interface RubricScorerPanelProps {
  activeCase: ClinicalCase;
  rubric: RubricScores;
  batchRecords: RlhfJsonlRecord[];
  onChangeRubric: (updated: RubricScores) => void;
  onResetRubric: () => void;
  onAddToBatch: () => void;
  onExportCurrentCaseJsonl: () => void;
  isCurrentCaseInBatch: boolean;
}

const SEVERITY_OPTIONS: HallucinationSeverity[] = ['None', 'Minor', 'Critical Harm'];
const PREFERENCE_OPTIONS: PreferenceRanking[] = ['A >> B', 'A > B', 'Tie', 'B > A'];

export const RubricScorerPanel: React.FC<RubricScorerPanelProps> = ({
  activeCase,
  rubric,
  batchRecords,
  onChangeRubric,
  onResetRubric,
  onAddToBatch,
  onExportCurrentCaseJsonl,
  isCurrentCaseInBatch,
}) => {
  const [chartMode, setChartMode] = useState<'by-case' | 'by-axis'>('by-case');

  const scoreMetrics = calculateCompositeClinicalScore(rubric);
  const resolvedPair = resolveChosenAndRejected(activeCase, rubric);
  const batchDistribution = computeBatchRubricDistribution(
    batchRecords,
    { id: activeCase.id, code: activeCase.code },
    rubric
  );

  return (
    <section id="rubric-scorer" className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-display">
            03. Multi-Axis Clinical Rubric Scorer &amp; DPO Alignment Calibration
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Calibrate multi-axis clinical alignment scores for the chosen trajectory and inspect batch-wide distribution skew across staged records.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onResetRubric}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset to Benchmark Defaults</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Sliders & Toggles */}
        <div className="lg:col-span-7 space-y-5">
          {/* 3 Quantitative Sliders (1-5) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Slider 1: Diagnostic Sensitivity */}
            <div className="border border-slate-200 rounded-md p-4 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="slider-diag-sensitivity"
                  className="text-xs font-semibold text-slate-800"
                >
                  Diagnostic Sensitivity
                </label>
                <span className="text-sm font-mono font-bold text-blue-700 tabular-nums">
                  {rubric.diagnosticSensitivity} / 5
                </span>
              </div>
              <input
                id="slider-diag-sensitivity"
                type="range"
                min={1}
                max={5}
                step={1}
                value={rubric.diagnosticSensitivity}
                onChange={(e) =>
                  onChangeRubric({
                    ...rubric,
                    diagnosticSensitivity: Number(e.target.value),
                  })
                }
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>1 (Missed)</span>
                <span>3 (Partial)</span>
                <span>5 (Exact)</span>
              </div>
            </div>

            {/* Slider 2: Pharmacotherapeutic Safety */}
            <div className="border border-slate-200 rounded-md p-4 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="slider-pharm-safety"
                  className="text-xs font-semibold text-slate-800"
                >
                  Pharmacotherapy Safety
                </label>
                <span className="text-sm font-mono font-bold text-blue-700 tabular-nums">
                  {rubric.pharmacotherapeuticSafety} / 5
                </span>
              </div>
              <input
                id="slider-pharm-safety"
                type="range"
                min={1}
                max={5}
                step={1}
                value={rubric.pharmacotherapeuticSafety}
                onChange={(e) =>
                  onChangeRubric({
                    ...rubric,
                    pharmacotherapeuticSafety: Number(e.target.value),
                  })
                }
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>1 (Lethal)</span>
                <span>3 (Caution)</span>
                <span>5 (Safe)</span>
              </div>
            </div>

            {/* Slider 3: Guideline Adherence */}
            <div className="border border-slate-200 rounded-md p-4 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="slider-guideline-adherence"
                  className="text-xs font-semibold text-slate-800"
                >
                  Guideline Adherence
                </label>
                <span className="text-sm font-mono font-bold text-blue-700 tabular-nums">
                  {rubric.guidelineAdherence} / 5
                </span>
              </div>
              <input
                id="slider-guideline-adherence"
                type="range"
                min={1}
                max={5}
                step={1}
                value={rubric.guidelineAdherence}
                onChange={(e) =>
                  onChangeRubric({
                    ...rubric,
                    guidelineAdherence: Number(e.target.value),
                  })
                }
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>1 (Violated)</span>
                <span>3 (Partial)</span>
                <span>5 (Concordant)</span>
              </div>
            </div>
          </div>

          {/* Segmented Toggles for Hallucination Severity & Preference Ranking */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hallucination Severity */}
            <div className="border border-slate-200 rounded-md p-4 space-y-2.5">
              <div className="text-xs font-semibold text-slate-800">
                Rejected Trajectory Hallucination Severity
              </div>
              <div
                role="radiogroup"
                aria-label="Hallucination Severity"
                className="grid grid-cols-3 gap-1.5"
              >
                {SEVERITY_OPTIONS.map((sev) => {
                  const isActive = rubric.hallucinationSeverity === sev;
                  const activeStyle =
                    sev === 'Critical Harm'
                      ? 'bg-red-700 text-white border-red-700'
                      : sev === 'Minor'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-emerald-700 text-white border-emerald-700';
                  return (
                    <button
                      key={sev}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() =>
                        onChangeRubric({
                          ...rubric,
                          hallucinationSeverity: sev,
                        })
                      }
                      className={`px-2.5 py-2 text-xs font-semibold rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? activeStyle
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sev}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pairwise Preference Ranking */}
            <div className="border border-slate-200 rounded-md p-4 space-y-2.5">
              <div className="text-xs font-semibold text-slate-800">
                Pairwise Preference Ranking (DPO Margin)
              </div>
              <div
                role="radiogroup"
                aria-label="Preference Ranking"
                className="grid grid-cols-4 gap-1.5"
              >
                {PREFERENCE_OPTIONS.map((pref) => {
                  const isActive = rubric.preferenceRanking === pref;
                  return (
                    <button
                      key={pref}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() =>
                        onChangeRubric({
                          ...rubric,
                          preferenceRanking: pref,
                        })
                      }
                      className={`px-2.5 py-2 text-xs font-mono font-semibold rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pref}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Auditor Clinical Critique Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="auditor-critique-input"
                className="text-xs font-semibold text-slate-800"
              >
                Physician Auditor Clinical Critique (Exported in JSONL `critique` field)
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rubric.useGoldenAsChosen}
                  onChange={(e) =>
                    onChangeRubric({
                      ...rubric,
                      useGoldenAsChosen: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>Use Dr. Mohammed&apos;s Golden Rewrite as `chosen` target</span>
              </label>
            </div>
            <textarea
              id="auditor-critique-input"
              rows={3}
              value={rubric.auditorCritique}
              onChange={(e) =>
                onChangeRubric({
                  ...rubric,
                  auditorCritique: e.target.value,
                })
              }
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed text-slate-800"
            />
          </div>
        </div>

        {/* Right 5 Cols: Calibrated Telemetry Readout, Recharts Batch Distribution & Export Controls */}
        <div className="lg:col-span-5 border border-slate-200 rounded-lg p-5 bg-slate-50/60 space-y-4">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200">
            <div>
              <div className="text-xs text-slate-500">
                Composite Alignment Score (Weighted Safety Index)
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-slate-900 tabular-nums">
                  {scoreMetrics.compositeScore}
                </span>
                <span className="text-xs font-mono text-slate-500">/ 100 PTS</span>
              </div>
            </div>

            <div className="text-right font-mono text-xs space-y-1">
              <div
                className={
                  scoreMetrics.safetyGateStatus === 'HARD_VETO_CRITICAL_HARM'
                    ? 'text-red-700 font-semibold'
                    : scoreMetrics.safetyGateStatus === 'WARN'
                    ? 'text-amber-700 font-semibold'
                    : 'text-emerald-700 font-semibold'
                }
              >
                {scoreMetrics.safetyGateStatus === 'HARD_VETO_CRITICAL_HARM'
                  ? '✖ HARD VETO: CRITICAL HARM'
                  : scoreMetrics.safetyGateStatus === 'WARN'
                  ? '▲ WARNING: MINOR DRIFT'
                  : '● NOMINAL: ZERO HALLUCINATION'}
              </div>
              <div className="text-slate-500 tabular-nums">
                Mean Rubric: {scoreMetrics.rawAverage.toFixed(2)} / 5.00 · DPO β: {scoreMetrics.dpoBetaWeight}
              </div>
            </div>
          </div>

          {/* Batch Clinical Score Distribution Chart (Recharts) */}
          <div
            data-testid="batch-rubric-chart-container"
            className="bg-white border border-slate-200 rounded-md p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 font-display">
                  Batch Clinical Score Distribution ({batchDistribution.caseSeries.length} Records)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Sensitivity, Pharmacotherapy Safety &amp; Guideline Adherence across staged batch
                </p>
              </div>

              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setChartMode('by-case')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    chartMode === 'by-case'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  By Case
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('by-axis')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    chartMode === 'by-axis'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Axis Means
                </button>
              </div>
            </div>

            {/* Batch Axis Mean Telemetry Strip */}
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              {batchDistribution.axisSummaries.map((ax) => (
                <div
                  key={ax.axis}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                >
                  <div className="text-[11px] text-slate-500 truncate">{ax.shortLabel}</div>
                  <div className="font-mono font-bold text-slate-900 tabular-nums mt-0.5">
                    {ax.meanScore.toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-slate-500">
                      (min {ax.minScore})
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recharts BarChart */}
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'by-case' ? (
                  <BarChart
                    data={batchDistribution.caseSeries}
                    margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="caseCode"
                      tick={{ fontSize: 10, fill: '#475569', fontFamily: 'IBM Plex Mono' }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      domain={[0, 5]}
                      ticks={[0, 1, 2, 3, 4, 5]}
                      tick={{ fontSize: 10, fill: '#475569', fontFamily: 'IBM Plex Mono' }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: '11px',
                        fontFamily: 'IBM Plex Mono',
                        borderRadius: '6px',
                        borderColor: '#cbd5e1',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                      iconType="square"
                      iconSize={8}
                    />
                    <ReferenceLine y={3} stroke="#d97706" strokeDasharray="3 3" />
                    <Bar
                      dataKey="diagnosticSensitivity"
                      name="Sensitivity"
                      fill="#1d4ed8"
                      radius={[2, 2, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="pharmacotherapeuticSafety"
                      name="Pharm Safety"
                      fill="#0f766e"
                      radius={[2, 2, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="guidelineAdherence"
                      name="Adherence"
                      fill="#4338ca"
                      radius={[2, 2, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                ) : (
                  <BarChart
                    data={batchDistribution.axisSummaries}
                    margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fontSize: 10, fill: '#475569', fontFamily: 'IBM Plex Mono' }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      domain={[0, 5]}
                      ticks={[0, 1, 2, 3, 4, 5]}
                      tick={{ fontSize: 10, fill: '#475569', fontFamily: 'IBM Plex Mono' }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: '11px',
                        fontFamily: 'IBM Plex Mono',
                        borderRadius: '6px',
                        borderColor: '#cbd5e1',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                      iconType="square"
                      iconSize={8}
                    />
                    <ReferenceLine y={3} stroke="#d97706" strokeDasharray="3 3" />
                    <Bar
                      dataKey="meanScore"
                      name="Batch Mean (/5)"
                      fill="#1d4ed8"
                      radius={[2, 2, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="minScore"
                      name="Batch Minimum (/5)"
                      fill="#dc2626"
                      radius={[2, 2, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Clinical Failure Point Skew Diagnosis */}
            <div className="pt-2.5 border-t border-slate-200 space-y-1 text-[11px] font-mono">
              <div
                className={
                  batchDistribution.skewStatus === 'BALANCED_HIGH'
                    ? 'text-emerald-700 font-semibold whitespace-nowrap'
                    : batchDistribution.skewStatus === 'SKEWED_FAILURE_POINT'
                    ? 'text-amber-700 font-semibold whitespace-nowrap'
                    : 'text-red-700 font-semibold whitespace-nowrap'
                }
              >
                {batchDistribution.skewStatus === 'BALANCED_HIGH'
                  ? '● Skew Check: Balanced Across Axes'
                  : batchDistribution.skewStatus === 'SKEWED_FAILURE_POINT'
                  ? `▲ Skew Alert: ${batchDistribution.weakestAxis}`
                  : '✖ Skew Alert: Multi-Axis Drop'}
              </div>
              <p className="text-slate-600 leading-snug">
                {batchDistribution.skewDiagnosis}
              </p>
            </div>
          </div>

          {/* Resolved DPO Pair Summary */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-200">
              <span className="text-slate-600">DPO `chosen` Trajectory:</span>
              <span className="font-semibold text-emerald-800 font-mono truncate max-w-[230px]">
                {resolvedPair.chosenSource}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-600">DPO `rejected` Trajectory:</span>
              <span className="font-semibold text-red-800 font-mono truncate max-w-[230px]">
                {resolvedPair.rejectedSource}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onAddToBatch}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isCurrentCaseInBatch ? 'Update in Audit Batch' : 'Stage in Audit Batch'}</span>
            </button>

            <button
              type="button"
              onClick={onExportCurrentCaseJsonl}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download Case .jsonl</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

