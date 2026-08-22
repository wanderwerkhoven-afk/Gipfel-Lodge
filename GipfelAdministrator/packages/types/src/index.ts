export type Locale = 'nl' | 'de' | 'en';
export type Role = 'platform_admin' | 'organization_owner' | 'property_manager' | 'operations_staff' | 'finance_user' | 'content_editor' | 'read_only';
export type ReservationStatus = 'enquiry' | 'option' | 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'completed' | 'cancelled' | 'declined' | 'expired';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overpaid' | 'refund_pending' | 'partially_refunded' | 'refunded';
export type BlockType = 'maintenance' | 'owner_stay' | 'manual';

export interface AuditFields {
  organizationId: string;
  propertyId?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
}

export interface Organization extends AuditFields { id: string; name: string; plan: 'trial' | 'basic' | 'professional' | 'multi_property'; active: boolean; }
export interface Property extends AuditFields { id: string; name: string; location: string; timezone: string; currency: 'EUR'; capacity: number; }
export interface Guest extends AuditFields { id: string; firstName: string; lastName: string; email: string; phone: string; country: string; locale: Locale; notes?: string; anonymized?: boolean; }
export interface PriceLine { code: string; label: string; quantity: number; unitCents: number; totalCents: number; }
export interface PriceSnapshot { currency: 'EUR'; lines: PriceLine[]; totalCents: number; calculatedAt: string; ratePlanVersion: number; }
export interface Reservation extends AuditFields {
  id: string; guestId: string; guestName: string; arrivalDate: string; departureDate: string;
  adults: number; children: number; pets: number; locale: Locale; status: ReservationStatus;
  paymentStatus: PaymentStatus; priceSnapshot: PriceSnapshot; paidCents: number; source: 'direct' | 'manual' | 'channel'; optionExpiresAt?: string; notes?: string;
}
export interface AvailabilityBlock extends AuditFields { id: string; type: BlockType; startDate: string; endDate: string; reason: string; }
export interface Payment extends AuditFields { id: string; reservationId: string; amountCents: number; method: 'bank' | 'cash' | 'online_reference'; reference: string; }
export interface Task extends AuditFields { id: string; title: string; category: 'cleaning' | 'arrival' | 'linen' | 'maintenance' | 'damage'; dueDate: string; priority: 'low' | 'normal' | 'high'; status: 'open' | 'in_progress' | 'done'; assignee: string; }
export interface Message extends AuditFields { id: string; reservationId?: string; guestId?: string; subject: string; body: string; locale: Locale; status: 'draft' | 'scheduled' | 'sent_mock' | 'failed'; }

export interface ConnectionResult { ok: boolean; message: string; }
export interface SyncResult { processed: number; conflicts: number; }
export interface ExternalReservation { externalId: string; arrivalDate: string; departureDate: string; }
export interface ExternalAvailability { date: string; available: boolean; }
export interface ChannelManagerProvider {
  connect(): Promise<void>; disconnect(): Promise<void>; testConnection(): Promise<ConnectionResult>;
  pullReservations(): Promise<ExternalReservation[]>; pullAvailability(): Promise<ExternalAvailability[]>;
  pushAvailability(): Promise<SyncResult>; pushRates(): Promise<SyncResult>;
}
