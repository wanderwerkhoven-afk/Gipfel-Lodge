# Target architecture

The TypeScript monorepo separates browser applications, domain rules, shared types, repositories, configuration and integration providers. `apps/admin` is a React/Vite client. It talks only through scoped repositories and callable server functions. The public website exporter consumes approved content models, never reservation data.

Firebase Authentication establishes identity. Firestore stores all tenant data below `organizations/{organizationId}`. Cloud Functions v2 own sensitive workflows such as payments, refunds, anonymization, availability transactions, website publication and audit-log creation. Storage paths repeat the organization boundary.

Local work is pinned to `demo-gipfel-saas`; safety scripts reject any other project. Production resources, deployment and secrets remain deliberately absent.
