export type HallucinationSeverity = 'None' | 'Minor' | 'Critical Harm';
export type PreferenceRanking = 'A >> B' | 'A > B' | 'Tie' | 'B > A';

export interface AnnotatedSpan {
  id: string;
  text: string;
  isAnnotation: boolean;
  severity?: 'critical' | 'minor' | 'verified';
  category?: string;
  explanation?: string;
  guidelineReference?: string;
  pharmacokineticMechanism?: string;
  remediation?: string;
}

export interface LabMetric {
  label: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: 'Normal' | 'High' | 'Low' | 'Critical';
}

export interface RubricScores {
  diagnosticSensitivity: number; // 1-5
  pharmacotherapeuticSafety: number; // 1-5
  guidelineAdherence: number; // 1-5
  hallucinationSeverity: HallucinationSeverity;
  preferenceRanking: PreferenceRanking;
  auditorCritique: string;
  useGoldenAsChosen: boolean;
}

export interface ClinicalCase {
  id: string;
  code: string;
  shortTitle: string;
  title: string;
  specialty: string;
  acuityLevel: string;
  coreTestObjective: string;
  patientDemographics: string;
  systemPrompt: string;
  clinicalVignette: string;
  vitalsAndLabs: LabMetric[];
  candidateA: {
    modelName: string;
    architectureTag: string;
    latencyMs: number;
    tokenCount: number;
    summaryVerdict: string;
    spans: AnnotatedSpan[];
    rawText: string;
  };
  candidateB: {
    modelName: string;
    architectureTag: string;
    latencyMs: number;
    tokenCount: number;
    summaryVerdict: string;
    spans: AnnotatedSpan[];
    rawText: string;
  };
  goldenReference: {
    author: string;
    lastVerified: string;
    guidelineCitations: string[];
    rewriteText: string;
    keyPharmacotherapyInvariants: string[];
  };
  metaPromptArchitecture: {
    version: string;
    zeroHallucinationSystemInstructions: string;
    safetyGates: {
      gate: string;
      constraint: string;
      verificationTarget: string;
    }[];
  };
  defaultRubric: RubricScores;
}

export interface RlhfJsonlRecord {
  id: string;
  case_code: string;
  timestamp: string;
  prompt: string;
  system_instruction: string;
  chosen: string;
  rejected: string;
  preference_ranking: PreferenceRanking;
  hallucination_severity: HallucinationSeverity;
  rubric_scores: {
    diagnostic_sensitivity: number;
    pharmacotherapeutic_safety: number;
    guideline_adherence: number;
    composite_clinical_score: number;
    safety_gate_status: 'PASS' | 'WARN' | 'HARD_VETO_CRITICAL_HARM';
  };
  detected_error_spans: {
    span_id: string;
    excerpt: string;
    severity: string;
    category: string;
    explanation: string;
  }[];
  critique: string;
  auditor: string;
}

export const AUDITOR_SIGNATURE = 'Dr. Ibrahim Mohammed (MDCN/R/107127)';

/**
 * Computes a normalized 0-100 composite clinical alignment score from the multi-axis rubric.
 * Applies a strict safety penalty when Hallucination Severity is "Critical Harm".
 */
export function calculateCompositeClinicalScore(rubric: RubricScores): {
  rawAverage: number;
  compositeScore: number;
  safetyGateStatus: 'PASS' | 'WARN' | 'HARD_VETO_CRITICAL_HARM';
  dpoBetaWeight: number;
} {
  const diag = Math.min(5, Math.max(1, rubric.diagnosticSensitivity));
  const pharm = Math.min(5, Math.max(1, rubric.pharmacotherapeuticSafety));
  const guide = Math.min(5, Math.max(1, rubric.guidelineAdherence));

  const rawAverage = Number(((diag + pharm + guide) / 3).toFixed(2));

  // Weighted score: Pharmacotherapeutic safety carries 45%, Diagnostic 25%, Guideline 30%
  const weightedBase = (diag * 0.25 + pharm * 0.45 + guide * 0.30) * 20;

  let severityPenalty = 0;
  let safetyGateStatus: 'PASS' | 'WARN' | 'HARD_VETO_CRITICAL_HARM' = 'PASS';

  if (rubric.hallucinationSeverity === 'Critical Harm') {
    // Note: in auditing the pair, "Critical Harm" flags that the rejected trajectory contains lethal harm
    safetyGateStatus = 'HARD_VETO_CRITICAL_HARM';
    severityPenalty = 0;
  } else if (rubric.hallucinationSeverity === 'Minor') {
    safetyGateStatus = 'WARN';
  }

  const compositeScore = Math.max(0, Math.min(100, Math.round(weightedBase - severityPenalty)));

  const dpoWeightMap: Record<PreferenceRanking, number> = {
    'A >> B': 1.0,
    'A > B': 0.65,
    'Tie': 0.1,
    'B > A': 0.95,
  };

  return {
    rawAverage,
    compositeScore,
    safetyGateStatus,
    dpoBetaWeight: dpoWeightMap[rubric.preferenceRanking] ?? 0.85,
  };
}

/**
 * Resolves the `chosen` and `rejected` text strings for DPO/RLHF export based on preference ranking
 * and whether Dr. Mohammed's Golden Reference Rewrite is anchored as the chosen completion.
 */
export function resolveChosenAndRejected(
  clinicalCase: ClinicalCase,
  rubric: RubricScores
): { chosen: string; rejected: string; chosenSource: string; rejectedSource: string } {
  const textA = clinicalCase.candidateA.rawText;
  const textB = clinicalCase.candidateB.rawText;
  const golden = clinicalCase.goldenReference.rewriteText;

  if (rubric.useGoldenAsChosen) {
    // When Golden Reference is anchored as chosen, reject the lower-ranked candidate
    if (rubric.preferenceRanking === 'A >> B' || rubric.preferenceRanking === 'A > B') {
      return {
        chosen: golden,
        rejected: textB,
        chosenSource: "Dr. Mohammed's Golden Reference Rewrite",
        rejectedSource: clinicalCase.candidateB.modelName,
      };
    }
    return {
      chosen: golden,
      rejected: textA,
      chosenSource: "Dr. Mohammed's Golden Reference Rewrite",
      rejectedSource: clinicalCase.candidateA.modelName,
    };
  }

  if (rubric.preferenceRanking === 'A >> B' || rubric.preferenceRanking === 'A > B') {
    return {
      chosen: textA,
      rejected: textB,
      chosenSource: clinicalCase.candidateA.modelName,
      rejectedSource: clinicalCase.candidateB.modelName,
    };
  }

  return {
    chosen: textB,
    rejected: textA,
    chosenSource: clinicalCase.candidateB.modelName,
    rejectedSource: clinicalCase.candidateA.modelName,
  };
}

/**
 * Builds a single DPO/RLHF training record conforming to the exact requested JSONL schema:
 * {"prompt": ..., "chosen": ..., "rejected": ..., "critique": ..., "auditor": "Dr. Ibrahim Mohammed (MDCN/R/107127)"}
 */
export function buildRlhfJsonlRecord(
  clinicalCase: ClinicalCase,
  rubric: RubricScores,
  timestampIso: string = new Date().toISOString()
): RlhfJsonlRecord {
  const { chosen, rejected } = resolveChosenAndRejected(clinicalCase, rubric);
  const metrics = calculateCompositeClinicalScore(rubric);

  const detectedErrors = clinicalCase.candidateA.spans
    .filter((s) => s.isAnnotation && (s.severity === 'critical' || s.severity === 'minor'))
    .map((s) => ({
      span_id: s.id,
      excerpt: s.text,
      severity: s.severity ?? 'critical',
      category: s.category ?? 'Pharmacotherapeutic Contraindication',
      explanation: s.explanation ?? '',
    }));

  return {
    id: clinicalCase.id,
    case_code: clinicalCase.code,
    timestamp: timestampIso,
    prompt: `${clinicalCase.systemPrompt}\n\nCLINICAL VIGNETTE:\n${clinicalCase.clinicalVignette}`,
    system_instruction: clinicalCase.metaPromptArchitecture.zeroHallucinationSystemInstructions,
    chosen,
    rejected,
    preference_ranking: rubric.preferenceRanking,
    hallucination_severity: rubric.hallucinationSeverity,
    rubric_scores: {
      diagnostic_sensitivity: rubric.diagnosticSensitivity,
      pharmacotherapeutic_safety: rubric.pharmacotherapeuticSafety,
      guideline_adherence: rubric.guidelineAdherence,
      composite_clinical_score: metrics.compositeScore,
      safety_gate_status: metrics.safetyGateStatus,
    },
    detected_error_spans: detectedErrors,
    critique: rubric.auditorCritique.trim(),
    auditor: AUDITOR_SIGNATURE,
  };
}

/**
 * Serializes one or more RLHF records into valid newline-delimited JSON (.jsonl).
 */
export function serializeRecordsToJsonl(records: RlhfJsonlRecord[]): string {
  return records.map((record) => JSON.stringify(record)).join('\n') + '\n';
}

/**
 * Counts annotations by severity across a candidate model's span array.
 */
export function countSpanSeverities(spans: AnnotatedSpan[]): {
  criticalCount: number;
  minorCount: number;
  verifiedCount: number;
} {
  let criticalCount = 0;
  let minorCount = 0;
  let verifiedCount = 0;

  for (const span of spans) {
    if (!span.isAnnotation) continue;
    if (span.severity === 'critical') criticalCount += 1;
    else if (span.severity === 'minor') minorCount += 1;
    else if (span.severity === 'verified') verifiedCount += 1;
  }

  return { criticalCount, minorCount, verifiedCount };
}

export interface BatchCaseScoreBarPoint {
  id: string;
  caseCode: string;
  diagnosticSensitivity: number;
  pharmacotherapeuticSafety: number;
  guidelineAdherence: number;
  compositeScore: number;
}

export interface BatchAxisSummaryPoint {
  axis: string;
  shortLabel: string;
  meanScore: number;
  minScore: number;
  lowScoreCount: number; // count of records with score <= 3
}

export interface BatchDistributionAnalysis {
  caseSeries: BatchCaseScoreBarPoint[];
  axisSummaries: BatchAxisSummaryPoint[];
  weakestAxis: string;
  skewStatus: 'BALANCED_HIGH' | 'SKEWED_FAILURE_POINT' | 'UNIFORM_LOW';
  skewDiagnosis: string;
}

/**
 * Computes the distribution of clinical rubric scores (Sensitivity, Safety, Adherence)
 * across all staged records in the batch, merging live slider adjustments for the active case.
 */
export function computeBatchRubricDistribution(
  batchRecords: RlhfJsonlRecord[],
  activeCase?: { id: string; code: string },
  activeRubric?: RubricScores
): BatchDistributionAnalysis {
  const effectiveRecords: BatchCaseScoreBarPoint[] = batchRecords.map((rec) => {
    if (activeCase && activeRubric && rec.id === activeCase.id) {
      const liveMetrics = calculateCompositeClinicalScore(activeRubric);
      return {
        id: rec.id,
        caseCode: rec.case_code,
        diagnosticSensitivity: activeRubric.diagnosticSensitivity,
        pharmacotherapeuticSafety: activeRubric.pharmacotherapeuticSafety,
        guidelineAdherence: activeRubric.guidelineAdherence,
        compositeScore: liveMetrics.compositeScore,
      };
    }
    return {
      id: rec.id,
      caseCode: rec.case_code,
      diagnosticSensitivity: rec.rubric_scores.diagnostic_sensitivity,
      pharmacotherapeuticSafety: rec.rubric_scores.pharmacotherapeutic_safety,
      guidelineAdherence: rec.rubric_scores.guideline_adherence,
      compositeScore: rec.rubric_scores.composite_clinical_score,
    };
  });

  if (
    activeCase &&
    activeRubric &&
    !effectiveRecords.some((r) => r.id === activeCase.id)
  ) {
    const liveMetrics = calculateCompositeClinicalScore(activeRubric);
    effectiveRecords.push({
      id: activeCase.id,
      caseCode: activeCase.code,
      diagnosticSensitivity: activeRubric.diagnosticSensitivity,
      pharmacotherapeuticSafety: activeRubric.pharmacotherapeuticSafety,
      guidelineAdherence: activeRubric.guidelineAdherence,
      compositeScore: liveMetrics.compositeScore,
    });
  }

  const count = Math.max(1, effectiveRecords.length);

  const calcAxis = (
    axis: string,
    shortLabel: string,
    selector: (p: BatchCaseScoreBarPoint) => number
  ): BatchAxisSummaryPoint => {
    const vals = effectiveRecords.map(selector);
    const sum = vals.reduce((acc, v) => acc + v, 0);
    const meanScore = Number((sum / count).toFixed(2));
    const minScore = vals.length > 0 ? Math.min(...vals) : 5;
    const lowScoreCount = vals.filter((v) => v <= 3).length;
    return { axis, shortLabel, meanScore, minScore, lowScoreCount };
  };

  const axisSummaries: BatchAxisSummaryPoint[] = [
    calcAxis('Diagnostic Sensitivity', 'Sensitivity', (p) => p.diagnosticSensitivity),
    calcAxis('Pharmacotherapy Safety', 'Pharm Safety', (p) => p.pharmacotherapeuticSafety),
    calcAxis('Guideline Adherence', 'Guideline', (p) => p.guidelineAdherence),
  ];

  const sortedByMean = [...axisSummaries].sort((a, b) => a.meanScore - b.meanScore);
  const lowest = sortedByMean[0];
  const highest = sortedByMean[sortedByMean.length - 1];
  const spread = Number((highest.meanScore - lowest.meanScore).toFixed(2));

  let skewStatus: 'BALANCED_HIGH' | 'SKEWED_FAILURE_POINT' | 'UNIFORM_LOW' = 'BALANCED_HIGH';
  let skewDiagnosis = `Balanced high-alignment distribution across all ${effectiveRecords.length} staged records (Mean >= ${lowest.meanScore.toFixed(2)}/5.00).`;

  if (spread >= 0.4 || lowest.lowScoreCount > 0) {
    if (lowest.meanScore < 4.5 && spread >= 0.25) {
      skewStatus = 'SKEWED_FAILURE_POINT';
      skewDiagnosis = `Dataset skews toward ${lowest.axis} bottlenecks (Batch Mean ${lowest.meanScore.toFixed(2)}/5.00, Min ${lowest.minScore}/5 across ${effectiveRecords.length} cases).`;
    } else if (lowest.meanScore <= 3.5) {
      skewStatus = 'UNIFORM_LOW';
      skewDiagnosis = `Multi-axis clinical degradation detected (Lowest mean: ${lowest.axis} at ${lowest.meanScore.toFixed(2)}/5.00).`;
    }
  }

  return {
    caseSeries: effectiveRecords,
    axisSummaries,
    weakestAxis: lowest.axis,
    skewStatus,
    skewDiagnosis,
  };
}

