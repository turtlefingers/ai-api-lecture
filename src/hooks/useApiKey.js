import { useState, useEffect, useCallback } from 'react';
import { ApiKeyManager } from '../lib/apiKeyManager';

export function useApiKey(service = 'gemini') {
  const [keyState, setKeyState] = useState({ key: null, status: 'empty' });
  const [error, setError] = useState(null);

  useEffect(() => {
    const result = ApiKeyManager.load(service);
    setKeyState(result);
  }, [service]);

  const save = useCallback((raw) => {
    const result = ApiKeyManager.save(raw, service);
    if (result.ok) {
      setKeyState({ key: ApiKeyManager.getKey(), status: 'ok' });
      setError(null);
    } else {
      setError(result.error ?? null);
    }
    return result.ok;
  }, [service]);

  const clear = useCallback(() => {
    ApiKeyManager.clearKey();
    setKeyState({ key: null, status: 'empty' });
  }, []);

  return { ...keyState, error, save, clear };
}
