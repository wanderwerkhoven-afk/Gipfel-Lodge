export const appConfig = {
  name: 'GipfelAdministrator', projectId: 'demo-gipfel-saas', timezone: 'Europe/Vienna', currency: 'EUR',
  organizationId: 'org_gipfel_lodge', propertyId: 'property_gipfel_lodge', locales: ['nl', 'de', 'en'] as const
};
export function assertSafeProject(projectId: string): void {
  if (projectId !== 'demo-gipfel-saas' || !projectId.startsWith('demo-')) throw new Error('Productieproject geblokkeerd');
}
