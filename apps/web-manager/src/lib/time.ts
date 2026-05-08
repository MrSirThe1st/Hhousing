function parseFakeNow(rawValue: string): Date | null {
  const normalized = rawValue.trim();
  if (normalized.length === 0) {
    return null;
  }

  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T00:00:00.000Z`)
    : new Date(normalized);

  if (Number.isNaN(candidate.getTime())) {
    return null;
  }

  return candidate;
}

export function getNow(): Date {
  if (process.env.NODE_ENV === "production") {
    return new Date();
  }

  const fakeNow = process.env.HHOUSING_FAKE_NOW ?? process.env.FAKE_NOW;
  if (!fakeNow) {
    return new Date();
  }

  const parsed = parseFakeNow(fakeNow);
  return parsed ?? new Date();
}
