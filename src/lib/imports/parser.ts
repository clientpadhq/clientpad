export type ImportEntity = "leads" | "clients";

export type ImportRowError = {
  rowNumber: number;
  messages: string[];
  row: Record<string, string>;
};

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

const REQUIRED_HEADERS: Record<ImportEntity, string[]> = {
  leads: ["name", "phone"],
  clients: ["business_name"],
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function parseCsvContent(csvText: string): ParsedCsv {
  const rawLines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!rawLines.length) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = parseCsvLine(rawLines[0]);
  const headers = rawHeaders.map(normalizeHeader);

  const rows = rawLines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = String(values[index] ?? "").trim();
    });

    return row;
  });

  return { headers, rows };
}

export function validateRequiredHeaders(entity: ImportEntity, headers: string[]) {
  const required = REQUIRED_HEADERS[entity];
  const normalizedHeaders = new Set(headers.map(normalizeHeader));
  const missing = required.filter((header) => !normalizedHeaders.has(header));

  return {
    required,
    missing,
    valid: missing.length === 0,
  };
}

export function validateRow(entity: ImportEntity, row: Record<string, string>, rowNumber: number): ImportRowError | null {
  const messages: string[] = [];

  if (entity === "leads") {
    if (!row.name) messages.push("name is required");
    if (!row.phone) messages.push("phone is required");

    if (row.status && !["new", "contacted", "qualified", "unqualified"].includes(row.status)) {
      messages.push("status must be one of: new, contacted, qualified, unqualified");
    }
  }

  if (entity === "clients") {
    if (!row.business_name) messages.push("business_name is required");

    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      messages.push("email format is invalid");
    }
  }

  if (!messages.length) return null;

  return {
    rowNumber,
    messages,
    row,
  };
}
