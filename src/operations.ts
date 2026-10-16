import { Reservation, Loan } from "./types";

export interface OperationReader {
  get<T>(path: string): Promise<T>;
}

// Persist only enough information to READ the result after a timeout/restart.
// A changing request is sent once. Recovery never sends it again.
export type Operation =
  | { kind: "reserve"; bookId: number; beforeIds: number[] }
  | { kind: "cancel" | "issue"; id: number }
  | { kind: "renew"; id: number; count: number; dueAt: string };

export function operationRequest(op: Operation): [string, string, unknown?] {
  switch (op.kind) {
    case "reserve":
      return ["/reservations", "POST", { bookId: op.bookId }];
    case "cancel":
      return [`/reservations/${op.id}/cancel`, "POST"];
    case "issue":
      return [`/librarian/reservations/${op.id}/issue`, "POST"];
    case "renew":
      return [`/loans/${op.id}/renew`, "POST"];

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
    case "issue":
      return (
        (await api.get<Reservation>(`/librarian/reservations/${op.id}`))
          .status === "Completed"
      );
    case "renew":
      return (await api.get<Loan[]>("/loans/my")).some(
        (r) =>
          r.id === op.id &&
          r.renewalCount > op.count &&
          Date.parse(r.dueAt) > Date.parse(op.dueAt),
      );

  }
}
