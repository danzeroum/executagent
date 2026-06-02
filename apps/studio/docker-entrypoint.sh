#!/bin/sh
set -e

# nginx:alpine runs this hook (from /docker-entrypoint.d/) BEFORE starting nginx.
# Generate runtime config from container env so one image can target any Supabase
# project without rebuilding. Only the publishable anon key is exposed (safe in-browser).
cat > /usr/share/nginx/html/config.js <<EOF
window.__EXECUTAGENT_CONFIG__ = {
  SUPABASE_URL: "${SUPABASE_URL:-}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY:-}",
};
EOF

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "[executagent] WARNING: SUPABASE_URL/SUPABASE_ANON_KEY not set — Studio will run in DEMO mode."
else
  echo "[executagent] runtime config written for ${SUPABASE_URL}"
fi
