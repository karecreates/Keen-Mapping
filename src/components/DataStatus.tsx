import type { GeometryDiagnostics } from "../types/mapData";
import { summarizeGeometryStatus } from "../lib/validation";
import "./DataStatus.css";

interface DataStatusProps {
  diagnostics: GeometryDiagnostics | null;
  recordCount: number;
}

export function DataStatus({ diagnostics, recordCount }: DataStatusProps) {
  const status = summarizeGeometryStatus(diagnostics);

  return (
    <div className="data-status" role="status">
      <p>
        <strong>{recordCount}</strong> Colorado ZIPs in spreadsheet
      </p>
      <p className="data-status__geometry">{status.message}</p>
      {diagnostics && diagnostics.unmatchedSpreadsheetZips.length > 0 ? (
        <details className="data-status__details">
          <summary>
            {diagnostics.unmatchedSpreadsheetZips.length} unmatched postal ZIP
            {diagnostics.unmatchedSpreadsheetZips.length === 1 ? "" : "s"}
          </summary>
          <p className="data-status__hint">
            These postal ZIPs have no matching Census ZCTA polygon and cannot be
            drawn on the map.
          </p>
          <p className="data-status__zips">
            {diagnostics.unmatchedSpreadsheetZips.join(", ")}
          </p>
        </details>
      ) : null}
    </div>
  );
}
