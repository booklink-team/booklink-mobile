import { Reservation } from "./types";

export interface OperationReader {
  get<T>(path: string): Promise<T>;
}

// Persist only enough information to READ the result after a timeout/restart.
// A changing request is sent once. Recovery never sends it again.
export type Operation =
  | { kind: "reserve"; bookId: number; beforeIds: number[] }
  | { kind: "cancel"; id: number };

export function operationRequest(op: Operation): [string, string, unknown?] {
  switch (op.kind) {
    case "reserve":
      return ["/reservations", "POST", { bookId: op.bookId }];
    case "cancel":
      return [`/reservations/${op.id}/cancel`, "POST"];

  }
}
export async function verifyOperation(
  api: OperationReader,
  op: Operation,
): Promise<boolean> {
  switch (op.kind) {
    case "reserve":
      return (await api.get<Reservation[]>("/reservations/my")).some(
        (r) => r.book.id === op.bookId && !op.beforeIds.includes(r.id),
      );
    case "cancel":
      return (await api.get<Reservation[]>("/reservations/my")).some(
        (r) => r.id === op.id && r.status === "Cancelled",
      );

  }
}
