import path from "node:path";
import { LiveDibbsGateway } from "./dibbs-gateway";
import { SolicitationDesk } from "./solicitation-desk";
import type { DeskQuery, SolicitationBrief, SolicitationRow } from "./types";

let desk: SolicitationDesk | null = null;

export function getDesk(): SolicitationDesk {
  if (!desk) {
    desk = new SolicitationDesk({
      databasePath: path.join(process.cwd(), "data", "solicitation-desk.sqlite"),
      gateway: new LiveDibbsGateway(),
    });
  }
  return desk;
}

export async function loadIndexOnStartup(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  try {
    await getDesk().ensureReady();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The recent solicitations could not be loaded.";
    return { ok: false, message };
  }
}

export function listSolicitations(query: DeskQuery): SolicitationRow[] {
  return getDesk().query(query);
}

export async function openSolicitation(solicitationNumber: string): Promise<SolicitationBrief> {
  return getDesk().open(solicitationNumber);
}

export function readStoredPdf(solicitationNumber: string): Uint8Array | null {
  return getDesk().storedPdf(solicitationNumber);
}
