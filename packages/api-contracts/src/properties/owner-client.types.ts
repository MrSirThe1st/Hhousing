import type { OwnerClient } from "@hhousing/domain";

export interface CreateOwnerClientInput {
  organizationId: string;
  name: string;
}

export interface CreateOwnerClientOutput {
  client: OwnerClient;
}

export interface ListOwnerClientsOutput {
  clients: OwnerClient[];
}