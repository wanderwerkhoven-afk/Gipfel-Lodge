import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice, hasConflict, overlaps, paymentStatus, transitionReservation } from '@gipfel/domain';
import { InMemoryReservationRepository } from '@gipfel/repositories';
import { recordPaymentCommand, refundCommand } from '@gipfel/functions';
import type { Reservation } from '@gipfel/types';

const reservation: Reservation = {
  id: 'r1', organizationId: 'org_a', propertyId: 'p1', guestId: 'g1', guestName: 'Ada Berg', arrivalDate: '2026-09-10', departureDate: '2026-09-12', adults: 2, children: 0, pets: 0, locale: 'nl', status: 'confirmed', paymentStatus: 'unpaid', paidCents: 0, source: 'direct',
  priceSnapshot: calculatePrice({ nights: 2, adults: 2, pets: 0, nightlyCents: 20000, cleaningCents: 10000, taxPerAdultNightCents: 250, petPerStayCents: 0 }),
  createdAt: '2026-01-01T00:00:00Z', createdBy: 'test', updatedAt: '2026-01-01T00:00:00Z', updatedBy: 'test', version: 1
};
test('same-day changeover does not overlap', () => assert.equal(overlaps('2026-09-08', '2026-09-10', '2026-09-10', '2026-09-12'), false));
test('actual overlap is rejected', () => assert.equal(hasConflict({ propertyId: 'p1', arrivalDate: '2026-09-11', departureDate: '2026-09-13' }, [reservation]), true));
test('status machine accepts and rejects transitions', () => { assert.equal(transitionReservation('confirmed', 'checked_in'), 'checked_in'); assert.throws(() => transitionReservation('confirmed', 'completed')); });
test('admin override needs privileged role and reason', () => assert.equal(transitionReservation('confirmed', 'completed', { override: true, role: 'organization_owner', reason: 'Historische correctie' }), 'completed'));
test('pricing uses deterministic cents', () => assert.equal(calculatePrice({ nights: 2, adults: 2, pets: 1, nightlyCents: 20000, cleaningCents: 10000, taxPerAdultNightCents: 250, petPerStayCents: 3000, discountPercent: 10 }).totalCents, 48600));
test('payment and refund status', () => { assert.equal(paymentStatus(10000, 5000), 'partially_paid'); assert.throws(() => refundCommand({ role: 'finance_user', paidCents: 5000, alreadyRefundedCents: 0, refundCents: 6000 })); assert.equal(recordPaymentCommand({ role: 'finance_user', amountCents: 5000, totalCents: 10000, alreadyPaidCents: 5000 }).status, 'paid'); });
test('repository refuses cross-tenant mutation', async () => { const repo = new InMemoryReservationRepository(); await assert.rejects(repo.save({ organizationId: 'org_b', propertyId: 'p1' }, reservation)); });
