import type { DibbsGateway, FetchedSolicitation, IndexFile } from "./gateway";

export class LiveDibbsGateway implements DibbsGateway {
  async fetchRecentIndexFiles(): Promise<IndexFile[]> {
    throw new Error("LiveDibbsGateway.fetchRecentIndexFiles is not implemented");
  }

  async fetchSolicitation(_solicitationNumber: string): Promise<FetchedSolicitation> {
    throw new Error("LiveDibbsGateway.fetchSolicitation is not implemented");
  }
}
