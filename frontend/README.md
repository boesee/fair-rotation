# fair-rotation Frontend

Vite + React + TypeScript + Tailwind CSS. Siehe `../docs/architecture.md`
für die Architekturentscheidungen.

## Setup

1. `npm install`
2. `cp .env.example .env` und mit den Werten aus Supabase → Project Settings
   → Data API befüllen.
3. `npm run dev`

## Deployment

Erfolgt automatisch über `.github/workflows/deploy.yml` beim Push auf
`main` (siehe `docs/architecture.md`, Abschnitt 3, für die nötigen
GitHub-Repository-Variables).
