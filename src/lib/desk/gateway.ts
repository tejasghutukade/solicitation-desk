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
  fetchIndexFile(fileName: string): Promise<string>;
  fetchSolicitation(solicitationNumber: string): Promise<FetchedSolicitation>;
};
