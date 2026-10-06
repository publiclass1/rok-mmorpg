#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="${SUPABASE_PROJECT_REF:-fgnquzyzbvebwvbdyfvg}"

echo "Linking project ${PROJECT_REF}..."
npx supabase link --project-ref "$PROJECT_REF"

echo "Applying migrations..."
npm run supabase:push

echo "Deploying Edge Functions..."
npm run supabase:functions

echo "Done. Set client/.env from Supabase Dashboard → Settings → API:"
echo "  VITE_SUPABASE_URL"
echo "  VITE_SUPABASE_ANON_KEY"
