import { SET_ASIDE_LABELS, recordPageUrl } from "@/lib/desk/types";
import type { SolicitationRow } from "@/lib/desk/types";
import { formatDeskDate, isDueSoon } from "./format";

export function SolicitationTable({
  rows,
  loading,
  selectedNumber,
  hasMore,
  onOpen,
  onShowMore,
}: {
  rows: SolicitationRow[];
  loading: boolean;
  selectedNumber: string | null;
  hasMore: boolean;
  onOpen: (row: SolicitationRow) => void;
  onShowMore: () => void;
}) {
  if (loading) {
    return (
      <div className="scan-scroll" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <div className="scan-skeleton" key={index} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="scan-empty">No solicitations match.</p>;
  }

  return (
    <div className="scan-scroll">
      <ul className="scan-list">
        {rows.map((row) => {
          const selected = row.solicitationNumber === selectedNumber;
          const soon = isDueSoon(row.returnBy);
          return (
            <li key={row.solicitationNumber} className={selected ? "scan-item is-selected" : "scan-item"}>
              <button
                type="button"
                className="scan-row"
                aria-pressed={selected}
                onClick={() => onOpen(row)}
              >
                <span className="scan-main">
                  <span className="scan-name">{row.shortName}</span>
                  <span className="scan-meta mono">
                    {row.solicitationNumber}
                    <span className="scan-dot" aria-hidden="true" />
                    {row.nsn}
                  </span>
                </span>
                <span className="scan-side">
                  <span className="scan-deadline">
                    <span className="scan-date-label">Return by</span>
                    <span className={soon ? "scan-date is-stamp" : "scan-date"}>{formatDeskDate(row.returnBy)}</span>
                  </span>
                  <span className="scan-chip">{SET_ASIDE_LABELS[row.setAside]}</span>
                  <span className="scan-qty">{quantityAndUnit(row)}</span>
                </span>
              </button>
              <a
                className="scan-dibbs"
                href={recordPageUrl(row.solicitationNumber)}
                target="_blank"
                rel="noreferrer"
              >
                DIBBS page
              </a>
            </li>
          );
        })}
      </ul>
      {hasMore ? (
        <div className="desk-more">
          <button type="button" className="desk-text-button" onClick={onShowMore}>
            Show more
          </button>
        </div>
      ) : null}
    </div>
  );
}

function quantityAndUnit(row: SolicitationRow): string {
  return row.unit ? `${row.quantity} ${row.unit}` : String(row.quantity);
}
