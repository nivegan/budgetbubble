
# BudgetBubble – Your simple, smart family finance hub

BudgetBubble helps families understand money at a glance: what you spend, what you save, what you own, and what you owe. Upload your bank e-statements or holdings files, auto-categorize transactions, track goals, and manage IOUs and gifts – all in one clean, secure place.

## Why you’ll love it
- **One‑click uploads**: Drop in CSV/XLS/XLSX files; we auto-detect headers, parse across bank formats, dedupe rows, and import.
- **Smart insights**: Auto-categorization learns from your edits. Subscriptions are detected automatically from recurring patterns.
- **Assets & investments**: Upload holdings, see total value, gains, and PnL snapshots.
- **Goals that actually work**: Savings-only goals, easy edit/delete/inactive, and fair allocation across many goals by priority/percent (prevents double counting).
- **Ledgers**: IOU tracker and gift tracker with filters and reusable people.
- **Household view**: Share a single source of truth across the family.

## Key features
- **Transactions**: Upload statements; search, filter, categorize; recurring subscriptions auto-detected.
- **Holdings**: Upload holdings CSV/XLS; summary cards, gains, and simple updates.
- **Ledgers**: IOU (owe/owed, currency, resolve) and Gift tracker (given/received, people, amounts, occasions).
- **Goals**: Create savings goals, edit/delete/inactivate. Savings are allocated by priority/percentage (or equally by default) to avoid double counting.

## Quick start (local)
1. Install: `npm i`
2. Start dev server: `npm run dev`
3. Visit: `http://localhost:3000`

## Deploy on Firebase Hosting
1. Build: `npm run build`
2. Copy build to public: `cp -r build/* public/`
3. Deploy: `firebase deploy`

`firebase.json` should include:
```json
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

## How uploads work
- Accepts `.csv`, `.xls`, `.xlsx`.
- Transactions: auto-detects header row (date, description, amount, balance), skips leading noise, dedupes.
- Holdings: auto-detects columns (symbol/name, quantity, price/value), dedupes.
- Clear import results: success/skip counts with reasons for any failures.

## Data and persistence
- Authentication and APIs are provided via Supabase. Transactions, holdings, goals, and subscriptions persist to the database.
- IOU and Gift ledgers are designed for persistence; if backend endpoints aren’t available yet, entries are kept in-session and can be wired to APIs quickly.

## Privacy
You own your data. We never expose personal files publicly; uploads are processed server-side with token-based auth.

## Roadmap
- Richer rule-based auto-categorization model with transparent suggestions.
- Price feeds to refresh holdings PnL at login.
- Deeper budgeting with envelopes and alerts.

## Support
Questions or ideas? Open an issue or reach out. We love feedback.
  