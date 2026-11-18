# Legacy Node assessment API: exam link flow

Candidate URL: `http://<host>:5173/exam/<JWT>` (`/assessment/<JWT>` also works).
Backend base: `VITE_BACKEND_URL` (the Node service, not included in this repository).

The frontend calls exactly four endpoints; the JWT is the URL-encoded `{token}`:

1. `POST /api/assessment/{token}/generate-key`
2. `POST /api/assessment/{token}/verify-key` with body `{ "verification_key": "<key>" }`
3. `POST /api/assessment/{token}/start`
4. `POST /api/assessment/{token}/end`

The verify-key response must contain enough data to render instructions (assessment id, title,
sections), otherwise the start response must. Restart Vite after editing `.env`.
