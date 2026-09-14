import { Prisma } from '#app/generated/prisma/client';
import { toAddressSnapshot } from './address-snapshot';

describe('toAddressSnapshot', () => {
  it('normalizes a wire DTO into the stored shape', () => {
    const snapshot = toAddressSnapshot({
      recipientName: '  Dara Sok  ',
      line1: ' 12 Street 240 ',
      country: 'kh',
      email: 'Dara@Example.COM',
      city: ' Phnom Penh ',
      latitude: 11.5564,
      longitude: 104.9282,
    });

    expect(snapshot).toMatchObject({
      recipientName: 'Dara Sok',
      line1: '12 Street 240',
      country: 'KH',
      email: 'dara@example.com',
      city: 'Phnom Penh',
      latitude: '11.5564',
      longitude: '104.9282',
    });
  });

  it('collapses missing and blank optional fields to null', () => {
    const snapshot = toAddressSnapshot({
      recipientName: 'Dara Sok',
      line1: '12 Street 240',
      country: 'KH',
      line2: '   ',
      province: null,
    });

    expect(snapshot.line2).toBeNull();
    expect(snapshot.province).toBeNull();
    expect(snapshot.postalCode).toBeNull();
    expect(snapshot.latitude).toBeNull();
  });

  it('stringifies Decimal coordinates from an address-book row', () => {
    const snapshot = toAddressSnapshot({
      recipientName: 'Dara Sok',
      line1: '12 Street 240',
      country: 'KH',
      latitude: new Prisma.Decimal('11.5564000'),
      longitude: new Prisma.Decimal('104.9282000'),
    });

    expect(snapshot.latitude).toBe('11.5564');
    expect(snapshot.longitude).toBe('104.9282');
  });

  it('round-trips a snapshot unchanged', () => {
    const once = toAddressSnapshot({
      recipientName: 'Dara Sok',
      line1: '12 Street 240',
      country: 'KH',
      city: 'Phnom Penh',
    });

    expect(toAddressSnapshot(once)).toEqual(once);
  });
});
