import type { DashboardInventoryStock } from "@/types/dashboard";
import type { InventoryMovementRecord } from "@/types/inventory";
import { DateTimeText } from "@repo/ui";
import { StockStatusBadge } from "@/components/products/product-editor-fields";

export function StockMovementTimeline({
  movements,
}: {
  movements: InventoryMovementRecord[];
}) {
  return (
    <ol className="relative ml-2 border-l border-separator">
      {movements.map((movement) => (
        <li className="relative pb-6 pl-7 last:pb-0" key={movement.id}>
          <span
            className={`absolute -left-2 top-1 size-4 rounded-full ring-4 ring-surface ${
              movement.quantity < 0 ? "bg-danger" : "bg-success"
            }`}
          />
          <div className="flex flex-col gap-2 rounded-xl bg-surface-secondary p-4 sm:flex-row sm:justify-between">
            <div>
              <p className="font-semibold">{movement.productName}</p>
              <p className="mt-1 text-xs text-muted">
                {movement.productSku} · {humanize(movement.type)}
              </p>
            </div>
            <div className="sm:text-right">
              <p
                className={`font-bold ${
                  movement.quantity < 0 ? "text-danger" : "text-success"
                }`}
              >
                {movement.quantity > 0 ? "+" : ""}
                {movement.quantity}
              </p>
              <DateTimeText
                className="mt-1 block text-[10px] text-muted"
                value={movement.createdAt}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function LowStockWarning({ stock }: { stock: DashboardInventoryStock }) {
  const low =
    stock.onlineSellableStock <= 0 ||
    (stock.safetyBuffer > 0 && stock.availableStock <= stock.safetyBuffer);
  if (!low) return null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{stock.product.name}</p>
        <p className="mt-0.5 text-xs text-muted">
          {stock.onlineSellableStock} online-sellable units remain.
        </p>
      </div>
      <StockStatusBadge
        availableStock={stock.availableStock}
        onlineSellableStock={stock.onlineSellableStock}
        safetyBuffer={stock.safetyBuffer}
      />
    </div>
  );
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}
