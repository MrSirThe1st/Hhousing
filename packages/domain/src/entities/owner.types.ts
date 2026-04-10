export type OwnerType = "organization" | "client";

export interface Owner {
  id: string;
  organizationId: string;
  name: string;
  fullName: string;
  ownerType: OwnerType;
  userId: string | null;
  address: string | null;
  isCompany: boolean;
  companyName: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  createdAtIso: string;
}

export type OwnerClient = Owner;