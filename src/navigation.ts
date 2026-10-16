export type Tab = "catalog" | "account";
export type Route =
  | { screen: Tab }
  | { screen: "book"; id: number };
export type Navigation = {
  push: (route: Route) => void;
  back: () => void;
  tab: (tab: Tab) => void;
};
export type RouteEntry = { key: number; route: Route };
export function backFrom(routes: RouteEntry[], origin: number) {
  return routes.length > 1 && routes[routes.length - 1].key === origin
    ? routes.slice(0, -1)
    : routes;
}
