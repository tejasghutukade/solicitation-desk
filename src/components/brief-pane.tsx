import { SET_ASIDE_LABELS, recordPageUrl } from "@/lib/desk/types";
import type { SolicitationBrief, SolicitationRow } from "@/lib/desk/types";
import { formatDeskDate, formatDeskDateOrBlank, isDueSoon, isPastDeadline, statusLooksOpen, yesNo } from "./format";

export function BriefPane({
  row,
  brief,
  reading,
  failed,
  onClose,
  onRetry,
}: {
  row: SolicitationRow;
  brief: SolicitationBrief | null;
  reading: boolean;
  failed: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  const view = brief ?? row;
  const ready = brief?.loadState === "ready" ? brief : null;
  const name = ready?.fullName?.trim() ? ready.fullName : view.shortName;
  const past = isPastDeadline(view.returnBy);
  const soon = !past && isDueSoon(view.returnBy);
  const stampClass = past ? "return-stamp is-late" : soon ? "return-stamp is-stamp" : "return-stamp";

  const pageUrl = brief?.recordPageUrl || recordPageUrl(row.solicitationNumber);

  return (
    <div className="brief-body">
      <div className="brief-toolbar">
        <p className="return-eyebrow">Return by</p>
        <button type="button" className="desk-text-button" onClick={onClose}>
          Close
        </button>
      </div>
      <p className={stampClass}>{formatDeskDate(view.returnBy)}</p>
      <div className="brief-actions">
        <a className="brief-action" href={pageUrl} target="_blank" rel="noreferrer">
          DIBBS page
        </a>
        {brief?.pdfAvailable ? (
          <a className="brief-action brief-action-pdf" href={`/pdf/${encodeURIComponent(brief.solicitationNumber)}`}>
            Saved PDF
          </a>
        ) : null}
      </div>
      {reading ? (
        <p className="fetch-status" role="status">
          <span className="spinner" aria-hidden="true" />
          Fetching the record
        </p>
      ) : null}
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
