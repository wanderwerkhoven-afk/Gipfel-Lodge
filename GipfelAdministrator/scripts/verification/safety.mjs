const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-gipfel-saas';
if (projectId !== 'demo-gipfel-saas' || !projectId.startsWith('demo-')) {
  console.error(`Safety guard: project ${projectId} is niet toegestaan.`);
  process.exit(1);
}
console.log('Safety guard OK — demo-gipfel-saas, geen deployment.');
