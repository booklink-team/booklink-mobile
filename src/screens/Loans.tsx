import React, { useContext, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useDialogs } from "../dialogs";
import { ActionSheet } from "../ActionSheet";
import { ScreenActivity } from "../screenActivity";
import { Navigation } from "../navigation";
import { date, overdue, overdueDays } from "../dates";
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
  const { api, mutate, busy, pending } = useSession();
  const { showDialog, showError } = useDialogs();
  const [history, setHistory] = useState(0);
  const [menuId, setMenuId] = useState<number | null>(null);
  const activeScreen = useContext(ScreenActivity);
  const resource = useResource<Loan[]>(
    "/loans/my",
  );
  const locked = busy || !!pending || resource.loading || !!resource.error;
  const menuLoan = resource.data?.find(loan => loan.id === menuId && loan.status === "Active");
  const count = resource.data?.filter((l) => l.status === "Active").length ?? 0;
  const items = resource.data?.filter(
    (l) =>
      history ? l.status === "Returned" : l.status === "Active",
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
    (
      <StudentLoanCard key={loan.id} loan={loan} now={api.now()} nav={nav}
        disabled={locked} openMenu={() => setMenuId(loan.id)} />
    ),
  ) : [];
  return (
    <Screen
      rows={rows}
      title="Мои книги"
      refreshing={resource.loading && !!resource.data}
      onRefresh={() => void resource.reload()}
    >
        <Segments
          selected={history}
          options={[`Действующие (${count})`, "История"]}
          onChange={setHistory}
        />
      <LoadState
        loading={resource.loading && !resource.data}
        variant="books"
        error={resource.error}
        data={resource.data}
        retry={() => void resource.reload()}
      />
      <ActionSheet visible={activeScreen && !history && !!menuLoan}
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
          {!items?.length ? (
            <Empty
              text={
                history
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

