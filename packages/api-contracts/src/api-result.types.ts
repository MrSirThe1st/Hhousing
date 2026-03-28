export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; code: string; error: string };
