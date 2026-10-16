import React from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { Navigation } from "../navigation";
import { overdue, overdueDays } from "../dates";
import { RecordDate } from "../RecordDetails";
import { useResource } from "../resource";
import { useSession } from "../session";
import { Loan } from "../types";
import {
  BookHeading,
  Card,
  Empty,
  Icon,
  LoadState,
  Muted,
  Screen,
  Status,
  Txt,
  useTheme,
} from "../ui";

function LoanStatus({ loan, showDays = false }: { loan: Loan; showDays?: boolean }) {
  const { api } = useSession();
  const bad = overdue(loan.dueAt, loan.status, api.now());
  const days = showDays ? overdueDays(loan.dueAt, loan.status, api.now()) : null;
  const overdueText = days !== null && days > 0 ? `Просрочена на ${days} дн.` : "Просрочена";
  return (
    <Status
      text={
        loan.status === "Returned"
          ? "Возвращена"
          : bad
            ? overdueText
            : "Действует"
      }
      bad={bad}
    />
  );
}
export function Loans({ nav }: { nav: Navigation }) {
  const { api } = useSession();
  const resource = useResource<Loan[]>(
    "/loans/my",
  );
  const count = resource.data?.filter((l) => l.status === "Active").length ?? 0;
  const items = resource.data?.filter(
    (l) =>
      l.status === "Active",
  );
  const rows = items ? items.map((loan) =>
    (
      <StudentLoanCard key={loan.id} loan={loan} now={api.now()} nav={nav}
        />
    ),
  ) : [];
  return (
    <Screen
      rows={rows}
      title="Мои книги"
      refreshing={resource.loading && !!resource.data}
      onRefresh={() => void resource.reload()}
    >
      <Muted>Действующих выдач: {count}</Muted>
      <LoadState
        loading={resource.loading && !resource.data}
        variant="books"
        error={resource.error}
        data={resource.data}
        retry={() => void resource.reload()}
      />
      {resource.data ? (
        <>
          {!items?.length ? (
            <Empty
              text={
                "У вас пока нет выданных книг."
              }
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
function StudentLoanCard({ loan, now, nav }: {
  loan: Loan; now: number; nav: Navigation;
}) {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / fontScale < 340;
  const bad = overdue(loan.dueAt, loan.status, now);
  const dates = [
    { label: "Выдана", value: loan.issuedAt, prominent: false },
    { label: "Вернуть до", value: loan.dueAt, prominent: true, bad },
  ];
  return <Card>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <Txt style={{ flexGrow: 1, flexShrink: 1, fontSize: 13, fontWeight: "700", color: colors.muted }}>Выдача №{loan.id}</Txt>
      {bad ? <LoanStatus loan={loan} showDays /> : null}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={loan.book.title}
      onPress={() => nav.push({ screen: "book", id: loan.book.id })}>
      <BookHeading book={loan.book} />
    </Pressable>
    <View style={{ flexDirection: stacked ? "column" : "row", gap: 12, borderTopWidth: 1, borderColor: colors.line, paddingTop: 10 }}>
      {dates.map((field, index) => <View key={field.label} style={{ flex: stacked ? undefined : 1,
        borderLeftWidth: !stacked && index > 0 ? 1 : 0, borderColor: colors.line, paddingLeft: !stacked && index > 0 ? 12 : 0 }}>
        <RecordDate {...field} />
      </View>)}
    </View>
  </Card>;
}

