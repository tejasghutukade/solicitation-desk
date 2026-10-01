import type { DibbsGateway } from "./gateway";
import type { DeskQuery, SolicitationBrief, SolicitationRow } from "./types";

export type SolicitationDeskOptions = {
  databasePath: string;
  gateway: DibbsGateway;
};

export class SolicitationDesk {
  constructor(_options: SolicitationDeskOptions) {}

  ingestIndexFile(_fileName: string, _body: string): void {
    throw new Error("SolicitationDesk.ingestIndexFile is not implemented");
  }

  async ensureReady(): Promise<void> {
    throw new Error("SolicitationDesk.ensureReady is not implemented");
  }

  query(_query: DeskQuery): SolicitationRow[] {
    throw new Error("SolicitationDesk.query is not implemented");
  }

  async open(_solicitationNumber: string): Promise<SolicitationBrief> {
    throw new Error("SolicitationDesk.open is not implemented");
  }

  storedPdf(_solicitationNumber: string): Uint8Array | null {
    throw new Error("SolicitationDesk.storedPdf is not implemented");
  }
}
