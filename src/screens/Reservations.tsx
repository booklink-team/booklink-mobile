import React, { useContext, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useDialogs } from "../dialogs";
import { ActionSheet } from "../ActionSheet";
import { ScreenActivity } from "../screenActivity";
import { Navigation } from "../navigation";
import { date } from "../dates";
import { useResource } from "../resource";
import { useSession } from "../session";
import { Reservation } from "../types";
import { RecordDate as ReservationDate } from "../RecordDetails";
import {
  BookHeading,
  Button,
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

const labels: Record<Reservation["status"], string> = {
  Active: "Активна",
  Cancelled: "Отменена",
  Expired: "Истекла",
  Completed: "Завершена выдачей",
};
export function Reservations({ nav }: { nav: Navigation }) {
  const { api, mutate, busy, pending } = useSession();
  const { showDialog, showError } = useDialogs();
  const [archive, setArchive] = useState(0);
  const [menuId, setMenuId] = useState<number | null>(null);
  const activeScreen = useContext(ScreenActivity);
  const resource = useResource<Reservation[]>(
    "/reservations/my",
  );
  const activeCount =
    resource.data?.filter((r) => r.status === "Active").length ?? 0;
  const items = resource.data?.filter(
    (r) =>
      archive ? r.status !== "Active" : r.status === "Active",
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
      title="Мои брони"
      refreshing={resource.loading && !!resource.data}
      onRefresh={() => void resource.reload()}
    >
        <Segments
          selected={archive}
          options={[`Активные (${activeCount})`, "Архив"]}
          onChange={setArchive}
        />
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
            {archive
                ? "Завершённые, отменённые и истёкшие брони"
                : `Активных броней: ${activeCount} из 3`}
          </Muted>
          {!items?.length ? (
            <Empty
              text={
                archive
                    ? "Архив броней пока пуст."
                    : "У вас пока нет активных броней."
              }
            />
          ) : (
            items.map((r) => (
              <StudentReservationCard key={r.id} reservation={r} nav={nav} now={api.now()}
                disabled={locked} openMenu={() => setMenuId(r.id)} />
            ))
          )}
        </>
      ) : null}
      <ActionSheet visible={activeScreen && !archive && !!menuReservation}
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

