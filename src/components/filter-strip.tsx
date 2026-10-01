import { SET_ASIDE_LABELS } from "@/lib/desk/types";
import type { DeskQuery, SetAside } from "@/lib/desk/types";

const SET_ASIDES = (Object.keys(SET_ASIDE_LABELS) as SetAside[]).map((code) => ({
  code,
  label: SET_ASIDE_LABELS[code],
}));

export function FilterStrip({
  query,
  onSearch,
  onReturnBy,
  onPostedDate,
  onToggleSetAside,
}: {
  query: DeskQuery;
  onSearch: (value: string) => void;
  onReturnBy: (value: string) => void;
  onPostedDate: (value: string) => void;
  onToggleSetAside: (code: SetAside) => void;
}) {
  return (
    <div className="desk-filters">
      <label className="desk-field desk-search" htmlFor="solicitation-search">
        Solicitation, NSN, or name
        <input
          id="solicitation-search"
          type="search"
          value={query.search}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
      <label className="desk-field" htmlFor="return-by-on-or-before">
        Close on or before
        <input
          id="return-by-on-or-before"
          type="date"
          value={query.returnByOnOrBefore ?? ""}
          onChange={(event) => onReturnBy(event.target.value)}
        />
      </label>
      <label className="desk-field" htmlFor="posted-day">
        Posted day
        <input
          id="posted-day"
          type="date"
          value={query.postedDate ?? ""}
          onChange={(event) => onPostedDate(event.target.value)}
        />
      </label>
      <div className="set-asides" role="group" aria-label="Set-asides">
        {SET_ASIDES.map((setAside) => (
          <button
            key={setAside.code}
            type="button"
            className="set-aside-toggle"
            aria-pressed={query.setAsides.includes(setAside.code)}
            onClick={() => onToggleSetAside(setAside.code)}
          >
            {setAside.label}
          </button>
        ))}
      </div>
    </div>
  );
}
