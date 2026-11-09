import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    const hasServerKey = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
        process.env.GEMINI_API_KEY.trim() !== ''
    );
    res.json({
      status: 'ok',
      geminiConfigured: hasServerKey,
      auditor: 'Dr. Ibrahim Mohammed (MD | MDCN/R/107127)',
    });
  });

  app.post('/api/evaluate', async (req, res) => {
    const {
      title,
      specialty,
      systemPrompt,
      clinicalVignette,
      metaPrompt,
    } = req.body ?? {};

    if (!clinicalVignette || typeof clinicalVignette !== 'string' || clinicalVignette.trim().length < 20) {
      res.status(400).json({
        error: 'Please provide a clinical vignette of at least 20 characters for RLHF evaluation.',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Server GEMINI_API_KEY is not configured; using deterministic clinical audit engine.',
        fallbackRequired: true,
      });
      return;
    }

    try {
      const promptText = `You are Assisting Dr. Ibrahim Mohammed (MD | MDCN/R/107127) in the ClinRLHF Workbench: Medical LLM Evaluation & Hallucination Auditor.
Analyze the following clinical vignette and generate a complete side-by-side RLHF/DPO evaluation audit:

TITLE: ${title || 'Custom Clinical Vignette Audit'}
SPECIALTY: ${specialty || 'Internal Medicine & Clinical Pharmacology'}
BASE SYSTEM PROMPT: ${systemPrompt || 'Provide an evidence-based acute management plan for this patient.'}
CLINICAL VIGNETTE:
${clinicalVignette}

ZERO-HALLUCINATION META-PROMPT:
${metaPrompt || 'Execute 5-Gate Organ Clearance, Contraindication Veto, Guideline Citation, Precision Dosing, and Bedside Monitoring verification.'}

Return a JSON object containing:
1. coreTestObjective: 1-sentence summary of the pharmacotherapeutic/diagnostic trap tested.
2. patientDemographics: Concise 1-line summary of patient age/sex/comorbidities.
3. vitalsAndLabs: 4 to 6 key lab/vital metrics extracted or inferred from the vignette.
4. candidateA: Simulated "Unaligned Base LLM" response broken into 4-6 contiguous text spans where 2-3 spans are marked isAnnotation=true with severity="critical" or "minor", representing realistic medical LLM hallucinations or contraindication errors (e.g., renal/hepatic dosing failure, drug-drug interaction, or guideline error) with detailed explanation, guidelineReference, pharmacokineticMechanism, and remediation.
5. candidateB: "Chain-of-Thought Prompted LLM" response broken into 3-5 contiguous spans where key reasoning segments are marked isAnnotation=true with severity="verified".
6. goldenReferenceRewrite: Dr. Ibrahim Mohammed's comprehensive Golden Reference clinical management plan.
7. keyInvariants: 3 concise pharmacotherapy safety invariants.
8. auditorCritique: Detailed physician RLHF critique comparing Candidate A vs Candidate B.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              coreTestObjective: { type: Type.STRING },
              patientDemographics: { type: Type.STRING },
              vitalsAndLabs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    referenceRange: { type: Type.STRING },
                    flag: { type: Type.STRING },
                  },
                },
              },
              candidateASpans: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    isAnnotation: { type: Type.BOOLEAN },
                    severity: { type: Type.STRING },
                    category: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    guidelineReference: { type: Type.STRING },
                    pharmacokineticMechanism: { type: Type.STRING },
                    remediation: { type: Type.STRING },
                  },
                },
              },
              candidateBSpans: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    isAnnotation: { type: Type.BOOLEAN },
                    severity: { type: Type.STRING },
                    category: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    guidelineReference: { type: Type.STRING },
                  },
                },
              },
              goldenReferenceRewrite: { type: Type.STRING },
              keyInvariants: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              auditorCritique: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ result: parsed });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown Gemini API error';
      res.status(500).json({
        error: errMsg,
        fallbackRequired: true,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClinRLHF Workbench server listening on http://localhost:${PORT}`);
  });
}

startServer();
