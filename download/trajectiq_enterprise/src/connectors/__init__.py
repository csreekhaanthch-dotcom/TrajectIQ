# TrajectIQ Enterprise - Connectors Package
"""
Email and ATS integration connectors.
"""

from .email_connector import (
    EmailConnector,
    GmailConnector,
    OutlookConnector,
    EmailMessage,
    EmailAttachment
)
from .ats_connector import (
    BaseATSConnector,
    GreenhouseConnector,
    LeverConnector,
    WorkableConnector,
    ATSCandidate,
    get_ats_connector
)

__all__ = [
    'EmailConnector',
    'GmailConnector',
    'OutlookConnector',
    'EmailMessage',
    'EmailAttachment',
    'BaseATSConnector',
    'GreenhouseConnector',
    'LeverConnector',
    'WorkableConnector',
    'ATSCandidate',
    'get_ats_connector'
]
