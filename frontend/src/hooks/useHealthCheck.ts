import { useEffect, useState } from 'react';
import { fetchHealth } from '../services/api';
import type { ApiFailure, HealthPayload } from '../types/api';

type HealthState =
  | { status: 'loading' }
  | { status: 'success'; data: HealthPayload; message: string }
  | { status: 'error'; message: string };

export function useHealthCheck(): HealthState {
  const [state, setState] = useState<HealthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetchHealth()
      .then((payload) => {
        if (cancelled) return;
        if (payload.success) {
          setState({ status: 'success', data: payload.data, message: payload.message });
          return;
        }
        const failure = payload as ApiFailure;
        setState({ status: 'error', message: failure.message });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: 'Cannot reach the API. Confirm the backend is running on port 4000.'
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
