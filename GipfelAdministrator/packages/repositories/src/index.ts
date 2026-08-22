import type { Reservation } from '@gipfel/types';
export interface TenantScope { organizationId: string; propertyId?: string; }
export interface ReservationRepository {
  list(scope: TenantScope): Promise<Reservation[]>;
  get(scope: TenantScope, id: string): Promise<Reservation | undefined>;
  save(scope: TenantScope, value: Reservation): Promise<Reservation>;
}
export class InMemoryReservationRepository implements ReservationRepository {
  constructor(private readonly rows: Reservation[] = []) {}
  async list(scope: TenantScope) { return this.rows.filter(row => row.organizationId === scope.organizationId && (!scope.propertyId || row.propertyId === scope.propertyId)); }
  async get(scope: TenantScope, id: string) { return (await this.list(scope)).find(row => row.id === id); }
  async save(scope: TenantScope, value: Reservation) {
    if (value.organizationId !== scope.organizationId || (scope.propertyId && value.propertyId !== scope.propertyId)) throw new Error('Cross-tenant mutatie geweigerd');
    const index = this.rows.findIndex(row => row.id === value.id && row.organizationId === scope.organizationId);
    if (index >= 0) this.rows[index] = value; else this.rows.push(value);
    return value;
  }
}
