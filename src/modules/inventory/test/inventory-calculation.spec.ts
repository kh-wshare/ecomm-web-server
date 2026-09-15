import {
  calculateAvailableStock,
  calculateOnlineSellableStock,
} from './inventory-calculation';

describe('inventory calculations', () => {
  it('subtracts reserved and sold quantities from total stock', () => {
    const stock = {
      totalStock: 20,
      reservedStock: 4,
      soldStock: 7,
      safetyBuffer: 2,
    };

    expect(calculateAvailableStock(stock)).toBe(9);
    expect(calculateOnlineSellableStock(stock)).toBe(7);
  });

  it('never exposes negative available or online stock', () => {
    expect(
      calculateAvailableStock({
        totalStock: 3,
        reservedStock: 2,
        soldStock: 4,
      }),
    ).toBe(0);
    expect(
      calculateOnlineSellableStock({
        totalStock: 5,
        reservedStock: 1,
        soldStock: 1,
        safetyBuffer: 5,
      }),
    ).toBe(0);
  });

  it('keeps safety stock available to POS while excluding it online', () => {
    const stock = {
      totalStock: 10,
      reservedStock: 2,
      soldStock: 1,
      safetyBuffer: 3,
    };

    expect(calculateAvailableStock(stock)).toBe(7);
    expect(calculateOnlineSellableStock(stock)).toBe(4);
  });
});
