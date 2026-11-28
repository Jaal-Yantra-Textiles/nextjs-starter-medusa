#!/usr/bin/env bash
# Write /opt/sf/.env and the tunnel credentials from SSM (jyt#2636).
# The box's role can read only /jyt/sf-origin/*.
set -euo pipefail
cd /opt/sf
R=eu-central-1
get() { aws ssm get-parameter --region "$R" --with-decryption --name "/jyt/sf-origin/$1" --query Parameter.Value --output text; }
umask 077
{
  echo "MEDUSA_BACKEND_URL=https://v3.jaalyantra.com"
  echo "ORIGIN_PROXY_SECRET=$(get ORIGIN_PROXY_SECRET)"
  echo "NEXT_PUBLIC_MULTI_TENANT=true"
  echo "REVALIDATE_SECRET=$(get REVALIDATE_SECRET)"
  echo "STOREFRONT_REVALIDATE_SECRET=$(get STOREFRONT_REVALIDATE_SECRET)"
} > .env.new
# Keep the pinned image across re-renders.
grep -E '^SF_IMAGE=' .env 2>/dev/null >> .env.new || true
mv .env.new .env
get TUNNEL_CREDENTIALS > tunnel-credentials.json
# cloudflared runs as a non-root user inside its container.
chmod 644 tunnel-credentials.json
echo "rendered .env ($(wc -l < .env) lines) and tunnel credentials"
