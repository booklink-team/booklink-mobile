import { Api, ApiError, DEFAULT_API_URL, normalizeApiUrl } from './api';

export type User = { id: number; name: string; login: string; role: 'Student' | 'Librarian' };
export type Session = { accessToken: string; expiresAt: string; user: User };
type StoredSession = { server: string; accessToken: string; expiresAt: string };
export type AuthStorage = {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
  remove: () => Promise<void>;
  readServer: () => Promise<string | null>;
  writeServer: (value: string) => Promise<void>;
};
export type AuthState = {
  server: string; session: Session | null; ready: boolean; busy: boolean;
  notice: string; error: string; restoreError: boolean;
};
function user(value: unknown): User {
  const result = value as Partial<User> | null;
  if (!result || !Number.isInteger(result.id) || Number(result.id) <= 0 || typeof result.name !== 'string' || typeof result.login !== 'string' || !['Student', 'Librarian'].includes(String(result.role))) {
    throw new Error('Сервер вернул неподдерживаемую учётную запись или роль.');
  }
  return result as User;
}
function stored(value: unknown): StoredSession {
  const result = value as Partial<StoredSession> | null;
  if (!result || typeof result.server !== 'string' || typeof result.accessToken !== 'string' || !result.accessToken || typeof result.expiresAt !== 'string' || !Number.isFinite(Date.parse(result.expiresAt))) {
    throw new Error('Повреждённый сеанс. Войдите снова.');
  }
  return result as StoredSession;
}

export class AuthController {
  private state: AuthState = { server: DEFAULT_API_URL, session: null, ready: false, busy: false, notice: '', error: '', restoreError: false };
  private listeners = new Set<() => void>();
  private epoch = 0;
  private storageQueue: Promise<unknown> = Promise.resolve();
  constructor(private storage: AuthStorage) {}
  getState = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private patch(value: Partial<AuthState>) { this.state = { ...this.state, ...value }; this.listeners.forEach(listener => listener()); }
  private secure<T>(action: () => Promise<T>): Promise<T> {
    const next = this.storageQueue.catch(() => {}).then(action);
    this.storageQueue = next;
    return next;
  }
  private async run(action: () => Promise<void>) {
    if (this.state.busy) return;
    this.patch({ busy: true, error: '' });
    try { await action(); }
    catch (error) { this.patch({ error: error instanceof Error ? error.message : 'Не удалось выполнить действие.' }); }
    finally { this.patch({ busy: false, ready: true }); }
  }
  private async invalidate(message: string) {
    const version = ++this.epoch;
    this.patch({ session: null, notice: message, restoreError: false });
    try { await this.secure(() => this.storage.remove()); }
    catch { if (this.epoch === version) this.patch({ error: 'Не удалось очистить защищённое хранилище. Повторите выход.' }); }
  }
  restore = () => this.run(async () => {
    this.patch({ ready: false, restoreError: false });
    const address = (await this.storage.readServer()) || DEFAULT_API_URL;
    this.patch({ server: address });
    const raw = await this.secure(() => this.storage.read());
    if (!raw) return;
    let saved: StoredSession;
    try {
      saved = stored(JSON.parse(raw));
      if (normalizeApiUrl(saved.server) !== normalizeApiUrl(address)) throw new Error('Server changed');
    } catch { await this.invalidate('Сохранённый сеанс недоступен. Укажите сервер и войдите снова.'); return; }
    const version = this.epoch;
    const api = new Api(address, saved.accessToken);
    try {
      const account = user(await api.request('/auth/me'));
      if (this.epoch !== version) return;
      if (Date.parse(saved.expiresAt) <= api.now()) { await this.invalidate('Сеанс завершён. Войдите снова.'); return; }
      this.patch({ session: { accessToken: saved.accessToken, expiresAt: saved.expiresAt, user: account }, notice: '' });
    } catch (error) {
      if (this.epoch !== version) return;
      if (error instanceof ApiError && error.status === 401) await this.invalidate('Сеанс завершён. Войдите снова.');
      else this.patch({ session: null, restoreError: true, error: error instanceof Error ? error.message : 'Не удалось проверить сеанс.' });
    }
  });
  login = (login: string, password: string) => this.run(async () => {
    if (!login.trim() || !password) throw new Error('Введите логин и пароль.');
    const api = new Api(this.state.server);
    const result = await api.request<Session>('/auth/login', 'POST', { login: login.trim(), password });
    const account = user(result?.user);
    const saved = stored({ server: normalizeApiUrl(this.state.server), accessToken: result.accessToken, expiresAt: result.expiresAt });
    if (Date.parse(saved.expiresAt) <= api.now()) throw new Error('Сервер вернул истёкший сеанс. Войдите снова.');
    try { await this.secure(() => this.storage.write(JSON.stringify(saved))); }
    catch { throw new Error('Не удалось сохранить сеанс в защищённом хранилище. Войдите снова.'); }
    this.epoch++;
    this.patch({ session: { accessToken: saved.accessToken, expiresAt: saved.expiresAt, user: account }, notice: '', restoreError: false });
  });
  logout = () => this.run(async () => {
    const old = this.state;
    try { await this.secure(() => this.storage.remove()); }
    catch { throw new Error('Не удалось очистить защищённое хранилище. Повторите выход.'); }
    this.epoch++;
    this.patch({ session: null, notice: 'Вы вышли из аккаунта.', restoreError: false });
    if (old.session) void new Api(old.server, old.session.accessToken).request('/auth/logout', 'POST').catch(() => {});
  });
  setServer = (value: string) => this.run(async () => {
    const address = normalizeApiUrl(value);
    if (address === this.state.server) return;
    try { await this.secure(() => this.storage.remove()); }
    catch { throw new Error('Не удалось очистить прежний сеанс. Адрес не изменён.'); }
    this.epoch++;
    this.patch({ session: null, restoreError: false, notice: '' });
    try { await this.storage.writeServer(address); }
    catch { throw new Error('Не удалось сохранить адрес сервера. Повторите сохранение.'); }
    this.patch({ server: address, notice: 'Адрес изменён. Войдите в аккаунт этого сервера.' });
  });
  refresh = () => this.run(async () => {
    const current = this.state.session;
    if (!current) return;
    const version = this.epoch;
    try {
      const account = user(await new Api(this.state.server, current.accessToken).request('/auth/me'));
      if (this.epoch === version) this.patch({ session: { ...current, user: account }, notice: 'Сеанс подтверждён сервером.' });
    } catch (error) {
      if (this.epoch !== version) return;
      if (error instanceof ApiError && error.status === 401) await this.invalidate('Сеанс завершён. Войдите снова.');
      else throw error;
    }
  });
  expireSession = async (token: string) => {
    if (this.state.session?.accessToken === token) await this.invalidate('Сеанс завершён. Войдите снова.');
  };
  checkExpiry = () => {
    const current = this.state.session;
    if (current && Date.parse(current.expiresAt) <= new Api(this.state.server).now()) void this.invalidate('Сеанс завершён. Войдите снова.');
  };
}
