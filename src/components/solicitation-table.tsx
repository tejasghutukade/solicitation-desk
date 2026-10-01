import { SET_ASIDE_LABELS } from "@/lib/desk/types";
import type { SolicitationRow } from "@/lib/desk/types";
import { formatDeskDate, isDueSoon } from "./format";

export function SolicitationTable({
  rows,
  selectedNumber,
  hasMore,
  onOpen,
  onShowMore,
}: {
  rows: SolicitationRow[];
  selectedNumber: string | null;
  hasMore: boolean;
  onOpen: (row: SolicitationRow) => void;
  onShowMore: () => void;
}) {
  return (
    <div className="desk-table-scroll">
      <table className="desk-table">
        <thead>
          <tr>
            <th scope="col">Solicitation</th>
            <th scope="col">NSN</th>
            <th scope="col">Name</th>
            <th scope="col" className="qty">
              Qty
            </th>
            <th scope="col">Return by</th>
            <th scope="col">Set-aside</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = row.solicitationNumber === selectedNumber;
            return (
              <tr
                key={row.solicitationNumber}
                aria-selected={selected}
                tabIndex={0}
                onClick={() => onOpen(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen(row);
                  }
                }}
              >
                <td className="mono nowrap">{row.solicitationNumber}</td>
                <td className="mono nowrap">{row.nsn}</td>
                <td>{row.shortName}</td>
                <td className="qty">{quantityAndUnit(row)}</td>
                <td className={isDueSoon(row.returnBy) ? "is-stamp nowrap" : "nowrap"}>
                  {formatDeskDate(row.returnBy)}
                </td>
                <td>{SET_ASIDE_LABELS[row.setAside]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
