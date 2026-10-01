import { SET_ASIDE_LABELS } from "@/lib/desk/types";
import type { SolicitationBrief, SolicitationRow } from "@/lib/desk/types";
import { formatDeskDate, formatDeskDateOrBlank, isDueSoon, statusLooksOpen, yesNo } from "./format";

export function BriefPane({
  row,
  brief,
  reading,
  failed,
  onRetry,
}: {
  row: SolicitationRow | null;
  brief: SolicitationBrief | null;
  reading: boolean;
  failed: boolean;
  onRetry: () => void;
}) {
  if (!row) {
    return (
      <div className="brief-empty">
        <h2>Select a solicitation</h2>
        <p>The list stays up while you read.</p>
      </div>
    );
  }

  const view = brief ?? row;
  const ready = brief?.loadState === "ready" ? brief : null;
  const name = ready?.fullName?.trim() ? ready.fullName : view.shortName;
  const soon = isDueSoon(view.returnBy);

  return (
    <div className="brief-body">
      <p className="return-eyebrow">Return by</p>
      <p className={soon ? "return-stamp is-stamp" : "return-stamp"}>{formatDeskDate(view.returnBy)}</p>
      {reading ? <p className="brief-note">Reading the solicitation…</p> : null}
      {failed && !reading ? (
        <div className="brief-fail">
          <p>The full record could not be loaded.</p>
          <button type="button" className="desk-text-button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
      <dl className="brief-fields">
        <Field label="Solicitation" mono>
          {view.solicitationNumber}
        </Field>
        <Field label="Set-aside">{SET_ASIDE_LABELS[view.setAside]}</Field>
        <Field label="Name">{name}</Field>
        <Field label="NSN" mono>
          {view.nsn}
        </Field>
        <Field label="Quantity">{quantityAndUnit(view)}</Field>
        <Field label="Posted day">{formatDeskDateOrBlank(view.postedDate)}</Field>
        {ready ? (
          <>
            <Field label="Issue date">{formatDeskDateOrBlank(ready.issueDate)}</Field>
            <Field label="Status">
              {ready.status?.trim() ? (
                <span className={statusLooksOpen(ready.status) ? "is-ready" : undefined}>
                  {ready.status.trim()}
                </span>
              ) : null}
            </Field>
            <Field label="Deliver by">{formatDeskDateOrBlank(ready.deliverBy)}</Field>
            <Field label="Buyer">{ready.buyerName?.trim() ?? ""}</Field>
            <Field label="Buyer email">
              {ready.buyerEmail?.trim() ? (
                <a className="desk-link" href={`mailto:${ready.buyerEmail.trim()}`}>
                  {ready.buyerEmail.trim()}
                </a>
              ) : null}
            </Field>
            <Field label="NAICS">{ready.naics?.trim() ?? ""}</Field>
            <Field label="Approved source">{ready.approvedSource?.company?.trim() ?? ""}</Field>
            <Field label="CAGE" mono>
              {ready.approvedSource?.cage?.trim() ?? ""}
            </Field>
            <Field label="Part number">{ready.approvedSource?.partNumber?.trim() ?? ""}</Field>
            <Field label="Automated award">{yesNo(ready.automatedAward)}</Field>
            <Field label="Inspection">{ready.inspection?.trim() ?? ""}</Field>
            <Field label="Buy American">{yesNo(ready.buyAmerican)}</Field>
            <Field label="Last paid">{ready.lastPaid?.unitPrice?.trim() ?? ""}</Field>
            <Field label="Last paid quantity">{ready.lastPaid?.quantity?.trim() ?? ""}</Field>
            <Field label="Award date">{formatDeskDateOrBlank(ready.lastPaid?.awardDate)}</Field>
            <Field label="Requirement codes">
              {ready.requirementCodes.length > 0 ? (
                <span className="code-list">
                  {ready.requirementCodes.map((code, index) => (
                    <span className="code-chip" key={`${code}-${index}`}>
                      {code}
                    </span>
                  ))}
                </span>
              ) : null}
            </Field>
          </>
        ) : null}
      </dl>
      {brief && (brief.pdfAvailable || brief.recordPageUrl) ? (
        <div className="brief-links">
          {brief.pdfAvailable ? (
            <a className="desk-link" href={`/pdf/${encodeURIComponent(brief.solicitationNumber)}`}>
              Saved PDF
            </a>
          ) : null}
          {brief.recordPageUrl ? (
            <a className="desk-link" href={brief.recordPageUrl} target="_blank" rel="noreferrer">
              DIBBS page
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  mono = false,
  children,
}: {
  label: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={mono ? "mono" : undefined}>{children}</dd>
    </>
  );
}

function quantityAndUnit(row: SolicitationRow): string {
  return row.unit ? `${row.quantity} ${row.unit}` : String(row.quantity);
}
