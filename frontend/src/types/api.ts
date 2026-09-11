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

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type HealthPayload = {
  status: 'ok' | 'degraded' | 'unavailable';
  database: {
    connected: boolean;
  };
};
