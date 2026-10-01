export type IndexFile = {
  fileName: string;
  text: string;
};

export type FetchedSolicitation = {
  recordPageHtml: string;
  pdf: Uint8Array;
};

export type DibbsGateway = {
  fetchRecentIndexFiles(): Promise<IndexFile[]>;
  fetchSolicitation(solicitationNumber: string): Promise<FetchedSolicitation>;
};
