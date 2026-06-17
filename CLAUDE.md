# Carcinoma Stager — Project Reference

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript 5, Vite 5 |
| Backend | Node.js ≥20, Express 4, ES Modules (`"type": "module"`) |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) + OpenAI SDK fallback |
| External API | Airtable REST — PathPattern diagnostic comment lookup |
| Deployment | Railway — auto-deploys from `main` branch on push |

## Repository Layout

```
/
├── client/                  React SPA
│   └── src/
│       ├── components/      ReportPreview.tsx, tab UIs
│       ├── lib/types.ts     ALL TypeScript interfaces (AnyCase union)
│       └── styles.css
└── server/                  Express API + AI agent
    ├── index.js             Entry point, routes /api/*
    ├── agent.js             Routes organ → module agent
    ├── agentTools.js        Breast tool schemas + executor
    ├── billing.js           Breast + endometrial CPT billing
    ├── reportAssembler.js   Breast + endometrial report assembly
    ├── caseModel.js         Breast empty-case factory
    ├── cap/                 Breast CAP synoptic builders
    ├── endometrial/         agentTools, reportAssembler
    ├── prostate/            agentTools, caseModel, reportAssembler
    ├── lung/                agentTools, caseModel, reportAssembler
    └── pathology/           agentTools, cptBilling, mipsBilling,
                             reportAssembler, airtableClient
```

## Adding a New Module

Each module lives in `server/<organ>/` with exactly three files:

1. **`caseModel.js`** — empty-case factory + any pure-computation helpers (grade groups, staging tables, CPT maps).
2. **`agentTools.js`** — tool schemas array + `execute<Organ>Tool(name, args, caseData)` async executor.
3. **`reportAssembler.js`** — `assemble<Organ>Report(caseData)` — pure function, no side effects.

Wire it up in three places:
- `server/agent.js` — add `if (caseData?.organ === '<organ>') …` routing branch
- `server/reportAssembler.js` — import + delegate in `assembleReport()`
- `client/src/lib/types.ts` — add `<Organ>CaseData` interface and extend `AnyCase` union

## CPT Billing Rules

| Code | Trigger |
|------|---------|
| 88302–88309 | Specimen level by designation keyword |
| 88331 | Frozen section — first site per specimen |
| 88332 | Each additional frozen site, same specimen (add-on) |
| 88342 | IHC — 1st antibody per specimen |
| 88341 | IHC — each additional antibody per specimen |
| 88360 | Ki-67 / MIB-1 (morphometric) |
| 88344 | Multiplex IHC (PIN4 in prostate) |
| 88307 | Lymph node regional excision; sentinel lymph node; lumpectomy |
| 88309 | Mastectomy; hysterectomy; lobectomy/pneumonectomy |
| 88173/88174 | FNA interpretation |
| 88104/88108/88112 | Cytology smear / cell block / liquid-based prep |

Modifier `-26` = professional component only (applied globally to IHC).

## Report Format Conventions

- All diagnosis text in **ALL CAPS**
- Specimen order always **A → B → C** alphabetically
- Bullet-dash lines: `      -     DIAGNOSIS LINE`
- CAP synoptic indented 6 spaces
- `norm(s)` helper must wrap any field before `toUpperCase()` to convert literal `\n` → real newlines
- SEE COMMENT appended to first bullet (surgical) or last bullet (cytology) when a comment exists
- Meditech-safe mode strips em-dash, en-dash, smart quotes

## Development

```bash
# Install all deps (first time)
npm run install:all

# Run locally (hot-reload server + Vite HMR)
npm run dev          # server on :3001, client Vite proxy

# Build for production
npm run build        # runs tsc + vite build

# Run tests
cd server && npm test
```

Environment variables needed in `.env` (server):
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=        # optional fallback
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=app6vyZndScBt10Hl
```

## Key Design Rules

- `AnyCase` union in `types.ts` is the single source of truth for frontend types — update it for every new module
- Agent tools must be idempotent: calling `add_specimen` twice with the same letter updates rather than duplicates
- `norm()` before `upper()`/`toUpperCase()` everywhere — prevents literal `\N` in reports
- Per-specimen MIPS suggestions returned from `suggestMipsMeasures()` in `pathology/mipsBilling.js`
- No `receivedDate` in the prostate or general pathology modules
- Sentinel node modifier `(sn)` auto-applies when total nodes < 6
