from __future__ import annotations


class NonRetryableSyncError(Exception):
    """Raised for connector sync failures that should not be retried."""
