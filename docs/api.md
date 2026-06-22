# API Reference

Base URL: `http://localhost:8001`

## Health
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /health | No | Health check |

## Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/me | Yes | Get current user |

## Users
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/users/sync | Yes | Create/update user from Clerk identity |

## Dogs
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/dogs | Yes | List all dogs for user |
| POST | /api/dogs | Yes | Create new dog profile |
| GET | /api/dogs/{dog_id} | Yes | Get single dog |
| PUT | /api/dogs/{dog_id} | Yes | Update dog |
| DELETE | /api/dogs/{dog_id} | Yes | Delete dog |

## Vaccines
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/dogs/{dog_id}/vaccines | Yes | List vaccines |
| POST | /api/dogs/{dog_id}/vaccines | Yes | Add vaccine record |

## Medical History
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/dogs/{dog_id}/medical-history | Yes | Get medical history |
| POST | /api/dogs/{dog_id}/medical-history | Yes | Add medical history entry |

## Vision
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/vision/scan | Yes | Upload image + run AI scan |
| GET | /api/vision/scans/{dog_id} | Yes | Get scan history for dog |

## Uploads
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/uploads/image | Yes | Upload image to Cloudinary via backend |

## Authentication
All protected routes require:
```
Authorization: Bearer <clerk_session_token>
```
