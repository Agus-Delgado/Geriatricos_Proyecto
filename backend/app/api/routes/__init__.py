# Export all route modules for easy importing
from . import admin
from . import auth
from . import attendance
from . import certificates
from . import clinical
from . import documents
from . import external_platforms
from . import facilities
from . import finance
from . import medications
from . import resident_contacts
from . import resident_external_events
from . import residents
from . import staff

__all__ = [
    "admin",
    "auth",
    "attendance",
    "certificates",
    "clinical",
    "documents",
    "external_platforms",
    "facilities",
    "finance",
    "medications",
    "resident_contacts",
    "resident_external_events",
    "residents",
    "staff",
]
