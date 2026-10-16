import { ListDetails, Loan, ReadingList, Reservation } from "./types";

export interface OperationReader {
  get<T>(path: string): Promise<T>;
}

// Persist only enough information to READ the result after a timeout/restart.
// A changing request is sent once. Recovery never sends it again.
export type Operation =
  | { kind: "reserve"; bookId: number; beforeIds: number[] }
  | { kind: "cancel" | "issue" | "return"; id: number }
  | { kind: "renew"; id: number; count: number; dueAt: string }
  | { kind: "createList"; name: string; beforeIds: number[] }
  | { kind: "renameList"; id: number; name: string }
  | { kind: "deleteList"; id: number }
  | { kind: "addBook" | "removeBook"; id: number; bookId: number };

export function operationRequest(op: Operation): [string, string, unknown?] {
  switch (op.kind) {
    case "reserve":
      return ["/reservations", "POST", { bookId: op.bookId }];
    case "cancel":
      return [`/reservations/${op.id}/cancel`, "POST"];
    case "issue":
      return [`/librarian/reservations/${op.id}/issue`, "POST"];
    case "return":
      return [`/librarian/loans/${op.id}/return`, "POST"];
    case "renew":
      return [`/loans/${op.id}/renew`, "POST"];
    case "createList":
      return ["/lists", "POST", { name: op.name }];
    case "renameList":
      return [`/lists/${op.id}`, "PUT", { name: op.name }];
    case "deleteList":
      return [`/lists/${op.id}`, "DELETE"];
    case "addBook":
      return [`/lists/${op.id}/books`, "POST", { bookId: op.bookId }];
    case "removeBook":
      return [`/lists/${op.id}/books/${op.bookId}`, "DELETE"];
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
    case "return":
      return (
        (await api.get<Loan>(`/librarian/loans/${op.id}`)).status === "Returned"
      );
    case "renew":
      return (await api.get<Loan[]>("/loans/my")).some(
        (r) =>
          r.id === op.id &&
          r.renewalCount > op.count &&
          Date.parse(r.dueAt) > Date.parse(op.dueAt),
      );
    case "createList":
      return (await api.get<ReadingList[]>("/lists")).some(
        (r) =>
          r.name.toLocaleLowerCase() === op.name.toLocaleLowerCase() &&
          !op.beforeIds.includes(r.id),
      );
    case "renameList":
      return (await api.get<ListDetails>(`/lists/${op.id}`)).name === op.name;
    case "deleteList":
      return !(await api.get<ReadingList[]>("/lists")).some(
        (r) => r.id === op.id,
      );
    case "addBook":
      return (await api.get<ListDetails>(`/lists/${op.id}`)).books.some(
        (b) => b.id === op.bookId,
      );
    case "removeBook":
      return !(await api.get<ListDetails>(`/lists/${op.id}`)).books.some(
        (b) => b.id === op.bookId,
      );
  }
}
