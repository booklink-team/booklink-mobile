export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const offsets = new Map<string, number>();

export function normalizeApiUrl(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); }
  catch { throw new Error('Укажите полный адрес API с /api.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/+$/, '') !== '/api') {
    throw new Error('Введите адрес API с /api, без пароля, параметров и #.');
  }
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '10.0.2.2', '[::1]'].includes(url.hostname)) {
    throw new Error('Для удалённого сервера нужен HTTPS. HTTP разрешён только для локальной разработки.');
  }
  return url.toString().replace(/\/+$/, '');
}

export class Api {
  constructor(public server: string, private token?: string, private timeout = 12000) {}
  now() { return Date.now() + (offsets.get(this.server) ?? 0); }
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const address = normalizeApiUrl(this.server);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(address + path, {
        method, signal: controller.signal, credentials: 'omit', redirect: 'error',
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const date = response.headers.get('Date');
      if (date && Number.isFinite(Date.parse(date))) offsets.set(this.server, Date.parse(date) - Date.now());
      if (!response.ok) {
        throw new ApiError(response.status === 401
          ? (path === '/auth/login' ? 'Неверный логин или пароль.' : 'Сеанс завершён. Войдите снова.')
          : response.status === 403 ? 'Доступ запрещён.' : `Сервер ответил: HTTP ${response.status}. Повторите позже.`, response.status);
      }
      if (response.status === 204) return undefined as T;
      try { return await response.json() as T; }
      catch { throw new ApiError('Сервер вернул некорректный ответ.'); }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Ответ API не получен. Проверьте подключение и адрес сервера.');
    } finally { clearTimeout(timer); }
  }
}

export async function checkConnection(server: string): Promise<string> {
  try { await new Api(server).request('/auth/me'); return 'API ответил. Соединение установлено.'; }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) return 'API ответил: HTTP 401. Соединение установлено; требуется вход.';
    throw error;
  }
}
