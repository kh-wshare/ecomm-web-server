import type { ProductStatus } from "@/types/product";
import { Chip } from "@heroui/react/chip";

export function ProductStatusBadge({ status }: { status: ProductStatus }) {

  const statusColorMap: Record<string, "success" | "danger" | "warning"> = {
    ACTIVE: "success",
    DRAFT: "warning",
    INACTIVE: "danger",
    "On Leave": "warning",
  };

  return (
    <Chip color={statusColorMap[status]} size="sm" variant="soft">
      {status}
    </Chip>
  );
}
