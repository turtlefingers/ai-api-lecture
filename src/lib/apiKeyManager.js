const STORAGE_KEY  = 'api_key';
const STORAGE_META = 'api_key_meta';
const TTL_MS       = 30 * 24 * 60 * 60 * 1000;  // 30일
const INACTIVITY_MS = 30 * 60 * 1000;            // 30분

const validators = {
  gemini:    (k) => /^AIza[0-9A-Za-z\-_]{35}$/.test(k),
  default:   (k) => k.trim().length >= 10,
};

export const ApiKeyManager = (() => {
  let _key = null;           // 런타임 메모리
  let _timer = null;

  const maskKey = (k) =>
    k.length > 8 ? `${k.slice(0, 4)}${'•'.repeat(12)}${k.slice(-4)}` : '••••••••';

  const clearKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_META);
    _key = null;
    clearTimeout(_timer);
  };

  const resetInactivity = () => {
    clearTimeout(_timer);
    _timer = setTimeout(() => { _key = null; }, INACTIVITY_MS);
  };

  const load = (service = 'gemini') => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const meta   = JSON.parse(localStorage.getItem(STORAGE_META) ?? '{}');
      if (!stored || !meta.savedAt) return { key: null, status: 'empty' };
      if (Date.now() - meta.savedAt > TTL_MS) {
        clearKey();
        return { key: null, status: 'expired' };
      }
      _key = stored;
      resetInactivity();
      return { key: stored, status: 'ok' };
    } catch {
      clearKey();
      return { key: null, status: 'error' };
    }
  };

  const save = (rawKey, service = 'gemini') => {
    const key = rawKey.trim();
    const validate = validators[service] ?? validators.default;
    if (!validate(key)) return { ok: false, error: '유효하지 않은 API Key 형식입니다. (AIza로 시작)' };
    try {
      localStorage.setItem(STORAGE_KEY, key);
      localStorage.setItem(STORAGE_META, JSON.stringify({ savedAt: Date.now(), service }));
      _key = key;
      resetInactivity();
      return { ok: true };
    } catch {
      return { ok: false, error: '저장 실패: 브라우저 저장 공간을 확인하세요.' };
    }
  };

  const getKey = () => _key || load().key;  // 메모리에 없으면 로컬스토리지 시도

  return { load, save, clearKey, getKey, maskKey };
})();
