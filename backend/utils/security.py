"""Password hashing.

Kept as plain SHA-256 (identical to the original main.py) ON PURPOSE:
existing seeded and user-created accounts already store SHA-256 hashes, so
changing the algorithm now would lock everyone out and require a migration.
Upgrading to a salted hash (e.g. bcrypt) is a Phase 2 item, not Phase 1.
"""
import hashlib


def hash_pw(p: str) -> str:
    return hashlib.sha256(p.encode()).hexdigest()
