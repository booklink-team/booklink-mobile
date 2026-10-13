export const DEFAULT_API_URL = 'http://213.226.112.230:6776/api';
export function normalizeApiUrl(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); }
  catch { throw new Error('Введите полный адрес HTTP или HTTPS с /api.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/+$/, '') !== '/api') {
    throw new Error('Введите адрес HTTP или HTTPS с /api, без пароля, параметров и #.');
  }
  return url.toString().replace(/\/+$/, '');
}
// Existing protected BooksController endpoint. No login or stored credentials.
export async function checkConnection(server: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(normalizeApiUrl(server) + '/books?page=1', {
      method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal,
      credentials: 'omit', redirect: 'error',
    });
    if (response.status === 401) return 'API ответил: HTTP 401. Соединение установлено; для данных требуется вход (задача №2).';
    if (response.ok) { await response.json(); return `API ответил: HTTP ${response.status}, получен JSON.`; }
    return `Сервер ответил: HTTP ${response.status}. Проверьте адрес и состояние API.`;
  } catch { throw new Error('Ответ API не получен. Проверьте адрес, подключение и доступность сервера; затем повторите проверку.'); }
  finally { clearTimeout(timer); }
}
