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
};
export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
