import { Icon } from "@repo/ui";

const icons = {
  box: "solar:box-bold-duotone",
  card: "solar:card-bold-duotone",
  collapse: "solar:alt-arrow-left-line-duotone",
  globe: "solar:shop-bold-duotone",
  grid: "solar:widget-5-bold-duotone",
  inventory: "solar:clipboard-list-bold-duotone",
  menu: "solar:hamburger-menu-line-duotone",
  orders: "solar:bag-4-bold-duotone",
  settings: "solar:settings-bold-duotone",
  share: "solar:share-bold-duotone",
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
