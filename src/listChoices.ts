import type { OperationReader } from "./operations";
import type { ListDetails, ReadingList } from "./types";

export type ListChoice = ReadingList & { containsBook: boolean };

export async function loadListChoices(api: OperationReader, bookId: number): Promise<ListChoice[]> {
  const lists = await api.get<ReadingList[]>("/lists");
  return Promise.all(lists.map(async list => ({
    ...list,
    containsBook: list.bookCount > 0 && (await api.get<ListDetails>(`/lists/${list.id}`)).books.some(book => book.id === bookId),
  })));
}
