# Confirmed assessment frontend API configuration

Frontend URL:

http://localhost:5173/exam/<JWT>

Confirmed backend:

http://100.117.158.50:3005/api

The frontend uses exactly these four assessment APIs:

1. POST /api/assessment/{token}/generate-key
2. POST /api/assessment/{token}/verify-key
   Body: { "verification_key": "<key>" }
3. POST /api/assessment/{token}/start
4. POST /api/assessment/{token}/end

The JWT is passed as the `{token}` path parameter and is URL-encoded by the frontend.

No guessed `/generate-key`, `/verify-key`, `/start`, or `/end` URLs are constructed outside the endpoint configuration.

The frontend does not call unconfirmed assessment-details/questions APIs during verification/start. The verify-key response must return enough assessment information to render the instructions (at minimum assessment id/title/sections), or the start response must return it.

Restart Vite after changing .env.local.
