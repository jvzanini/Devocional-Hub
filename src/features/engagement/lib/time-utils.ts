const TZ = "America/Sao_Paulo";

export function toBrazilDate(date: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date); // YYYY-MM-DD
}

export function timeAgoPtBR(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "agora";
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "há 1 hora" : `há ${hr} horas`;
  const day = Math.floor(hr / 24);
  if (day < 30) return day === 1 ? "há 1 dia" : `há ${day} dias`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return mo === 1 ? "há 1 mês" : `há ${mo} meses`;
  const yr = Math.floor(mo / 12);
  return yr === 1 ? "há 1 ano" : `há ${yr} anos`;
}
