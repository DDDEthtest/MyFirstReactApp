import { useCallback, useState } from 'react';

type AsyncState<T> = {
  loading: boolean;
  error: Error | null;
  data: T | null;
};

export function useAsync<T, A extends any[]>(fn: (...args: A) => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ loading: false, error: null, data: null });

  const run = useCallback(async (...args: A) => {
    setState({ loading: true, error: null, data: null });
    try {
      const res = await fn(...args);
      setState({ loading: false, error: null, data: res });
      return res;
    } catch (e: any) {
      setState({ loading: false, error: e, data: null });
      throw e;
    }
  }, [fn]);

  return { ...state, run };
}

