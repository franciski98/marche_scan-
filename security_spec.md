# Security Specification for Sahel IT & Energy Veille Reports

## 1. Data Invariants
- Each report document must belong to the `veille_reports` collection.
- Each report must contain a valid `dateRapport` string, a structured `rawData` object containing extracted sections (attributions, opportunities, recommendations), and a matching formatted `markdown` text.
- Since the application is a public-facing portal without user login, server-side unauthenticated read and write access must be permitted for the `veille_reports` collection.

## 2. "Dirty Dozen" Payloads
The following payloads should be rejected under strict rules:
1. Writing a report with a missing `dateRapport` field.
2. Writing a report with a missing `markdown` field.
3. Writing a report with a missing `rawData` field.
4. Attempting to write to any collection other than `veille_reports` (e.g., a dummy `admins` or `users` collection).
5. Attempting to write massive payloads exceeding resource limits.

## 3. Test Cases (firestore.rules.test.ts)
The mock tests verify:
- Unauthenticated read succeeds for `veille_reports`.
- Unauthenticated write succeeds for valid `veille_reports`.
- Writes to unknown collections fail.
