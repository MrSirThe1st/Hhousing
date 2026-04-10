import type { Owner } from "@hhousing/domain";

export interface CreateOwnerInput {
  organizationId: string;
  fullName: string;
  address?: string | null;
  isCompany: boolean;
  companyName?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  phoneNumber?: string | null;
  profilePictureUrl?: string | null;
}

export interface CreateOwnerOutput {
  owner: Owner;
}

export interface ListOwnersOutput {
  owners: Owner[];
}

export type CreateOwnerClientInput = CreateOwnerInput;
export interface CreateOwnerClientOutput {
  client: Owner;
}

export interface ListOwnerClientsOutput {
  clients: Owner[];
}