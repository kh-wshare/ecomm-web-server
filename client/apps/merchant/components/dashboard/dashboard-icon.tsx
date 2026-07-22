import { Icon } from "@repo/ui";

const icons = {
  bell: "solar:bell-bold-duotone",
  box: "solar:box-bold-duotone",
  card: "solar:card-bold-duotone",
  chevronDown: "solar:alt-arrow-down-line-duotone",
  collapse: "solar:alt-arrow-left-line-duotone",
  globe: "solar:shop-bold-duotone",
  grid: "solar:widget-5-bold-duotone",
  inventory: "solar:clipboard-list-bold-duotone",
  location: "solar:map-point-bold-duotone",
  logout: "solar:logout-2-bold-duotone",
  menu: "solar:hamburger-menu-line-duotone",
  orders: "solar:bag-4-bold-duotone",
  settings: "solar:settings-bold-duotone",
  share: "solar:share-bold-duotone",
  tag: "solar:tag-bold-duotone",
  user: "solar:user-rounded-bold-duotone",
};

export type DashboardIconName = keyof typeof icons;

export function DashboardIcon({
  className,
  name,
}: {
  className?: string;
  name: DashboardIconName;
}) {
  return <Icon className={className} icon={icons[name]} width={20} />;
}
