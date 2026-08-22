# Multi-tenant data model

Every tenant-owned collection is nested under `organizations/{organizationId}`: memberships, properties, guests, reservations, availabilityBlocks, ratePlans, payments, refunds, invoices, communications, emailTemplates, tasks, websiteContent, integrationConnections and auditLogs.

Documents repeat `organizationId`; property-bound records also repeat `propertyId`. Audit fields are `createdAt`, `createdBy`, `updatedAt`, `updatedBy` and `version`. Repositories require an explicit tenant scope. Security Rules resolve membership from the authenticated UID and compare the path organization with the document organization. Browser-supplied tenant IDs are never sufficient authorization.

Reservation `departureDate` is exclusive, allowing a departure and arrival on the same ISO date. Immutable price snapshots preserve the inputs and integer-cent result used at booking time.
