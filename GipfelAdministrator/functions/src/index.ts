import { anonymizeGuest, paymentStatus } from '@gipfel/domain';
import type { Guest, Role } from '@gipfel/types';

const financialRoles: Role[] = ['platform_admin', 'organization_owner', 'finance_user'];
export function recordPaymentCommand(input: { role: Role; amountCents: number; totalCents: number; alreadyPaidCents: number }) {
  if (!financialRoles.includes(input.role)) throw new Error('Niet bevoegd voor financiële mutatie');
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error('Betaling moet positieve gehele centen bevatten');
  const paidCents = input.alreadyPaidCents + input.amountCents;
  return { paidCents, status: paymentStatus(input.totalCents, paidCents) };
}
export function refundCommand(input: { role: Role; paidCents: number; alreadyRefundedCents: number; refundCents: number }) {
  if (!financialRoles.includes(input.role)) throw new Error('Niet bevoegd voor refund');
  if (!Number.isInteger(input.refundCents) || input.refundCents <= 0 || input.alreadyRefundedCents + input.refundCents > input.paidCents) throw new Error('Refund geweigerd');
  const refundedCents = input.alreadyRefundedCents + input.refundCents;
  return { refundedCents, status: paymentStatus(input.paidCents, input.paidCents, refundedCents) };
}
export function anonymizeGuestCommand(input: { role: Role; guest: Guest; confirmed: boolean; reason: string }) {
  if (!['platform_admin', 'organization_owner', 'property_manager'].includes(input.role)) throw new Error('Niet bevoegd voor GDPR-workflow');
  return anonymizeGuest(input.guest, input.reason, input.confirmed);
}
