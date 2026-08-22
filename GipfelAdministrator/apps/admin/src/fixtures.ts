import { calculatePrice } from '@gipfel/domain';
import type { Guest, Message, Reservation, ReservationStatus, Task } from '@gipfel/types';

const created = '2026-08-22T10:00:00.000Z';
const audit = (organizationId: string, propertyId = 'property_gipfel_lodge') => ({ organizationId, propertyId, createdAt: created, createdBy: 'fixture@system.invalid', updatedAt: created, updatedBy: 'fixture@system.invalid', version: 1 });
const firstNames = ['Anna', 'Milan', 'Sophie', 'Lukas', 'Nora', 'Thomas', 'Emma', 'Felix', 'Liv', 'Jakob', 'Mila', 'Noah', 'Lena', 'Finn', 'Sara', 'Max', 'Eva', 'Leo', 'Mara', 'Otto'];
const lastNames = ['Berg', 'Winter', 'Meier', 'Jansen', 'Stein', 'Vos', 'Huber', 'Smit', 'Klein', 'Bakker'];
export const guests: Guest[] = firstNames.map((firstName, index) => ({
  id: `guest_${index + 1}`, ...audit('org_gipfel_lodge'), firstName, lastName: lastNames[index % lastNames.length],
  email: `${firstName.toLowerCase()}.${lastNames[index % lastNames.length].toLowerCase()}@example.invalid`, phone: `+31 6 0000 ${String(index).padStart(4, '0')}`,
  country: index % 3 === 0 ? 'NL' : index % 3 === 1 ? 'DE' : 'BE', locale: index % 3 === 0 ? 'nl' : index % 3 === 1 ? 'de' : 'en'
}));
const statuses: ReservationStatus[] = ['enquiry', 'option', 'pending', 'confirmed', 'checked_in', 'checked_out', 'completed', 'cancelled', 'declined', 'expired'];
const iso = (day: number) => `2026-${day < 31 ? '09' : '10'}-${String(day < 31 ? day : day - 30).padStart(2, '0')}`;
export const reservations: Reservation[] = Array.from({ length: 35 }, (_, index) => {
  const arrival = 1 + index; const nights = 2 + (index % 5); const total = calculatePrice({ nights, adults: 2 + index % 3, pets: index % 4 === 0 ? 1 : 0, nightlyCents: 18500 + (index % 4) * 2500, cleaningCents: 12500, taxPerAdultNightCents: 250, petPerStayCents: 3500, discountPercent: index % 9 === 0 ? 10 : 0 });
  const paid = index % 6 === 0 ? 0 : index % 6 === 1 ? Math.round(total.totalCents * .3) : index % 6 === 2 ? total.totalCents + 2500 : total.totalCents;
  return { id: `GA-26-${String(index + 1).padStart(3, '0')}`, ...audit(index === 34 ? 'org_alpen_demo' : 'org_gipfel_lodge', index % 4 === 3 ? 'property_sonnen_chalet' : 'property_gipfel_lodge'),
    guestId: guests[index % 19].id, guestName: `${guests[index % 19].firstName} ${guests[index % 19].lastName}`, arrivalDate: iso(arrival), departureDate: iso(arrival + nights), adults: 2 + index % 3, children: index % 3, pets: index % 4 === 0 ? 1 : 0, locale: guests[index % 19].locale, status: statuses[index % statuses.length],
    paymentStatus: paid === 0 ? 'unpaid' : paid < total.totalCents ? 'partially_paid' : paid > total.totalCents ? 'overpaid' : 'paid', priceSnapshot: total, paidCents: paid, source: index % 4 ? 'direct' : 'manual', optionExpiresAt: index % 10 === 1 ? '2026-08-23T09:00:00.000Z' : undefined };
});
export const tasks: Task[] = [
  { id: 't1', ...audit('org_gipfel_lodge'), title: 'Aankomstcontrole E4', category: 'arrival', dueDate: '2026-08-23', priority: 'high', status: 'open', assignee: 'Operations' },
  { id: 't2', ...audit('org_gipfel_lodge'), title: 'Linnengoed 8 gasten', category: 'linen', dueDate: '2026-08-24', priority: 'normal', status: 'in_progress', assignee: 'Hausservice' },
  { id: 't3', ...audit('org_gipfel_lodge'), title: 'Sauna inspecteren', category: 'maintenance', dueDate: '2026-08-25', priority: 'normal', status: 'open', assignee: 'Techniek' }
];
export const messages: Message[] = [
  { id: 'm1', ...audit('org_gipfel_lodge'), guestId: 'guest_1', reservationId: 'GA-26-001', subject: 'Aankomsttijd', body: 'Wij verwachten rond 16:30 aan te komen.', locale: 'nl', status: 'sent_mock' },
  { id: 'm2', ...audit('org_gipfel_lodge'), guestId: 'guest_2', reservationId: 'GA-26-002', subject: 'Check-in Informationen', body: 'Vielen Dank für die Informationen.', locale: 'de', status: 'draft' }
];
