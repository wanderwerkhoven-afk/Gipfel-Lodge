# Future Firebase cloud setup

1. Obtain explicit deployment approval and create separate development, staging and production projects.
2. Configure Authentication, Firestore, Storage, Functions v2 and Secret Manager in the correct EU region.
3. Replace demo environment variables through protected CI environments; never commit values.
4. Run emulator acceptance, deploy Rules to staging, seed synthetic staging data and run browser acceptance.
5. Review billing alerts, App Check, logging, backups, retention and incident ownership.
6. Promote only an immutable reviewed commit. Existing Gipfel Lodge reservations are not migrated by this repository.
