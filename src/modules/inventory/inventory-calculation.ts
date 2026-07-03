export type StockBalance = {
  totalStock: number;
  reservedStock: number;
  soldStock: number;
};

export function calculateAvailableStock(stock: StockBalance) {
  return Math.max(0, stock.totalStock - stock.reservedStock - stock.soldStock);
}

export function calculateOnlineSellableStock(
  stock: StockBalance & { safetyBuffer: number },
) {
  return Math.max(0, calculateAvailableStock(stock) - stock.safetyBuffer);
}
