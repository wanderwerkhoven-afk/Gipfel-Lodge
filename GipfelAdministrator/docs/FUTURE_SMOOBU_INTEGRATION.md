# Future Smoobu integration

`ChannelManagerProvider` defines connection testing, reservation/availability pulls and availability/rate pushes. `PlannedSmoobuProvider` is intentionally inert: it stores no credentials, starts no jobs and performs no network calls.

A future implementation needs encrypted credential references, idempotent webhook ingestion, external-ID mapping, bounded retries, conflict queues, rate limiting, sync cursors, audit events and an explicit disconnect/revocation workflow. Activation requires separate authorization and Smoobu sandbox evidence.
