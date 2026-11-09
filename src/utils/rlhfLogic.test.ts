import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDITOR_SIGNATURE,
  buildRlhfJsonlRecord,
  calculateCompositeClinicalScore,
  computeBatchRubricDistribution,
  countSpanSeverities,
  resolveChosenAndRejected,
  serializeRecordsToJsonl,
  type RubricScores,
} from './rlhfLogic';
import { PRELOADED_CLINICAL_CASES } from '../data/clinicalCases';

test('preloaded clinical cases include all 4 required clinical scenarios with annotations', () => {
  assert.equal(PRELOADED_CLINICAL_CASES.length, 4);
  const codes = PRELOADED_CLINICAL_CASES.map((c) => c.code);
  assert.deepEqual(codes, [
    'CKD4-GOUT-001',
    'MG-CAP-002',
    'AFIB-GIB-003',
    'PEDS-DKA-004',
  ]);

  for (const c of PRELOADED_CLINICAL_CASES) {
    const countsA = countSpanSeverities(c.candidateA.spans);
    const countsB = countSpanSeverities(c.candidateB.spans);
    assert.ok(
      countsA.criticalCount >= 2,
      `Expected Candidate A in ${c.code} to have at least 2 critical hallucination spans`
    );
    assert.ok(
      countsB.verifiedCount >= 2,
      `Expected Candidate B in ${c.code} to have at least 2 verified reasoning spans`
    );
  }
});

test('calculateCompositeClinicalScore computes weighted alignment score and safety gate status', () => {
  const rubric: RubricScores = {
    diagnosticSensitivity: 5,
    pharmacotherapeuticSafety: 5,
    guidelineAdherence: 5,
    hallucinationSeverity: 'Critical Harm',
    preferenceRanking: 'B > A',
    auditorCritique: 'Candidate A prescribed indomethacin in Stage 4 CKD.',
    useGoldenAsChosen: true,
  };

  const result = calculateCompositeClinicalScore(rubric);
  assert.equal(result.rawAverage, 5);
  assert.equal(result.compositeScore, 100);
  assert.equal(result.safetyGateStatus, 'HARD_VETO_CRITICAL_HARM');
  assert.equal(result.dpoBetaWeight, 0.95);
});

test('resolveChosenAndRejected selects Golden Reference or preferred model accurately', () => {
  const case1 = PRELOADED_CLINICAL_CASES[0];

  const withGolden = resolveChosenAndRejected(case1, {
    ...case1.defaultRubric,
    preferenceRanking: 'B > A',
    useGoldenAsChosen: true,
  });
  assert.equal(withGolden.chosen, case1.goldenReference.rewriteText);
  assert.equal(withGolden.rejected, case1.candidateA.rawText);

  const directModelB = resolveChosenAndRejected(case1, {
    ...case1.defaultRubric,
    preferenceRanking: 'B > A',
    useGoldenAsChosen: false,
  });
  assert.equal(directModelB.chosen, case1.candidateB.rawText);
  assert.equal(directModelB.rejected, case1.candidateA.rawText);

  const directModelA = resolveChosenAndRejected(case1, {
    ...case1.defaultRubric,
    preferenceRanking: 'A >> B',
    useGoldenAsChosen: false,
  });
  assert.equal(directModelA.chosen, case1.candidateA.rawText);
  assert.equal(directModelA.rejected, case1.candidateB.rawText);
});

test('buildRlhfJsonlRecord and serializeRecordsToJsonl produce valid single-line JSONL records with Dr. Ibrahim Mohammed signature', () => {
  const case2 = PRELOADED_CLINICAL_CASES[1];
  const fixedIso = '2026-11-08T14:16:50.000Z';
  const record = buildRlhfJsonlRecord(case2, case2.defaultRubric, fixedIso);

  assert.equal(record.auditor, AUDITOR_SIGNATURE);
  assert.equal(record.auditor, 'Dr. Ibrahim Mohammed (MDCN/R/107127)');
  assert.ok(record.prompt.includes(case2.clinicalVignette));
  assert.ok(record.chosen.length > 50);
  assert.ok(record.rejected.length > 50);
  assert.ok(record.critique.length > 20);

  const jsonl = serializeRecordsToJsonl([record]);
  const lines = jsonl.trim().split('\n');
  assert.equal(lines.length, 1);

  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.auditor, 'Dr. Ibrahim Mohammed (MDCN/R/107127)');
  assert.equal(parsed.case_code, 'MG-CAP-002');
});

test('computeBatchRubricDistribution calculates per-case series, axis means, and detects clinical failure point skew', () => {
  const initialBatch = PRELOADED_CLINICAL_CASES.map((c) =>
    buildRlhfJsonlRecord(c, c.defaultRubric, '2026-11-08T14:16:50.000Z')
  );

  // Baseline: all 4 preloaded cases have 5/5 across all 3 axes
  const baselineDist = computeBatchRubricDistribution(initialBatch);
  assert.equal(baselineDist.caseSeries.length, 4);
  assert.equal(baselineDist.skewStatus, 'BALANCED_HIGH');
  assert.equal(baselineDist.axisSummaries[0].meanScore, 5);
  assert.equal(baselineDist.axisSummaries[1].meanScore, 5);
  assert.equal(baselineDist.axisSummaries[2].meanScore, 5);

  // Simulate active case lowering Pharmacotherapy Safety to 1/5
  const skewedRubric: RubricScores = {
    ...PRELOADED_CLINICAL_CASES[0].defaultRubric,
    pharmacotherapeuticSafety: 1,
    diagnosticSensitivity: 5,
    guidelineAdherence: 5,
  };

  const skewedDist = computeBatchRubricDistribution(
    initialBatch,
    { id: PRELOADED_CLINICAL_CASES[0].id, code: PRELOADED_CLINICAL_CASES[0].code },
    skewedRubric
  );

  assert.equal(skewedDist.weakestAxis, 'Pharmacotherapy Safety');
  assert.equal(skewedDist.skewStatus, 'SKEWED_FAILURE_POINT');
  assert.equal(skewedDist.axisSummaries[1].meanScore, 4.0); // (1 + 5 + 5 + 5) / 4 = 4.0
  assert.equal(skewedDist.axisSummaries[1].minScore, 1);
  assert.equal(skewedDist.axisSummaries[1].lowScoreCount, 1);
});

