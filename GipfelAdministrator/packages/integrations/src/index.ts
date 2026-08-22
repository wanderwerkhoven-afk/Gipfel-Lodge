import type { ChannelManagerProvider, ConnectionResult, ExternalAvailability, ExternalReservation, SyncResult } from '@gipfel/types';
export class PlannedSmoobuProvider implements ChannelManagerProvider {
  readonly name = 'Smoobu'; readonly status = 'planned';
  async connect(): Promise<void> { throw new Error('Smoobu is gepland maar niet aangesloten'); }
  async disconnect(): Promise<void> {}
  async testConnection(): Promise<ConnectionResult> { return { ok: false, message: 'Niet actief — geen credentials of API-calls' }; }
  async pullReservations(): Promise<ExternalReservation[]> { return []; }
  async pullAvailability(): Promise<ExternalAvailability[]> { return []; }
  async pushAvailability(): Promise<SyncResult> { return { processed: 0, conflicts: 0 }; }
  async pushRates(): Promise<SyncResult> { return { processed: 0, conflicts: 0 }; }
}
