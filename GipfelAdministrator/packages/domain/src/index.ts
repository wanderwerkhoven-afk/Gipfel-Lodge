import type { Guest, PriceLine, PriceSnapshot, Reservation, ReservationStatus, Role } from '@gipfel/types';

export const STATUS_TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  enquiry: ['option', 'pending', 'confirmed', 'declined', 'expired'], option: ['pending', 'confirmed', 'declined', 'expired'],
  pending: ['confirmed', 'declined', 'expired'], confirmed: ['checked_in', 'cancelled'], checked_in: ['checked_out'],
  checked_out: ['completed'], completed: [], cancelled: [], declined: [], expired: []
};

export function transitionReservation(current: ReservationStatus, next: ReservationStatus, options?: { override?: boolean; role?: Role; reason?: string }): ReservationStatus {
  if (STATUS_TRANSITIONS[current].includes(next)) return next;
  if (options?.override && ['platform_admin', 'organization_owner', 'property_manager'].includes(options.role ?? '') && options.reason?.trim()) return next;
  throw new Error(`Ongeldige statusovergang: ${current} → ${next}`);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  validateStay(aStart, aEnd); validateStay(bStart, bEnd);
  return aStart < bEnd && bStart < aEnd;
}
export function validateStay(arrivalDate: string, departureDate: string): void {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(arrivalDate) || !iso.test(departureDate) || arrivalDate >= departureDate) throw new Error('Ongeldige verblijfsperiode');
}
export function hasConflict(candidate: Pick<Reservation, 'arrivalDate' | 'departureDate' | 'propertyId'>, existing: Reservation[]): boolean {
  return existing.filter(r => r.propertyId === candidate.propertyId && !['cancelled', 'declined', 'expired'].includes(r.status))
    .some(r => overlaps(candidate.arrivalDate, candidate.departureDate, r.arrivalDate, r.departureDate));
}

export interface PricingInput { nights: number; adults: number; pets: number; nightlyCents: number; cleaningCents: number; taxPerAdultNightCents: number; petPerStayCents: number; discountPercent?: number; }
export function calculatePrice(input: PricingInput, now = '2026-08-22T12:00:00.000Z'): PriceSnapshot {
  for (const [key, value] of Object.entries(input)) if (!Number.isInteger(value) || value < 0) throw new Error(`${key} moet een niet-negatief geheel getal zijn`);
  const lines: PriceLine[] = [
    line('nights', 'Overnachtingen', input.nights, input.nightlyCents),
    line('cleaning', 'Schoonmaak', 1, input.cleaningCents),
    line('tax', 'Toeristenbelasting', input.nights * input.adults, input.taxPerAdultNightCents),
    line('pets', 'Huisdieren', input.pets, input.petPerStayCents)
  ].filter(item => item.totalCents > 0);
  const subtotal = lines.reduce((sum, item) => sum + item.totalCents, 0);
  const discount = input.discountPercent ? Math.round(subtotal * input.discountPercent / 100) : 0;
  if (discount) lines.push({ code: 'discount', label: 'Korting', quantity: 1, unitCents: -discount, totalCents: -discount });
  return { currency: 'EUR', lines, totalCents: subtotal - discount, calculatedAt: now, ratePlanVersion: 1 };
}
function line(code: string, label: string, quantity: number, unitCents: number): PriceLine { return { code, label, quantity, unitCents, totalCents: quantity * unitCents }; }

export function paymentStatus(totalCents: number, paidCents: number, refundedCents = 0) {
  if ([totalCents, paidCents, refundedCents].some(value => !Number.isInteger(value) || value < 0)) throw new Error('Bedragen moeten gehele, positieve centen zijn');
  if (refundedCents > paidCents) throw new Error('Refund is hoger dan het betaalde bedrag');
  if (refundedCents === paidCents && paidCents > 0) return 'refunded' as const;
  if (refundedCents > 0) return 'partially_refunded' as const;
  if (paidCents === 0) return 'unpaid' as const;
  if (paidCents < totalCents) return 'partially_paid' as const;
  if (paidCents === totalCents) return 'paid' as const;
  return 'overpaid' as const;
}

export function normalizeEmail(value: string): string { return value.trim().toLocaleLowerCase('en-US'); }
export function normalizePhone(value: string): string { return value.replace(/[^+\d]/g, '').replace(/^00/, '+'); }
export function potentialDuplicate(candidate: Pick<Guest, 'email' | 'phone'>, guests: Guest[]): Guest | undefined {
  const email = normalizeEmail(candidate.email); const phone = normalizePhone(candidate.phone);
  return guests.find(g => normalizeEmail(g.email) === email || (!!phone && normalizePhone(g.phone) === phone));
}
export function anonymizeGuest(guest: Guest, reason: string, confirmed: boolean): Guest {
  if (!confirmed || !reason.trim()) throw new Error('Bevestiging en reden zijn verplicht');
  return { ...guest, firstName: 'Geanonimiseerd', lastName: guest.id.slice(-6), email: `anonymous-${guest.id}@privacy.invalid`, phone: '', notes: undefined, anonymized: true, updatedAt: new Date(0).toISOString(), updatedBy: 'gdpr-workflow', version: guest.version + 1 };
}
