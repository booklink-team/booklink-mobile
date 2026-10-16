import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Api } from "./api";
import { AuthController } from "./auth";

const SESSION_KEY = "booklink.s2.session";
const SERVER_KEY = "booklink.s1.server";
const Context = createContext<AuthController | null>(null);

export function SessionProvider({ children }: React.PropsWithChildren) {
  const [controller] = useState(() => new AuthController({
    read: () => SecureStore.getItemAsync(SESSION_KEY),
    write: value => SecureStore.setItemAsync(SESSION_KEY, value),
    remove: () => SecureStore.deleteItemAsync(SESSION_KEY),
    readServer: () => AsyncStorage.getItem(SERVER_KEY),
    writeServer: value => AsyncStorage.setItem(SERVER_KEY, value),
  }));
  useEffect(() => { void controller.restore(); }, [controller]);
  useEffect(() => {
    const timer = setInterval(controller.checkExpiry, 1000);
    const listener = AppState.addEventListener("change", state => {
      if (state === "active") controller.checkExpiry();
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, [controller]);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
}

export function useSession() {
  const controller = useContext(Context);
  if (!controller) throw new Error("SessionProvider missing");
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const api = useMemo(() => {
    const token = state.session?.accessToken;
    return new Api(state.server, token, () => {
      if (token) void controller.expireSession(token);
    });
  }, [state.server, state.session?.accessToken, controller]);
  return {
    ...state,
    api,
    revision: 0,
    restoreError: state.restoreError ? state.error : "",
    login: async (login: string, password: string) => {
      await controller.login(login, password);
      const error = controller.getState().error;
      if (error) throw new Error(error);
    },
    logout: controller.logout,
    restore: controller.restore,
  };
}
