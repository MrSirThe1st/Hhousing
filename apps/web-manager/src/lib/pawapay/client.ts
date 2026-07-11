import type { PawapayProviderCode } from "@hhousing/domain";
import { formatPawapayAmount } from "./amount";
import { readPawapayConfig } from "./config";
import type {
  PawapayDepositInitiationResponse,
  PawapayDepositStatusResponse
} from "./types";

export interface InitiatePawapayDepositInput {
  depositId: string;
  amount: number;
  currencyCode: string;
  provider: PawapayProviderCode;
  phoneNumber: string;
}

export class PawapayClientError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number
  ) {
    super(message);
    this.name = "PawapayClientError";
  }
}

async function pawapayRequest<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const config = readPawapayConfig();
  if (!config) {
    throw new PawapayClientError("PAWAPAY_API_TOKEN is not configured");
  }

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    throw new PawapayClientError(
      `PawaPay request failed (${response.status})`,
      response.status
    );
  }

  if (payload === null) {
    throw new PawapayClientError("PawaPay returned an empty response");
  }

  return payload;
}

export async function initiatePawapayDeposit(
  input: InitiatePawapayDepositInput
): Promise<PawapayDepositInitiationResponse> {
  return pawapayRequest<PawapayDepositInitiationResponse>("/v2/deposits", {
    method: "POST",
    body: JSON.stringify({
      depositId: input.depositId,
      amount: formatPawapayAmount(input.amount, input.provider),
      currency: input.currencyCode,
      payer: {
        type: "MMO",
        accountDetails: {
          phoneNumber: input.phoneNumber,
          provider: input.provider
        }
      }
    })
  });
}

export async function getPawapayDepositStatus(
  depositId: string
): Promise<PawapayDepositStatusResponse> {
  return pawapayRequest<PawapayDepositStatusResponse>(`/v2/deposits/${depositId}`, {
    method: "GET"
  });
}
