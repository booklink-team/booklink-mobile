import React, { useCallback, useRef, useState } from "react";
import { FeedbackDialog } from "./FeedbackDialog";
import { DialogContext, DialogAction, DialogOptions } from "./dialogContext";
export { useDialogs } from "./dialogContext";

type DialogEntry = DialogOptions & { id: number };

export function DialogProvider({ children }: React.PropsWithChildren) {
  const [queue, setQueue] = useState<DialogEntry[]>([]);
  const entries = useRef<DialogEntry[]>([]);
  const sequence = useRef(0);
  const showDialog = useCallback((options: DialogOptions) => {
    entries.current = [...entries.current, { ...options, id: ++sequence.current }];
    setQueue(entries.current);
  }, []);
  const dismissDialogs = useCallback(() => {
    entries.current = [];
    setQueue([]);
  }, []);
  const showError = useCallback((error: Error, uncertain: boolean, title = "Операция не выполнена") => {
    showDialog({
      title: uncertain ? "Результат пока неизвестен" : title,
      message: uncertain
        ? "Ответ не получен. Проверяем состояние на сервере. Запрос повторно не отправляется."
        : error.message,
      tone: uncertain ? "warning" : "error",
    });
  }, [showDialog]);
  const current = queue[0];
  function finish(action?: DialogAction) {
    // Remove before running the action: repeated taps cannot confirm twice.
    if (!current || entries.current[0]?.id !== current.id) return;
    entries.current = entries.current.slice(1);
    setQueue(entries.current);
    action?.onPress?.();
  }
  return <DialogContext.Provider value={{ showDialog, showError, dismissDialogs }}>
    {children}
    {current ? <FeedbackDialog key={current.id} visible close={() => finish()}
      title={current.title} message={current.message} tone={current.tone} clock={current.clock}
      primary={{ title: current.primary?.title ?? "Понятно", destructive: current.primary?.destructive, onPress: () => finish(current.primary) }}
      secondary={current.secondary ? { title: current.secondary.title, onPress: () => finish(current.secondary) } : undefined} /> : null}
  </DialogContext.Provider>;
}
