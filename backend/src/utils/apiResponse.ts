export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiFailure = {
  success: false;
  message: string;
  code: string;
  requestId?: string;
};

export function ok<T>(data: T, message = 'OK'): ApiSuccess<T> {
  return { success: true, message, data };
}

export function fail(message: string, code: string, requestId?: string): ApiFailure {
  if (requestId) {
    return { success: false, message, code, requestId };
  }
  return { success: false, message, code };
}
