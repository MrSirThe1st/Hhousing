export type PawapayDepositInitiationStatus = "ACCEPTED" | "REJECTED" | "DUPLICATE_IGNORED";

export type PawapayDepositFinalStatus =
  | "COMPLETED"
  | "FAILED"
  | "PROCESSING"
  | "SUBMITTED"
  | "ACCEPTED";

export interface PawapayFailureReason {
  failureCode?: string;
  failureMessage?: string;
}

export interface PawapayDepositInitiationResponse {
  depositId: string;
  status: PawapayDepositInitiationStatus;
  created?: string;
  failureReason?: PawapayFailureReason;
}

export interface PawapayDepositStatusResponse {
  depositId: string;
  status: PawapayDepositFinalStatus;
  requestedAmount?: string;
  currency?: string;
  country?: string;
  failureReason?: PawapayFailureReason;
}

export interface PawapayDepositCallbackPayload {
  depositId: string;
  status: string;
  requestedAmount?: string;
  currency?: string;
  country?: string;
  failureReason?: PawapayFailureReason;
}

export interface PawapayPublicKeyRecord {
  id: string;
  algorithm: string;
  publicKey: string;
}

export interface PawapayPublicKeysResponse {
  keys?: PawapayPublicKeyRecord[];
}
