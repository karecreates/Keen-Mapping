import type { ZipRecord } from "../types/mapData";

/** Join spreadsheet rows to geometry using normalized 5-character ZIP strings. */
export function normalizeZip(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value).trim().padStart(5, "0");
}

export function indexRecordsByZip(records: ZipRecord[]): Map<string, ZipRecord> {
  const map = new Map<string, ZipRecord>();
  for (const record of records) {
    const zip = normalizeZip(record.zip);
    if (!zip) continue;
    map.set(zip, record);
  }
  return map;
}

export function searchByZip(
  records: ZipRecord[],
  query: string
): { kind: "invalid" | "not_found" | "found"; zip?: string; record?: ZipRecord } {
  const trimmed = query.trim();
  if (!/^\d{5}$/.test(trimmed)) {
    return { kind: "invalid" };
  }
  const zip = trimmed.padStart(5, "0");
  const record = records.find((r) => normalizeZip(r.zip) === zip);
  if (!record) return { kind: "not_found", zip };
  return { kind: "found", zip, record };
}

export function searchByCity(records: ZipRecord[], query: string): ZipRecord[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return records.filter(
    (r) => r.city && r.city.toLowerCase().includes(q)
  );
}
