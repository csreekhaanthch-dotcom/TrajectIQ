"""
TrajectIQ Enterprise - Presence Manager
=======================================
Tracks real-time user presence and activity.
"""

import time
import logging
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum
import threading


class PresenceStatus(Enum):
    ONLINE = "online"
    AWAY = "away"
    BUSY = "busy"
    OFFLINE = "offline"
    REVIEWING = "reviewing"


@dataclass
class UserPresence:
    """Tracks user presence information."""
    user_id: str
    username: str
    status: PresenceStatus = PresenceStatus.ONLINE
    last_seen: float = field(default_factory=time.time)
    viewing_candidate: Optional[str] = None
    viewing_job: Optional[str] = None
    current_session: Optional[str] = None
    is_typing: bool = False
    custom_message: Optional[str] = None

    def update_heartbeat(self):
        self.last_seen = time.time()
        if self.status == PresenceStatus.OFFLINE:
            self.status = PresenceStatus.ONLINE

    def check_idle(self, idle_threshold: int = 300) -> bool:
        return time.time() - self.last_seen > idle_threshold

    def to_dict(self) -> Dict:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "status": self.status.value,
            "last_seen": self.last_seen,
            "viewing_candidate": self.viewing_candidate,
            "viewing_job": self.viewing_job,
            "current_session": self.current_session,
            "is_typing": self.is_typing,
            "custom_message": self.custom_message
        }


class PresenceManager:
    """Manages user presence across the application."""
    
    def __init__(self, idle_timeout: int = 300):
        self.users: Dict[str, UserPresence] = {}
        self._idle_timeout = idle_timeout
        self._logger = logging.getLogger(__name__)
        self._lock = threading.Lock()
        self._callbacks: List[callable] = []

    def register_user(self, user_id: str, username: str) -> UserPresence:
        with self._lock:
            presence = UserPresence(user_id=user_id, username=username)
            self.users[user_id] = presence
            self._notify_callbacks("user_joined", presence)
            return presence

    def unregister_user(self, user_id: str):
        with self._lock:
            if user_id in self.users:
                presence = self.users[user_id]
                presence.status = PresenceStatus.OFFLINE
                self._notify_callbacks("user_left", presence)
                del self.users[user_id]

    def update_presence(self, user_id: str, **kwargs) -> bool:
        with self._lock:
            if user_id not in self.users:
                return False
            presence = self.users[user_id]
            for key, value in kwargs.items():
                if hasattr(presence, key):
                    setattr(presence, key, value)
            presence.update_heartbeat()
            return True

    def heartbeat(self, user_id: str) -> bool:
        with self._lock:
            if user_id in self.users:
                self.users[user_id].update_heartbeat()
                return True
            return False

    def get_presence(self, user_id: str) -> Optional[UserPresence]:
        return self.users.get(user_id)

    def get_online_users(self) -> List[UserPresence]:
        return [p for p in self.users.values() if p.status != PresenceStatus.OFFLINE]

    def get_users_viewing_candidate(self, candidate_id: str) -> List[UserPresence]:
        return [p for p in self.users.values() if p.viewing_candidate == candidate_id]

    def check_idle_users(self) -> List[str]:
        idle_users = []
        with self._lock:
            for user_id, presence in self.users.items():
                if presence.check_idle(self._idle_timeout) and presence.status == PresenceStatus.ONLINE:
                    presence.status = PresenceStatus.AWAY
                    idle_users.append(user_id)
        return idle_users

    def get_stats(self) -> Dict:
        total = len(self.users)
        online = sum(1 for p in self.users.values() if p.status == PresenceStatus.ONLINE)
        away = sum(1 for p in self.users.values() if p.status == PresenceStatus.AWAY)
        return {"total_users": total, "online": online, "away": away, "offline": total - online - away}

    def on_presence_change(self, callback: callable):
        self._callbacks.append(callback)

    def _notify_callbacks(self, event_type: str, presence: UserPresence, old_status: PresenceStatus = None):
        for callback in self._callbacks:
            try:
                callback(event_type, presence, old_status)
            except Exception as e:
                self._logger.error(f"Callback error: {e}")
