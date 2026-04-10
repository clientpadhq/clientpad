export function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const normalized = String(value).replace(/\r?\n/g, " ");
  if (!/[",\n]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function buildCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const header = columns.map(toCsvValue).join(",");
  const lines = rows.map((row) => columns.map((column) => toCsvValue(row[column])).join(","));
  return [header, ...lines].join("\n");
}

export function csvResponse(filename: string, body: string) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "no-store",
    },
  });
}
