import type { TFunction } from "i18next";

type UserFacingErrorInput = {
  code?: string | null;
  error?: string | null;
  offline?: boolean;
  t: TFunction;
};

export type UserFacingErrorCopy = {
  title: string;
  body: string;
};

function looksTechnical(message: string): boolean {
  return (
    /content-type|unexpected server|invalid api|stack|exception|ECONN|ETIMEDOUT|fetch failed/i
      .test(message)
    || message.length > 160
  );
}

export function userFacingError(input: UserFacingErrorInput): UserFacingErrorCopy {
  const { code, error, offline, t } = input;

  if (offline || code === "NETWORK_ERROR") {
    return {
      title: t("errors.networkTitle"),
      body: t("errors.networkBody")
    };
  }

  if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
    return {
      title: t("errors.sessionTitle"),
      body: t("errors.sessionBody")
    };
  }

  if (
    error
    && /authentication required|not authenticated|session expired|jwt expired|invalid jwt/i.test(
      error
    )
  ) {
    return {
      title: t("errors.sessionTitle"),
      body: t("errors.sessionBody")
    };
  }

  if (code === "NOT_FOUND") {
    return {
      title: t("errors.notFoundTitle"),
      body: t("errors.notFoundBody")
    };
  }

  if (code === "GONE") {
    return {
      title: t("errors.goneTitle"),
      body: t("errors.goneBody")
    };
  }

  if (error && !looksTechnical(error)) {
    return {
      title: t("errors.genericTitle"),
      body: error
    };
  }

  return {
    title: t("errors.genericTitle"),
    body: t("errors.genericBody")
  };
}

export function userFacingErrorMessage(input: UserFacingErrorInput): string {
  return userFacingError(input).body;
}
