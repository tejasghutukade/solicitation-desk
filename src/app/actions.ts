"use server";

import { listSolicitations as listStored, openSolicitation as openStored } from "@/lib/desk/app";
import type { DeskQuery, SolicitationBrief, SolicitationRow } from "@/lib/desk/types";

export async function listSolicitations(query: DeskQuery): Promise<SolicitationRow[]> {
  return listStored(query);
}

export async function openSolicitation(solicitationNumber: string): Promise<SolicitationBrief> {
  return openStored(solicitationNumber);
}
