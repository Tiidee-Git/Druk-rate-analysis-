# Druk Rate Analysis

A React-based BOQ rate analysis application for Bhutan construction tenders, aligned to the Bhutan Schedule of Rates (BSR) Table 5.1 style used by MoWHS.

## Included workflow
- BOQ item management with editable rate-analysis worksheets
- Materials, labour, equipment, and sundries sections
- Configurable overhead and contingency markup chain
- Base town and fiscal year selection for Bhutan-specific context
- Excel export with cover, basic rates, item worksheets, and BOQ summary sheets
- Market-rate comparison tab with a pluggable fetch path for current pricing

## Setup
1. Install dependencies:
   - npm install
2. Start the development server:
   - npm run dev
3. Open the local Vite URL shown in the terminal.

## Build
- npm run build

## Notes
- The market-rate comparison currently uses a pluggable HTTP endpoint. Replace the endpoint in src/App.jsx with your procurement or AI-assisted rate service if you want live data integration.
