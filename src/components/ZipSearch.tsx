import { useId, useState, type FormEvent } from "react";
import type { ZipRecord } from "../types/mapData";
import { searchByCity, searchByZip } from "../lib/mapJoin";
import "./ZipSearch.css";

interface ZipSearchProps {
  records: ZipRecord[];
  geometryZips: Set<string>;
  onSelectZip: (zip: string) => void;
  onMessage: (message: string) => void;
}

export function ZipSearch({
  records,
  geometryZips,
  onSelectZip,
  onMessage,
}: ZipSearchProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [cityHits, setCityHits] = useState<ZipRecord[]>([]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();

    if (/^\d{5}$/.test(trimmed)) {
      const result = searchByZip(records, trimmed);
      if (result.kind === "invalid") {
        onMessage("Invalid ZIP format. Enter a five-digit ZIP code.");
        return;
      }
      if (result.kind === "not_found") {
        onMessage(`ZIP ${result.zip} was not found in the current product spreadsheet.`);
        return;
      }
      const zip = result.zip!;
      if (!geometryZips.has(zip)) {
        onMessage(
          `ZIP ${zip} is in the spreadsheet but has no Census ZCTA polygon geometry.`
        );
        onSelectZip(zip);
        return;
      }
      onMessage(`Selected ZIP ${zip}.`);
      onSelectZip(zip);
      setCityHits([]);
      return;
    }

    // City search
    const hits = searchByCity(records, trimmed).slice(0, 8);
    setCityHits(hits);
    if (!trimmed) {
      onMessage("Enter a five-digit ZIP or city name.");
      return;
    }
    if (hits.length === 0) {
      onMessage(`No cities matching “${trimmed}” in the current product data.`);
      return;
    }
    onMessage(`${hits.length} city match${hits.length === 1 ? "" : "es"} found.`);
  }

  return (
    <div className="zip-search">
      <form onSubmit={handleSubmit}>
        <label className="control-label" htmlFor={id}>
          Search ZIP or city
        </label>
        <div className="zip-search__row">
          <input
            id={id}
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="e.g. 80202 or Denver"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCityHits([]);
            }}
          />
          <button type="submit" className="btn">
            Go
          </button>
        </div>
      </form>

      {cityHits.length > 0 ? (
        <ul className="zip-search__hits" role="listbox" aria-label="City matches">
          {cityHits.map((r) => (
            <li key={`${r.zip}-${r.sourceRow}`}>
              <button
                type="button"
                onClick={() => {
                  if (!r.zip) return;
                  if (!geometryZips.has(r.zip)) {
                    onMessage(
                      `ZIP ${r.zip} is in the spreadsheet but has no Census ZCTA polygon geometry.`
                    );
                  } else {
                    onMessage(`Selected ZIP ${r.zip} (${r.city}).`);
                  }
                  onSelectZip(r.zip);
                  setCityHits([]);
                  setQuery(r.zip);
                }}
              >
                <strong>{r.zip}</strong>
                <span>{r.city}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
