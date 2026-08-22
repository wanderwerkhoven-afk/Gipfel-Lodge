# Product vision

GipfelAdministrator is a calm, premium operations platform for independent holiday-home owners and professional managers. The first tenant is Gipfel Lodge in Eben im Pongau; the product is deliberately built for many organizations and properties.

The product brings reservations, guests, payments, tasks, communication, rates and multilingual website publishing into one auditable workspace. Local development uses synthetic data and Firebase Emulator Suite only. No live channel manager, mail transport or payment provider is connected.

## Product principles

1. Tenant isolation is a security boundary, not a UI filter.
2. Dates use `Europe/Vienna`, ISO date-only values and an exclusive departure day.
3. Money is stored and calculated as integer eurocents.
4. Every sensitive change is attributable and auditable.
5. Operational density remains readable on desktop, tablet and mobile.
6. External services sit behind replaceable provider interfaces.
