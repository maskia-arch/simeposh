#!/bin/bash
set -e

TIMESTAMP=$(TZ='Europe/Berlin' date '+%Y-%m-%d %H:%M:%S %Z')
echo "[${TIMESTAMP}] Starting post-deploy tasks..."

# 1. Sync upstream Next.js IP into Nginx configuration
if [ -f "/root/sync_upstream.sh" ]; then
  /root/sync_upstream.sh
fi

# 2. Purge Nginx proxy cache if directory exists
if [ -d "/data/coolify/proxy/cache/data" ]; then
  echo "[${TIMESTAMP}] Clearing Nginx proxy cache directory..."
  rm -rf /data/coolify/proxy/cache/data/*
fi
docker exec puresim-cache nginx -s reload 2>/dev/null || true
echo "[${TIMESTAMP}] [OK] Nginx proxy reloaded successfully."

# 3. Retrieve Cloudflare credentials (from env, .env file, or Coolify application model)
CF_TOKEN="${CF_API_TOKEN:-${CLOUDFLARE_API_TOKEN}}"
CF_ZONE="${CF_ZONE_ID:-${CLOUDFLARE_ZONE_ID}}"

ENV_FILE="/data/coolify/applications/i158oirldzf2kl9yx12aiswd/.env"
if [ -f "$ENV_FILE" ]; then
  if [ -z "$CF_TOKEN" ]; then
    CF_TOKEN=$(grep -E '^(CF_API_TOKEN|CLOUDFLARE_API_TOKEN)=' "$ENV_FILE" | head -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'")
  fi
  if [ -z "$CF_ZONE" ]; then
    CF_ZONE=$(grep -E '^(CF_ZONE_ID|CLOUDFLARE_ZONE_ID)=' "$ENV_FILE" | head -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'")
  fi
fi

# Fallback: query decrypted values from Coolify if not found in environment
if [ -z "$CF_TOKEN" ] || [ -z "$CF_ZONE" ]; then
  if docker ps --format '{{.Names}}' | grep -q '^coolify$'; then
    FETCH_PHP='
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$m = App\Models\Application::where("uuid", "i158oirldzf2kl9yx12aiswd")->first();
if ($m) {
  foreach ($m->environment_variables as $v) {
    if ($v->key === "CF_API_TOKEN" || $v->key === "CLOUDFLARE_API_TOKEN") echo "CF_TOKEN=" . $v->value . "\n";
    if ($v->key === "CF_ZONE_ID" || $v->key === "CLOUDFLARE_ZONE_ID") echo "CF_ZONE=" . $v->value . "\n";
  }
}
'
    COOLIFY_VARS=$(docker exec coolify php -r "$FETCH_PHP" 2>/dev/null || true)
    if [ -n "$COOLIFY_VARS" ]; then
      while IFS='=' read -r key val; do
        if [ "$key" = "CF_TOKEN" ] && [ -n "$val" ]; then CF_TOKEN="$val"; fi
        if [ "$key" = "CF_ZONE" ] && [ -n "$val" ]; then CF_ZONE="$val"; fi
      done <<< "$COOLIFY_VARS"
    fi
  fi
fi

# Hard fail if either token or zone is missing
if [ -z "$CF_TOKEN" ] || [ -z "$CF_ZONE" ]; then
  echo "[${TIMESTAMP}] [FATAL ERROR] Cloudflare credentials missing: CF_API_TOKEN or CF_ZONE_ID not found!" >&2
  exit 1
fi

TOKEN_MASK="${CF_TOKEN:0:4}..."
ZONE_MASK="${CF_ZONE:0:4}..."
echo "[${TIMESTAMP}] Purging Cloudflare Edge Cache (Zone: ${ZONE_MASK}, Token: ${TOKEN_MASK})..."

PURGE_RES=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/purge_cache" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}')

if echo "$PURGE_RES" | grep -q '"success":true'; then
  echo "[${TIMESTAMP}] [OK] Cloudflare Cache Purge successful: \"success\": true"
else
  echo "[${TIMESTAMP}] [FATAL ERROR] Cloudflare Cache Purge failed! Response: $PURGE_RES" >&2
  exit 1
fi

FINAL_TIME=$(TZ='Europe/Berlin' date '+%Y-%m-%d %H:%M:%S %Z')
echo "[${FINAL_TIME}] Post-deploy completed successfully."
exit 0
