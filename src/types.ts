// Names and statuses match the backend DTOs and Swagger (12.10.2026).
export type User = {
  id: number;
  name: string;
  login: string;
  role: "Student" | "Librarian";
};
export type Session = { accessToken: string; expiresAt: string; user: User };
export type BookShort = {
  id: number;
  title: string;
  authors: string;
  coverUrl: string | null;
};
export type BookItem = BookShort & {
  year: number | null;
  availableCopies: number;
};
export type Book = BookItem & {
  description: string | null;
  totalCopies: number;
  reservationForbidden: boolean;
  renewalForbidden: boolean;
};
export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
export type Reader = { id: number; name: string; login: string };
export type Reservation = {
  id: number;
  book: BookShort;
  inventoryNumber: string;
  createdAt: string;
  expiresAt: string;
  status: "Active" | "Cancelled" | "Expired" | "Completed";
  reader: Reader | null;
};
export type Loan = {
  id: number;
  book: BookShort;
  inventoryNumber: string;
  issuedAt: string;
  dueAt: string;
  returnedAt: string | null;
  renewalCount: number;
  status: "Active" | "Returned";
  isOverdue: boolean;
  canRenew: boolean;
  renewalDenyReason: string | null;
  renewedDueAt: string | null;
  reader: Reader | null;
};
