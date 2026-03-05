"""
TrajectIQ Enterprise - Collaboration Module
============================================
Real-time collaboration features for team-based hiring.
"""

from .websocket_server import CollaborationServer, CollaborationClient
from .session_manager import SessionManager, CollaborationSession
from .presence import PresenceManager, UserPresence
from .notifications import NotificationManager, Notification

__all__ = [
    'CollaborationServer',
    'CollaborationClient',
    'SessionManager',
    'CollaborationSession',
    'PresenceManager',
    'UserPresence',
    'NotificationManager',
    'Notification',
]
