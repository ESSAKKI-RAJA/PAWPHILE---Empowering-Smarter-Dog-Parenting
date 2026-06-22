import httpx
from jose import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

security = HTTPBearer()

def verify_clerk_token(token: str) -> dict:
    if not settings.CLERK_JWKS_URL:
        # For local testing if JWKS URL is missing, allow a bypass for test tokens
        if token.startswith("test_token_"):
            return {"sub": token.split("_")[-1]}
        raise HTTPException(status_code=500, detail="CLERK_JWKS_URL not configured")
        
    try:
        jwks = httpx.get(settings.CLERK_JWKS_URL).json()
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
        if rsa_key:
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                audience=None, # Configure audience if necessary
                issuer=None # Configure issuer if necessary
            )
            return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unable to find appropriate key",
        headers={"WWW-Authenticate": "Bearer"},
    )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_clerk_token(token)
    clerk_user_id = payload.get("sub")
    if clerk_user_id is None:
        raise HTTPException(status_code=401, detail="Invalid auth token")
    return clerk_user_id
