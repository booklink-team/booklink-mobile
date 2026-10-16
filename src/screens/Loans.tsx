import React, { useContext, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useDialogs } from "../dialogs";
import { ActionSheet } from "../ActionSheet";
import { ScreenActivity } from "../screenActivity";
import { Navigation } from "../navigation";
import { date, overdue, overdueDays } from "../dates";
import { DetailRow, RecordDate } from "../RecordDetails";
import { useResource, useSearch } from "../resource";
import { useSession } from "../session";
import { Loan } from "../types";
import {
  BookHeading,
  Button,
  Card,
  Empty,
  Icon,
  LoadState,
  Muted,
  Screen,
  SearchField,
  Segments,
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
  const { session, api, mutate, busy, pending } = useSession();
  const { showDialog, showError } = useDialogs();
  const librarian = session?.user.role === "Librarian";
  const search = useSearch();
  const [history, setHistory] = useState(0);
  const [menuId, setMenuId] = useState<number | null>(null);
  const activeScreen = useContext(ScreenActivity);
  const resource = useResource<Loan[]>(
    librarian
      ? `/librarian/loans?search=${encodeURIComponent(search.query)}`
      : "/loans/my",
  );
  const locked = busy || !!pending || resource.loading || !!resource.error;
  const menuLoan = resource.data?.find(loan => loan.id === menuId && loan.status === "Active");
  const count = resource.data?.filter((l) => l.status === "Active").length ?? 0;
  const items = resource.data?.filter(
    (l) =>
      librarian || (history ? l.status === "Returned" : l.status === "Active"),
  );
  function renew(loan: Loan) {
    if (!loan.canRenew || locked) return;
    showDialog({
      title: "Продлить выдачу?", tone: "info", clock: true,
      message: `«${loan.book.title}». Срок возврата изменится с ${date(loan.dueAt)} на ${date(loan.renewedDueAt)} (МСК). Продлить можно только один раз.`,
      primary: { title: "Продлить", onPress: () => void mutate(
        () => ({ kind: "renew", id: loan.id, count: loan.renewalCount, dueAt: loan.dueAt }),
        "Продление подтверждено. Новый срок получен с сервера.",
        (error, uncertain) => showError(error, uncertain, "Не удалось продлить выдачу"),
      ) },
      secondary: { title: "Отмена" },
    });
  }
  const rows = items ? items.map((loan) =>
    librarian ? (
      <LibrarianLoanCard key={loan.id} loan={loan} now={api.now()}
        open={() => nav.push({ screen: "loan", id: loan.id })} />
    ) : (
      <StudentLoanCard key={loan.id} loan={loan} now={api.now()} nav={nav}
        disabled={locked} openMenu={() => setMenuId(loan.id)} />
    ),
  ) : [];
  return (
    <Screen
      rows={rows}
      title={librarian ? "Выдачи" : "Мои книги"}
      refreshing={resource.loading && !!resource.data}
      onRefresh={() => void resource.reload()}
    >
      {librarian ? (
        <SearchField
          placeholder="Читатель, книга или инв. номер"
          value={search.text}
          onChangeText={search.setText}
        />
      ) : (
        <Segments
          selected={history}
          options={[`Действующие (${count})`, "История"]}
          onChange={setHistory}
        />
      )}
      <LoadState
        loading={resource.loading && !resource.data}
        variant="books"
        error={resource.error}
        data={resource.data}
        retry={() => void resource.reload()}
      />
      <ActionSheet visible={activeScreen && !librarian && !history && !!menuLoan}
        title={`Выдача №${menuLoan?.id ?? ""}`}
        subtitle={menuLoan ? menuLoan.canRenew ? menuLoan.book.title
          : `${menuLoan.book.title}\n${menuLoan.renewalDenyReason || "Продление недоступно по правилам библиотеки."}` : undefined}
        close={() => setMenuId(null)} actions={[{
          title: menuLoan?.canRenew ? "Продлить на 7 дней" : "Продление недоступно", icon: "renew",
          disabled: locked || !menuLoan?.canRenew,
          onPress: () => {
            if (!menuLoan || !menuLoan.canRenew || locked) return;
            setMenuId(null);
            renew(menuLoan);
          },
        }]} />
      {resource.data ? (
        <>
          {librarian ? (
            <Muted>Найдено действующих выдач: {items?.length}</Muted>
          ) : null}
          {!items?.length ? (
            <Empty
              text={
                librarian
                  ? "Подходящих действующих выдач нет."
                  : history
                    ? "История возвратов пока пуста."
                    : "У вас пока нет выданных книг."
              }
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
function StudentLoanCard({ loan, now, nav, disabled, openMenu }: {
  loan: Loan; now: number; nav: Navigation; disabled: boolean; openMenu: () => void;
}) {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / fontScale < 340;
  const returned = loan.status === "Returned";
  const bad = overdue(loan.dueAt, loan.status, now);
  const dates = [
    { label: "Выдана", value: loan.issuedAt, prominent: false },
    { label: "Вернуть до", value: loan.dueAt, prominent: !returned, bad },
    ...(returned ? [{ label: "Возвращена", value: loan.returnedAt ?? "", prominent: true }] : []),
  ];
  return <Card>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <Txt style={{ flexGrow: 1, flexShrink: 1, fontSize: 13, fontWeight: "700", color: colors.muted }}>Выдача №{loan.id}</Txt>
      {returned || bad ? <LoanStatus loan={loan} showDays /> : null}
      {!returned ? <Pressable accessibilityRole="button" accessibilityLabel={`Действия с выдачей №${loan.id}`}
        accessibilityState={{ disabled }} disabled={disabled} onPress={openMenu} hitSlop={6}
        style={({ pressed }) => ({ width: 40, height: 32, marginVertical: -6, marginRight: -8,
          alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}>
        <Icon name="more" color={colors.muted} />
      </Pressable> : null}
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
    {!returned ? <View style={{ gap: 4 }}>
      <Txt style={{ fontSize: 12, color: colors.muted }}>Продлений: {loan.renewalCount} из 1</Txt>
      {!loan.canRenew ? <Txt style={{ fontSize: 12, color: colors.muted }}>{loan.renewalDenyReason || "Продление недоступно по правилам библиотеки."}</Txt> : null}
    </View> : null}
  </Card>;
}

function LibrarianLoanCard({ loan, now, open }: { loan: Loan; now: number; open: () => void }) {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / fontScale < 340;
  const bad = overdue(loan.dueAt, loan.status, now);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Выдача ${loan.id}`}
    accessibilityHint="Открыть подробности выдачи и приём возврата" onPress={open}
    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Txt style={{ fontSize: 13, fontWeight: "700", color: colors.muted }}>Выдача №{loan.id}</Txt>
        <LoanStatus loan={loan} showDays />
      </View>
      <BookHeading book={loan.book} />
      <View style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 10, gap: 3 }}>
        <Txt style={{ fontSize: 11, color: colors.muted }}>Читатель</Txt>
        <Txt style={{ fontSize: 14, fontWeight: "700" }}>{loan.reader?.name ?? "Не указан"}</Txt>
        <Txt style={{ fontSize: 12, color: colors.muted }}>{loan.reader?.login ? `${loan.reader.login} · ` : ""}{loan.inventoryNumber}</Txt>
      </View>
      <View style={{ flexDirection: stacked ? "column" : "row", gap: 12, borderTopWidth: 1, borderColor: colors.line, paddingTop: 10 }}>
        <View style={{ flex: stacked ? undefined : 1 }}><RecordDate label="Выдана" value={loan.issuedAt} /></View>
        <View style={{ flex: stacked ? undefined : 1, borderLeftWidth: stacked ? 0 : 1, borderColor: colors.line, paddingLeft: stacked ? 0 : 12 }}>
          <RecordDate label={loan.status === "Returned" ? "Возвращена" : "Вернуть до"}
            value={loan.status === "Returned" ? loan.returnedAt ?? "" : loan.dueAt} prominent bad={bad} />
        </View>
      </View>
    </Card>
  </Pressable>;
}

export function LoanDetail({ id, nav }: { id: number; nav: Navigation }) {
  const resource = useResource<Loan>(`/librarian/loans/${id}`);
  const { api, mutate, busy, pending } = useSession();
  const { showDialog, showError } = useDialogs();
  const loan = resource.data;
  const { colors } = useTheme();
  const bad = !!loan && overdue(loan.dueAt, loan.status, api.now());
  function confirmReturn() {
    if (!loan || loan.status !== "Active" || busy || pending || resource.loading || resource.error) return;
    showDialog({
      title: "Принять возврат?", tone: "info",
      message: `«${loan.book.title}», ${loan.inventoryNumber}. Выдача будет завершена, экземпляр станет доступным. Подтвердите, что книга получена от читателя.`,
      primary: { title: "Подтвердить возврат", onPress: () => void receive() },
      secondary: { title: "Отмена" },
    });
  }
  async function receive() {
    if (
      await mutate(
        () => ({ kind: "return", id }),
        "Возврат подтверждён. Экземпляр снова доступен.",
        (error, uncertain) => showError(error, uncertain, "Не удалось принять возврат"),
      )
    )
      nav.back();
  }
  return (
    <Screen
      title={`Выдача №${id}`}
      back={nav.back}
      refreshing={resource.loading && !!loan}
      onRefresh={() => void resource.reload()}
      footer={loan?.status === "Active" ? <Button title="Подтвердить возврат" icon="check" loading={busy}
        disabled={!!pending || !!resource.error || resource.loading} onPress={confirmReturn} /> : undefined}
    >
      <LoadState
        loading={resource.loading && !loan}
        error={resource.error}
        data={resource.data}
        retry={() => void resource.reload()}
      />
      {loan ? (
        <>
          <BookHeading book={loan.book}>
            <LoanStatus loan={loan} showDays />
          </BookHeading>
          <View style={{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 2 }}>
            <DetailRow label="Читатель" value={loan.reader?.name ?? "Не указан"} />
            <DetailRow label="Экземпляр" value={loan.inventoryNumber} />
            <DetailRow label="Выдана" value={`${date(loan.issuedAt)} МСК`} />
            <DetailRow label="Срок возврата" value={`${date(loan.dueAt)} МСК`} bad={bad} />
            <DetailRow label="Продлений" value={`${loan.renewalCount} из 1`} last={!loan.returnedAt} />
            {loan.returnedAt ? <DetailRow label="Возвращена" value={`${date(loan.returnedAt)} МСК`} last /> : null}
          </View>
          {loan.status !== "Active" ? <Muted>Возврат уже подтверждён.</Muted> : null}
        </>
      ) : null}
    </Screen>
  );
}
