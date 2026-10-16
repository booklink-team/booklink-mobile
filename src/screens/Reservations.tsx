import React, { useContext, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useDialogs } from "../dialogs";
import { ActionSheet } from "../ActionSheet";
import { ScreenActivity } from "../screenActivity";
import { Navigation } from "../navigation";
import { date, reservationSearch } from "../dates";
import { useResource, useSearch } from "../resource";
import { useSession } from "../session";
import { Reservation } from "../types";
import { RecordDate as ReservationDate, DetailRow as ReservationDetailRow } from "../RecordDetails";
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

const labels: Record<Reservation["status"], string> = {
  Active: "Активна",
  Cancelled: "Отменена",
  Expired: "Истекла",
  Completed: "Завершена выдачей",
};
export function Reservations({ nav }: { nav: Navigation }) {
  const { session, api, mutate, busy, pending } = useSession();
  const { showDialog, showError } = useDialogs();
  const librarian = session?.user.role === "Librarian";
  const search = useSearch();
  const [archive, setArchive] = useState(0);
  const [menuId, setMenuId] = useState<number | null>(null);
  const activeScreen = useContext(ScreenActivity);
  const resource = useResource<Reservation[]>(
    librarian
      ? `/librarian/reservations?search=${encodeURIComponent(reservationSearch(search.query))}`
      : "/reservations/my",
  );
  const activeCount =
    resource.data?.filter((r) => r.status === "Active").length ?? 0;
  const items = resource.data?.filter(
    (r) =>
      librarian || (archive ? r.status !== "Active" : r.status === "Active"),
  );
  const menuReservation = resource.data?.find(r => r.id === menuId && r.status === "Active");
  const locked = busy || !!pending || resource.loading || !!resource.error;
  function cancel(r: Reservation) {
    showDialog({
      title: "Отменить бронь?", tone: "warning",
      message: `Бронь B-${r.id} на «${r.book.title}» будет отменена, экземпляр освободится.`,
      primary: { title: "Отменить бронь", destructive: true, onPress: () => void mutate(
        () => ({ kind: "cancel", id: r.id }),
        () => showDialog({ title: "Бронь отменена", message: `Бронь B-${r.id} на «${r.book.title}» отменена.` }),
        (error, uncertain) => showError(error, uncertain, "Не удалось отменить бронь"),
      ) },
      secondary: { title: "Не отменять" },
    });
  }
  return (
    <Screen
      title={librarian ? "Бронирования" : "Мои брони"}
      refreshing={resource.loading && !!resource.data}
      onRefresh={() => void resource.reload()}
    >
      {librarian ? (
        <SearchField
          placeholder="Читатель или ID брони"
          value={search.text}
          onChangeText={search.setText}
        />
      ) : (
        <Segments
          selected={archive}
          options={[`Активные (${activeCount})`, "Архив"]}
          onChange={setArchive}
        />
      )}
      <LoadState
        loading={resource.loading && !resource.data}
        variant="books"
        error={resource.error}
        data={resource.data}
        retry={() => void resource.reload()}
      />
      {resource.data ? (
        <>
          <Muted>
            {librarian
              ? `Найдено активных броней: ${items?.length}`
              : archive
                ? "Завершённые, отменённые и истёкшие брони"
                : `Активных броней: ${activeCount} из 3`}
          </Muted>
          {!items?.length ? (
            <Empty
              text={
                librarian
                  ? "Подходящих активных броней нет."
                  : archive
                    ? "Архив броней пока пуст."
                    : "У вас пока нет активных броней."
              }
            />
          ) : (
            items.map((r) =>
              librarian ? (
                <LibrarianReservationCard key={r.id} reservation={r} now={api.now()}
                  open={() => nav.push({ screen: "reservation", id: r.id })} />
              ) : (
                <StudentReservationCard key={r.id} reservation={r} nav={nav} now={api.now()}
                  disabled={locked} openMenu={() => setMenuId(r.id)} />
              ),
            )
          )}
        </>
      ) : null}
      <ActionSheet visible={activeScreen && !librarian && !archive && !!menuReservation}
        title={`Бронь B-${menuReservation?.id ?? ""}`} subtitle={menuReservation?.book.title}
        close={() => setMenuId(null)} actions={[{
          title: "Отменить бронь", icon: "close", danger: true, disabled: locked,
          onPress: () => {
            if (locked || !menuReservation) return;
            setMenuId(null);
            cancel(menuReservation);
          },
        }]} />
    </Screen>
  );
}
function LibrarianReservationCard({ reservation, now, open }: {
  reservation: Reservation; now: number; open: () => void;
}) {
  const { colors } = useTheme();
  const expired = reservation.status === "Expired" || (reservation.status === "Active" && Date.parse(reservation.expiresAt) <= now);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Бронь B-${reservation.id}`}
    accessibilityHint="Открыть подробности брони для выдачи книги" onPress={open}
    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Txt style={{ fontSize: 13, fontWeight: "700", color: colors.muted }}>Бронь B-{reservation.id}</Txt>
        <Status text={expired ? "Срок истёк" : labels[reservation.status]}
          tone={expired ? "warning" : reservation.status === "Cancelled" ? "neutral" : "success"} />
      </View>
      <BookHeading book={reservation.book} />
      <View style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 10, gap: 3 }}>
        <Txt style={{ fontSize: 11, color: colors.muted }}>Читатель</Txt>
        <Txt style={{ fontSize: 14, fontWeight: "700" }}>{reservation.reader?.name ?? "Не указан"}</Txt>
        {reservation.reader?.login ? <Txt style={{ fontSize: 12, color: colors.muted }}>{reservation.reader.login}</Txt> : null}
      </View>
      <ReservationDates reservation={reservation} expired={expired} />
    </Card>
  </Pressable>;
}

function StudentReservationCard({ reservation, nav, now, disabled, openMenu }: {
  reservation: Reservation;
  nav: Navigation;
  now: number;
  disabled: boolean;
  openMenu: () => void;
}) {
  const { colors } = useTheme();
  const expired = reservation.status === "Expired" || (reservation.status === "Active" && Date.parse(reservation.expiresAt) <= now);
  return <Card>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <Txt style={{ flex: 1, fontSize: 13, fontWeight: "700", color: colors.muted }}>Бронь B-{reservation.id}</Txt>
      {reservation.status !== "Active" || expired ? <Status text={expired ? "Срок истёк" : labels[reservation.status]}
        tone={expired ? "warning" : reservation.status === "Cancelled" ? "neutral" : "success"} /> : null}
      {reservation.status === "Active" ? <Pressable accessibilityRole="button"
        accessibilityLabel={`Действия с бронью B-${reservation.id}`} accessibilityState={{ disabled }}
        disabled={disabled} onPress={openMenu} hitSlop={6}
        style={({ pressed }) => ({ width: 40, height: 32, marginVertical: -6, marginRight: -8,
          alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}>
        <Icon name="more" color={colors.muted} />
      </Pressable> : null}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={reservation.book.title}
      onPress={() => nav.push({ screen: "book", id: reservation.book.id })}>
      <BookHeading book={reservation.book} />
    </Pressable>
    <ReservationDates reservation={reservation} expired={expired} />
  </Card>;
}

function ReservationDates({ reservation, expired }: { reservation: Reservation; expired: boolean }) {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / fontScale < 340;
  return <View style={{ flexDirection: stacked ? "column" : "row", gap: 12, borderTopWidth: 1, borderColor: colors.line, paddingTop: 10 }}>
      <View style={{ flex: stacked ? undefined : 1 }}>
        <ReservationDate label="Создана" value={reservation.createdAt} />
      </View>
      <View style={{ flex: stacked ? undefined : 1, borderLeftWidth: stacked ? 0 : 1, borderColor: colors.line, paddingLeft: stacked ? 0 : 12 }}>
        <ReservationDate label={reservation.status === "Active" ? "Получить до" : "Срок получения"} value={reservation.expiresAt}
          prominent={reservation.status === "Active"} bad={expired} />
      </View>
    </View>;
}

export function ReservationDetail({
  id,
  nav,
}: {
  id: number;
  nav: Navigation;
}) {
  const resource = useResource<Reservation>(`/librarian/reservations/${id}`);
  const { api, mutate, busy, pending } = useSession();
  const { showDialog, showError } = useDialogs();
  const reservation = resource.data;
  const { colors, dark } = useTheme();
  const expired = !!reservation && (reservation.status === "Expired" ||
    (reservation.status === "Active" && Date.parse(reservation.expiresAt) <= api.now()));
  function confirmIssue() {
    if (!reservation || reservation.status !== "Active" || Date.parse(reservation.expiresAt) <= api.now() ||
      busy || pending || resource.loading || resource.error) return;
    showDialog({
      title: "Подтвердить выдачу?", tone: "info",
      message: `Экземпляр ${reservation.inventoryNumber} книги «${reservation.book.title}» будет выдан читателю ${reservation.reader?.name ?? ""} на 14 дней.`,
      primary: { title: "Подтвердить выдачу", onPress: () => void issue() },
      secondary: { title: "Отмена" },
    });
  }
  async function issue() {
    if (
      await mutate(
        () => ({ kind: "issue", id }),
        "Выдача подтверждена. Книга появилась у читателя.",
        (error, uncertain) => showError(error, uncertain, "Выдача невозможна"),
      )
    )
      nav.back();
  }
  return (
    <Screen
      title={`Бронь B-${id}`}
      back={nav.back}
      refreshing={resource.loading && !!reservation}
      onRefresh={() => void resource.reload()}
      footer={reservation?.status === "Active" ? <Button title="Подтвердить выдачу" icon="check"
        loading={busy} disabled={!!pending || !!resource.error || resource.loading || expired}
        onPress={confirmIssue} /> : undefined}
    >
      <LoadState
        loading={resource.loading && !reservation}
        error={resource.error}
        data={resource.data}
        retry={() => void resource.reload()}
      />
      {reservation ? (
        <>
          <BookHeading book={reservation.book}>
            <Status text={expired ? "Срок истёк" : labels[reservation.status]}
              tone={expired ? "warning" : reservation.status === "Cancelled" ? "neutral" : "success"} />
          </BookHeading>
          <View style={{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 2 }}>
            <ReservationDetailRow label="Читатель" value={reservation.reader?.name ?? "Не указан"} />
            <ReservationDetailRow label="Идентификатор" value={`B-${reservation.id}`} />
            <ReservationDetailRow label="Экземпляр" value={reservation.inventoryNumber} />
            <ReservationDetailRow label="Создана" value={date(reservation.createdAt)} />
            <ReservationDetailRow label="Срок действия" value={`${date(reservation.expiresAt)} МСК`} last />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.info, borderRadius: 10, padding: 12 }}>
            <Icon name="readerCard" color={dark ? "#82B1FF" : "#246BE3"} />
            <Txt style={{ flex: 1, fontSize: 12 }}>Проверьте личность читателя по читательскому билету перед выдачей.</Txt>
          </View>
          {reservation.status !== "Active" ? <Muted>Эта бронь уже завершена и недоступна для выдачи.</Muted> : null}
        </>
      ) : null}
    </Screen>
  );
}

