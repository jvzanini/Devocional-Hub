#!/bin/sh
# Verifica novas transcrições a cada 10 minutos entre 6h00-9h30 BRT
# Roda em background no container

CRON_SECRET="${CRON_SECRET:-devocional-cron-2024}"
APP_URL="http://localhost:3000"

echo "[CRON] Worker iniciado. Verificando a cada 10 minutos (6h00-9h30 BRT)."

while true; do
  # Esperar 10 minutos
  sleep 600

  # Verificar horário BRT
  HOUR=$(TZ=America/Sao_Paulo date +%H)
  MINUTE=$(TZ=America/Sao_Paulo date +%M)

  if [ "$HOUR" -ge 6 ] && [ "$HOUR" -lt 10 ]; then
    if [ "$HOUR" -eq 9 ] && [ "$MINUTE" -gt 30 ]; then
      continue
    fi

    echo "[CRON] $(TZ=America/Sao_Paulo date '+%H:%M') - Verificando transcrições..."
    RESULT=$(curl -s --max-time 120 "${APP_URL}/api/cron/check?token=${CRON_SECRET}" 2>/dev/null)
    echo "[CRON] Resultado: ${RESULT}"
  fi
done
