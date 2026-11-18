# Exam link and verification-key flow

## Public URL

`http://localhost:5173/exam/<JWT>` is supported. `/assessment/<JWT>` remains supported.

## API base

Default backend: `http://100.117.158.50:3005/api`

## Flow

1. Open `/exam/<JWT>`
2. Click Generate Verification Key.
3. Frontend calls `POST /api/assessment/<JWT>/generate-key`.
4. Backend generates and stores the key. For development, the response may include `verification_key`.
5. Frontend fills the key and calls `POST /api/assessment/<JWT>/verify-key`.
6. After verification, questions are assigned if needed.
7. Start calls `POST /api/assessment/<JWT>/start`.
8. End calls `POST /api/assessment/<JWT>/end`.

Restart Vite after changing `.env`/`.env.local`; Vite loads `VITE_*` variables at startup.
