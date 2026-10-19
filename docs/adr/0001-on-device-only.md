# ADR 0001: Keep Nouri on-device, with no backend

- **Status:** accepted (2026-10-19)
- **Deciders:** project owner

## Context

Nouri helps one person (and potentially others) living with suspected Crohn's/IBD decide whether packaged food suits them. The data involved (sensitivities, trigger foods, food history) is health-related and personal. The app must work on an iPhone without the App Store, and hosting should be free.

We considered adding accounts and cloud sync (e.g. Supabase) for multi-device history.

## Decision

Nouri stays fully on-device:

- No server, accounts or cloud storage.
- Profile and history are stored in the browser (versioned and validated).
- Product data comes from the public Open Food Facts API, and only the barcode number is sent.
- The app is a static PWA, deployable to any static host with https.

## Consequences

- **Good:** The most private option: health data never leaves the phone. There is no auth or database to secure, no health-data compliance burden, no running costs, and it works offline.
- **Bad:** History isn't shared between devices. Clearing the browser's site data loses it.
- **Later:** If multi-device sync becomes important, add an optional, end-to-end-encrypted export/import first, before considering a backend.
