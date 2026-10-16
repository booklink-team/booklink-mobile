import { createContext, useContext } from "react";
import type { DialogTone } from "./FeedbackDialog";

export type DialogAction = { title: string; onPress?: () => void; destructive?: boolean };
export type DialogOptions = {
  title: string;
  message: string;
  tone?: DialogTone;
  clock?: boolean;
  primary?: DialogAction;
  secondary?: DialogAction;
};
type Dialogs = {
  showDialog: (options: DialogOptions) => void;
  showError: (error: Error, uncertain: boolean, title?: string) => void;
  dismissDialogs: () => void;
};
export const DialogContext = createContext<Dialogs | null>(null);

export function useDialogs() {
  const dialogs = useContext(DialogContext);
  if (!dialogs) throw new Error("DialogProvider missing");
  return dialogs;
}
