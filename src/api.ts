export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public unknown = false,
    public code?: string,
  ) {
    super(message);
  }
}

// A deployed address must be supplied by the backend owner, never guessed.
export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || "";
const serverOffsets = new Map<string, number>();
export function normalizeApiUrl(value: string): string {
  if (!value.trim()) throw new Error("Сервер приложения не настроен. Обратитесь в библиотеку.");
  const url = new URL(value.trim().replace(/\/+$/, ""));
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("Введите адрес HTTP или HTTPS без пароля, параметров и #.");
  }
  if (url.protocol === "http:" && !["localhost", "127.0.0.1", "10.0.2.2", "[::1]"].includes(url.hostname))
    throw new Error("Для сервера требуется HTTPS. HTTP разрешён только для локальной разработки.");
  return url.toString().replace(/\/+$/, "");
}

export class Api {
  constructor(
    public baseUrl: string,
    private token?: string,
    private onExpired?: () => void,
    private timeout = 12000,
  ) {}
  now() {
    return Date.now() + (serverOffsets.get(this.baseUrl) ?? 0);
  }
  async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    // Also guard old saved settings, before a password or JWT reaches fetch.
    const address = normalizeApiUrl(this.baseUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    const mutation = method !== "GET";
    try {
      const response = await fetch(address + path, {
        method,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const serverDate = response.headers.get("Date");
      if (serverDate && Number.isFinite(Date.parse(serverDate)))
        serverOffsets.set(this.baseUrl, Date.parse(serverDate) - Date.now());
      if (response.status === 401 && this.token) this.onExpired?.();
      if (!response.ok) {
        const problem = (await response.json().catch(() => ({}))) as {
          detail?: string;
          code?: string;
          errors?: Record<string, string[]>;
        };
        const detail =
          problem.detail ||
          (problem.errors && Object.values(problem.errors).flat().join("\n"));
        throw new ApiError(
          detail ||
            {
              401: "Сеанс завершён. Войдите снова.",
              403: "Эта операция недоступна вашей роли.",
              404: "Запись не найдена.",
              409: "Операция отклонена сервером.",
            }[response.status] ||
            "Сервер временно недоступен.",
          response.status,
          mutation && response.status >= 500,
          problem.code,
        );
      }
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        mutation
          ? "Ответ не получен. Результат операции уточняется на сервере."
          : "Нет ответа сервера. Проверьте подключение и адрес API.",
        0,
        mutation,
      );
    } finally {
      clearTimeout(timer);
    }
  }
  get<T>(path: string) {
    return this.request<T>(path);
  }
}
