import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useSession } from "./session";
import { ScreenActivity } from "./screenActivity";
import type { Api } from "./api";

// A screen owns its data. Old responses cannot overwrite a newer search or account.
export function useResource<T>(path: string, loader?: (api: Api) => Promise<T>) {
  const { api, revision } = useSession();
  const active = useContext(ScreenActivity);
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const value = loader ? await loader(api) : await api.get<T>(path);
      if (request === generation.current) setData(value);
    } catch (e) {
      if (request === generation.current) setError((e as Error).message);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [api, path, loader]);
  useEffect(() => {
    setData(undefined);
    return () => {
      generation.current++;
    };
  }, [reload]);
  useEffect(() => {
    if (!active) return;
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload, revision, active]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (s) => {
      if (s === "active" && active) void reload();
    });
    return () => listener.remove();
  }, [reload, active]);
  return { data, error, loading, reload };
}
export function useSearch() {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);
  return { text, setText, query };
}
