# Security and threat model

| Threat | Control |
|---|---|
| Cross-tenant reads or writes | Organization-scoped paths, membership lookup in Rules, scoped repositories and negative tests |
| Role bypass in the browser | Server-side Rules and callable-function authorization |
| Production use during development | Demo-only project ID, emulator flags and fail-closed safety guard |
| Refund or payment tampering | Integer positive values and server-owned payment/refund commands |
| Double booking | Transactional interval check; exclusive departure date |
| PII leakage | Synthetic `.invalid` fixtures, private Storage paths, publication allowlist and PII scan |
| Unauthorized status override | Privileged role, mandatory reason and immutable audit event |
| Credential exposure | No credentials in documents; only encrypted-secret references in future integration records |
| Email side effects | Mock transport only |

Audit logs are append-only from trusted server code. Organization deletion and audit-log writes are denied to clients. GDPR anonymization is explicit, authorized and irreversible for contact fields while retaining permitted aggregate history.
