import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Api, ApiError, DEFAULT_API_URL } from "./api";
import { Operation, operationRequest, verifyOperation } from "./operations";
import { Session, User } from "./types";
import { Pending, PendingJournal } from "./pendingJournal";
import { useDialogs } from "./dialogContext";

type Context = {
  api: Api;
  server: string;
  session: Session | null;
  ready: boolean;
  restoreError: string;
  notice: string;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  busy: boolean;
  pending: Pending | null;
  checking: boolean;
  revision: number;
  mutate: (
    prepare: () => Promise<Operation> | Operation,
    success: string | ((result: unknown) => void),
    onError?: (error: Error, uncertain: boolean) => void,
  ) => Promise<boolean>;
  checkPending: () => Promise<void>;
  dismissPending: () => void;
};
const SessionContext = createContext<Context | null>(null);
const SESSION_KEY = "booklink.session";
const PENDING_KEY = "booklink.pending";
let storageQueue: Promise<unknown> = Promise.resolve();
function saveSecure(key: string, value: unknown) {
  const next = storageQueue
    .catch(() => {})
    .then(() =>
      value === null
        ? SecureStore.deleteItemAsync(key)
        : SecureStore.setItemAsync(key, JSON.stringify(value)),
    );
  storageQueue = next;
  return next;
}

export function SessionProvider({ children }: React.PropsWithChildren) {
  const { showDialog, showError, dismissDialogs } = useDialogs();
  const [journal] = useState(() => new PendingJournal({
    read: () => SecureStore.getItemAsync(PENDING_KEY),
    write: value => SecureStore.setItemAsync(PENDING_KEY, value),
  }));
  const [server, setServerState] = useState(DEFAULT_API_URL);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [checking, setChecking] = useState(false);
  const [revision, setRevision] = useState(0);
  const current = useRef<Session | null>(null);
  const epoch = useRef(0);
  const lock = useRef(false);
  const checkingRef = useRef(false);
  const pendingRef = useRef<Pending | null>(null);

  const clear = useCallback(async (message = "") => {
    dismissDialogs();
    epoch.current++;
    current.current = null;
    pendingRef.current = null;
    setSession(null);
    setPending(null);
    setRestoreError("");
    setReady(true);
    setNotice(message);
    setRevision((r) => r + 1);
    await saveSecure(SESSION_KEY, null);
  }, [dismissDialogs]);
  const api = useMemo(
    () =>
      new Api(server, session?.accessToken, () => {
        if (current.current?.accessToken === session?.accessToken)
          void clear("Сеанс завершён. Войдите снова.");
      }),
    [server, session?.accessToken, clear],
  );

  const restoreAt = useCallback(
    async (address: string, saved: Session) => {
      const version = epoch.current;
      setRestoreError("");
      setReady(false);
      try {
        const restoredApi = new Api(address, saved.accessToken);
        const user = await restoredApi.get<User>("/auth/me");
        if (epoch.current !== version) return;
        if (Date.parse(saved.expiresAt) <= restoredApi.now()) {
          await clear("Сеанс завершён. Войдите снова.");
          return;
        }
        const validated = { ...saved, user };
        const item = await journal.find(user.id, address);
        if (epoch.current !== version) return;
        pendingRef.current = item;
        setPending(item);
        current.current = validated;
        setSession(validated);
        setReady(true);
      } catch (error) {
        if (epoch.current !== version) return;
        if (error instanceof ApiError && error.status === 401)
          await clear("Сеанс завершён. Войдите снова.");
        else {
          current.current = saved;
          setRestoreError((error as Error).message);
          setReady(true);
        }
      }
    },
    [clear, journal],
  );

  useEffect(() => {
    void (async () => {
      try {
        const address =
          (await AsyncStorage.getItem("booklink.server")) || DEFAULT_API_URL;
        setServerState(address);
        const raw = await SecureStore.getItemAsync(SESSION_KEY);
        const saved: Session | null = raw ? JSON.parse(raw) : null;
        if (
          saved?.accessToken &&
          saved?.user &&
          Number.isFinite(Date.parse(saved.expiresAt))
        ) {
          await restoreAt(address, saved);
        } else {
          await clear();
        }
      } catch {
        await clear("Не удалось восстановить сеанс. Войдите снова.");
      }
    })();
  }, [clear, restoreAt]);

  useEffect(() => {
    if (!session) return;
    const expire = () => {
      if (Date.parse(session.expiresAt) <= api.now())
        void clear("Сеанс завершён. Войдите снова.");
    };
    const timer = setInterval(expire, 1000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") expire();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [session, clear, api]);

  async function login(login: string, password: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const version = ++epoch.current;
    try {
      const result = await new Api(server).request<Session>(
        "/auth/login",
        "POST",
        { login: login.trim(), password },
      );
      if (epoch.current !== version) return;
      if (!["Student", "Librarian"].includes(result.user.role))
        throw new Error("Неизвестная роль пользователя.");
      if (Date.parse(result.expiresAt) <= api.now())
        throw new Error("Сервер вернул истёкший сеанс. Войдите снова.");
      const item = await journal.find(result.user.id, server);
      await saveSecure(SESSION_KEY, result);
      if (epoch.current !== version) return;
      pendingRef.current = item;
      setPending(item);
      current.current = result;
      setSession(result);
      setNotice("");
      setRestoreError("");
      setReady(true);
      setRevision((r) => r + 1);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function logout() {
    const oldApi = api;
    await clear();
    // Stateless server logout is best-effort; local credentials have already been removed.
    void oldApi.request("/auth/logout", "POST").catch(() => {});
  }
  async function checkPending() {
    const item = pendingRef.current;
    if (
      !item ||
      checkingRef.current ||
      !current.current ||
      item.userId !== current.current.user.id ||
      item.server !== server
    )
      return;
    checkingRef.current = true;
    setChecking(true);
    const version = epoch.current;
    try {
      const confirmed = await verifyOperation(api, item.operation);
      if (epoch.current !== version) return;
      setRevision((r) => r + 1);
      if (confirmed) {
        await journal.remove(item);
        if (epoch.current !== version) return;
        pendingRef.current = null;
        setPending(null);
        showDialog({ title: "Результат подтверждён", message: "Состояние получено с сервера. Данные обновлены." });
      }
    } catch {
      /* Keep uncertainty visible until a successful server read. */
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }
  useEffect(() => {
    if (!pending || !session) return;
    const timer = setInterval(() => void checkPending(), 15000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkPending();
    });
    void checkPending();
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [pending, session, api]);

  async function mutate(
    prepare: () => Promise<Operation> | Operation,
    success: string | ((result: unknown) => void),
    onError?: (error: Error, uncertain: boolean) => void,
  ) {
    if (lock.current || pendingRef.current || !current.current) return false;
    lock.current = true;
    setBusy(true);
    const version = epoch.current;
    let sent = false;
    let item: Pending | null = null;
    let result: unknown;
    let failure: { error: Error; uncertain: boolean } | undefined;
    try {
      const operation = await prepare();
      if (epoch.current !== version || !current.current) return false;
      item = { userId: current.current.user.id, server, operation };
      // Persist BEFORE sending so an interrupted app can reconcile on next launch.
      await journal.save(item);
      if (epoch.current !== version) return false;
      pendingRef.current = item;
      sent = true;
      result = await api.request(...operationRequest(operation));
      if (epoch.current !== version) return false;
      await journal.remove(item);
      if (epoch.current !== version) return false;
      pendingRef.current = null;
      setPending(null);
      setRevision((r) => r + 1);
    } catch (error) {
      if (epoch.current !== version) return false;
      if (sent && (!(error instanceof ApiError) || error.unknown)) {
        setPending(pendingRef.current);
        failure = { error: error as Error, uncertain: true };
      } else {
        if (sent && item) {
          try { await journal.remove(item); }
          catch {
            if (epoch.current === version) {
              setPending(item);
              showDialog({ title: "Не удалось сохранить результат", message: "Проверьте состояние операции на сервере.", tone: "warning" });
            }
            return false;
          }
        }
        if (epoch.current !== version) return false;
        pendingRef.current = null;
        setPending(null);
        failure = { error: error as Error, uncertain: false };
        setRevision((r) => r + 1);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
    if (failure) {
      if (onError) onError(failure.error, failure.uncertain);
      else showError(failure.error, failure.uncertain);
      return false;
    }
    // UI presentation happens after the operation is committed and unlocked.
    if (typeof success === "string") showDialog({ title: "Готово", message: success });
    else success(result);
    return true;
  }
  function dismissPending() {
    const item = pendingRef.current;
    const version = epoch.current;
    if (!item) return;
    showDialog({
      title: "Снять блокировку?", tone: "warning",
      message: "Сначала проверьте бронь, выдачу или список. Результат не подтверждён: повторная операция может создать дубликат. При сомнениях уточните у библиотекаря.",
      secondary: { title: "Продолжить проверку" },
      primary: {
          title: "Состояние проверено",
          onPress: () => {
            if (epoch.current !== version || pendingRef.current !== item) return;
            void journal.remove(item).then(() => {
              if (epoch.current !== version) return;
              pendingRef.current = null;
              setPending(null);
              setRevision((r) => r + 1);
            }).catch(() => showDialog({ title: "Не удалось сохранить результат", message: "Повторите проверку операции.", tone: "error" }));
          },
        },
    });
  }
  const value: Context = {
    api,
    server,
    session,
    ready,
    restoreError,
    notice,
    busy,
    pending,
    checking,
    revision,
    login,
    logout,
    restore: async () => {
      if (current.current) await restoreAt(server, current.current);
    },
    mutate,
    checkPending,
    dismissPending,
  };
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider missing");
  return value;
}
