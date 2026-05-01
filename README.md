# Breast Carcinoma Stager

Local-first LLM-agentic pathology reporting assistant for breast specimens.
Supported modes:
- **Breast excision with DCIS** — full CAP synoptic + final dx + IHC + CPT.
- **Breast excision with invasive carcinoma** — full CAP synoptic (histologic
  type, Nottingham grade, focality, LVI, associated DCIS, margins for invasive
  AND DCIS separately, regional nodes with macro/micro/ITC, AJCC 8 pT/pN/pM
  with y/r/m modifiers, structured ER/PR/HER2/Ki-67, treatment effect).

## Quick start

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3002

API keys (Anthropic + OpenAI) are entered in the **Settings** panel and kept
in browser localStorage. Keys are sent per-request to the local server and not
persisted server-side.

## Architecture

```
client/          Vite + React + TS wizard UI
server/          Express + LLM tool-calling agent
server/providers Anthropic (claude-opus-4-7) + OpenAI (gpt-4o) adapters
server/cap       CAP protocol templates (excisionDCIS first)
server/billing   CPT logic (specimen + IHC)
```

## Out of scope for v1

- Biopsy-DCIS and biopsy-invasive modes (stubbed)
- Auth / Firebase / subscription
- Accession tracking / server-side persistence
