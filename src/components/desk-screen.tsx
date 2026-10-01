"use client";

import { useEffect, useRef, useState } from "react";
import { listSolicitations, openSolicitation, pullPostedDay } from "@/app/actions";
import { EVERY_SET_ASIDE } from "@/lib/desk/types";
import type { DeskQuery, SetAside, SolicitationBrief, SolicitationRow, Supplier } from "@/lib/desk/types";
import { BriefPane } from "./brief-pane";
import { FilterStrip } from "./filter-strip";
import { formatDeskDate, solicitationCount } from "./format";
import { SolicitationTable } from "./solicitation-table";

const SHOPS: { id: Supplier; label: string }[] = [
  { id: "hardware", label: "Hardware" },
  { id: "medical", label: "Medical" },
  { id: "electrical", label: "Electrical" },
  { id: "all", label: "All" },
];

const PAGE_SIZE = 200;

export function DeskScreen({ initialQuery }: { initialQuery: DeskQuery }) {
  const [query, setQuery] = useState(initialQuery);
  const [rows, setRows] = useState<SolicitationRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selection, setSelection] = useState<{
    row: SolicitationRow;
    brief: SolicitationBrief | null;
    reading: boolean;
    failed: boolean;
  } | null>(null);
  const openSeq = useRef(0);
  const [pullDay, setPullDay] = useState("");
  const [pulling, setPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);
  const pullSeq = useRef(0);

  useEffect(() => {
    let active = true;
    listSolicitations(query).then(
      (next) => {
        if (!active) return;
        setRows(next);
        setVisible(PAGE_SIZE);
        setListError(null);
      },
      (error: unknown) => {
        if (!active) return;
        setRows(null);
        setVisible(PAGE_SIZE);
        setListError(error instanceof Error ? error.message : "The solicitations could not be listed.");
      },
    );
    return () => {
      active = false;
    };
  }, [query, listVersion]);

  function requestPull() {
    if (!pullDay || pulling) return;
    const seq = ++pullSeq.current;
    const day = pullDay;
    setPulling(true);
    setPullStatus(`Pulling ${formatDeskDate(day)}`);
    pullPostedDay(day).then(
      (result) => {
        if (pullSeq.current !== seq) return;
        setPulling(false);
        setPullStatus(`Stored ${solicitationCount(result.solicitations)} from ${formatDeskDate(result.postedDate)}`);
        setListVersion((version) => version + 1);
      },
      (error: unknown) => {
        if (pullSeq.current !== seq) return;
        setPulling(false);
        setPullStatus(error instanceof Error ? error.message : "That day's index could not be stored.");
      },
    );
  }

  function chooseShop(supplier: Supplier) {
    if (supplier === query.supplier) return;
    openSeq.current += 1;
    setSelection(null);
    setQuery((current) => ({ ...current, supplier }));
  }

  function closeBrief() {
    openSeq.current += 1;
    setSelection(null);
  }

  function openRow(row: SolicitationRow) {
    const seq = ++openSeq.current;
    setSelection({ row, brief: null, reading: true, failed: false });
    openSolicitation(row.solicitationNumber).then(
      (brief) => {
        if (openSeq.current !== seq) return;
        setSelection({ row, brief, reading: false, failed: brief.loadState === "failed" });
      },
      () => {
        if (openSeq.current !== seq) return;
        setSelection({ row, brief: null, reading: false, failed: true });
      },
    );
  }

  const visibleRows = (rows ?? []).slice(0, visible);

  return (
    <main className={selection ? "desk is-open" : "desk"}>
      <section className="desk-list" aria-label="Solicitations">
        <div className="desk-list-head">
          <h1>Solicitation desk</h1>
          <div className="desk-list-tools">
            <div className="shop-switch" role="group" aria-label="Shop">
              {SHOPS.map((shop) => (
                <button
                  key={shop.id}
                  type="button"
                  aria-pressed={query.supplier === shop.id}
                  onClick={() => chooseShop(shop.id)}
                >
                  {shop.label}
                </button>
              ))}
            </div>
            {listError ? (
              <p className="desk-count is-fail">{listError}</p>
            ) : (
              <p className="desk-count" aria-live="polite">
                {rows ? solicitationCount(rows.length) : ""}
              </p>
            )}
          </div>
        </div>
        <FilterStrip
          query={query}
          onSearch={(search) => setQuery((current) => ({ ...current, search }))}
          onReturnBy={(value) =>
            setQuery((current) => ({ ...current, returnByOnOrBefore: value || null }))
          }
          onPostedDate={(value) => setQuery((current) => ({ ...current, postedDate: value || null }))}
          onToggleSetAside={(code) =>
            setQuery((current) => ({ ...current, setAsides: toggleSetAside(current.setAsides, code) }))
          }
        />
        <div className="day-pull">
          <label className="desk-field" htmlFor="pull-posted-day">
            Add a posted day
            <input
              id="pull-posted-day"
              type="date"
              value={pullDay}
              onChange={(event) => setPullDay(event.target.value)}
            />
          </label>
          <button type="button" className="desk-text-button" disabled={!pullDay || pulling} onClick={requestPull}>
            {pulling ? "Pulling…" : "Pull this day"}
          </button>
          {pullStatus ? (
            <p
              className={
                pulling || pullStatus.startsWith("Stored") ? "day-pull-status" : "day-pull-status is-fail"
              }
              role="status"
            >
              {pullStatus}
            </p>
          ) : null}
        </div>
        <SolicitationTable
          rows={visibleRows}
          loading={rows === null && !listError}
          selectedNumber={selection?.row.solicitationNumber ?? null}
          hasMore={rows !== null && rows.length > visible}
          onOpen={openRow}
          onShowMore={() => setVisible((count) => count + PAGE_SIZE)}
        />
      </section>
      {selection ? (
        <section className="desk-brief" aria-label="Brief" aria-busy={selection.reading}>
          <BriefPane
            row={selection.row}
            brief={selection.brief}
            reading={selection.reading}
            failed={selection.failed}
            onClose={closeBrief}
            onRetry={() => openRow(selection.row)}
          />
        </section>
      ) : null}
    </main>
  );
}

function toggleSetAside(current: SetAside[], code: SetAside): SetAside[] {
  const selected = new Set(current);
  if (selected.has(code)) selected.delete(code);
  else selected.add(code);
  return EVERY_SET_ASIDE.filter((item) => selected.has(item));
}
