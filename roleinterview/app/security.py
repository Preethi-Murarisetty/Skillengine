import os
from dataclasses import dataclass
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError


bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    subject: str
    email: str
    roles: frozenset[str]


def get_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Principal:
    algorithm = os.getenv("CORE_LEGACY_JWT_ALGORITHM", "").strip()
    key = os.getenv("CORE_LEGACY_JWT_VERIFYING_KEY", "")
    issuer = os.getenv("CORE_LEGACY_JWT_ISSUER", "").strip()
    audience = os.getenv("CORE_LEGACY_JWT_AUDIENCE", "").strip()
    subject_claim = os.getenv("CORE_LEGACY_JWT_SUBJECT_CLAIM", "").strip()
    role_claim = os.getenv("CORE_LEGACY_JWT_ROLE_CLAIM", "").strip()
    email_claim = os.getenv("CORE_LEGACY_JWT_EMAIL_CLAIM", "").strip()

    if not all((algorithm, key, issuer, audience, subject_claim, role_claim, email_claim)):
        raise HTTPException(
            status_code=503,
            detail=(
                "Protected core APIs are disabled until the legacy JWT "
                "verification contract is configured."
            ),
        )

    if credentials is None:
        raise HTTPException(status_code=401, detail="A valid bearer token is required.")

    try:
        claims: dict[str, Any] = jwt.decode(
            credentials.credentials,
            key,
            algorithms=[algorithm],
            issuer=issuer,
            audience=audience,
            options={"require": ["exp", "iss", "aud", subject_claim]},
        )
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="The bearer token is invalid or expired.") from exc

    subject = claims.get(subject_claim)
    email = claims.get(email_claim)
    raw_roles = claims.get(role_claim)
    roles = raw_roles if isinstance(raw_roles, list) else [raw_roles]

    if not isinstance(subject, (str, int)) or not str(subject).strip():
        raise HTTPException(status_code=401, detail="The bearer token has no usable subject.")
    if not isinstance(email, str) or not email.strip():
        raise HTTPException(status_code=401, detail="The bearer token has no usable email.")

    return Principal(
        subject=str(subject),
        email=email.strip().lower(),
        roles=frozenset(str(role).strip().lower() for role in roles if role),
    )


def require_admin(
    principal: Annotated[Principal, Depends(get_principal)],
) -> Principal:
    configured_roles = {
        role.strip().lower()
        for role in os.getenv("CORE_LEGACY_ADMIN_ROLE_VALUES", "").split(",")
        if role.strip()
    }
    if not configured_roles:
        raise HTTPException(
            status_code=503,
            detail="Protected core APIs are disabled until legacy admin roles are configured.",
        )
    if not principal.roles.intersection(configured_roles):
        raise HTTPException(status_code=403, detail="Administrator access is required.")
    return principal
