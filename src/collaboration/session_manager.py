"""
TrajectIQ Enterprise - Session Manager
======================================
Manages collaboration sessions for team-based candidate review.
"""

import uuid
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import threading


class SessionStatus(Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class SessionRole(Enum):
    OWNER = "owner"
    MODERATOR = "moderator"
    PARTICIPANT = "participant"
    OBSERVER = "observer"


@dataclass
class SessionParticipant:
    user_id: str
    username: str
    role: SessionRole
    joined_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    viewing_candidate: Optional[str] = None


@dataclass
class CollaborationSession:
    """A collaboration session for team-based candidate review."""
    session_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = ""
    status: SessionStatus = SessionStatus.ACTIVE
    created_by: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    participants: Dict[str, SessionParticipant] = field(default_factory=dict)
    candidate_ids: List[str] = field(default_factory=list)
    candidate_locks: Dict[str, str] = field(default_factory=dict)  # candidate_id -> user_id
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def add_participant(self, user_id: str, username: str, role: SessionRole = SessionRole.PARTICIPANT) -> bool:
        with self._lock:
            if user_id not in self.participants:
                self.participants[user_id] = SessionParticipant(user_id=user_id, username=username, role=role)
                return True
            return False

    def remove_participant(self, user_id: str) -> bool:
        with self._lock:
            if user_id in self.participants:
                self._release_all_locks(user_id)
                del self.participants[user_id]
                return True
            return False

    def lock_candidate(self, candidate_id: str, user_id: str) -> bool:
        with self._lock:
            if candidate_id not in self.candidate_locks:
                self.candidate_locks[candidate_id] = user_id
                return True
            return self.candidate_locks[candidate_id] == user_id

    def unlock_candidate(self, candidate_id: str, user_id: str) -> bool:
        with self._lock:
            if candidate_id in self.candidate_locks and self.candidate_locks[candidate_id] == user_id:
                del self.candidate_locks[candidate_id]
                return True
            return False

    def _release_all_locks(self, user_id: str):
        for cid, uid in list(self.candidate_locks.items()):
            if uid == user_id:
                del self.candidate_locks[cid]

    def to_dict(self) -> Dict:
        return {
            "session_id": self.session_id,
            "name": self.name,
            "status": self.status.value,
            "created_by": self.created_by,
            "created_at": self.created_at,
            "participants": {uid: {"user_id": p.user_id, "username": p.username, "role": p.role.value}
                            for uid, p in self.participants.items()},
            "candidate_ids": self.candidate_ids,
            "candidate_locks": self.candidate_locks
        }


class SessionManager:
    """Manages all collaboration sessions."""
    
    def __init__(self):
        self.sessions: Dict[str, CollaborationSession] = {}
        self.user_sessions: Dict[str, Set[str]] = {}
        self._logger = logging.getLogger(__name__)
        self._lock = threading.Lock()

    def create_session(self, name: str, created_by: str, candidate_ids: List[str] = None) -> CollaborationSession:
        with self._lock:
            session = CollaborationSession(name=name, created_by=created_by, candidate_ids=candidate_ids or [])
            session.add_participant(created_by, created_by, SessionRole.OWNER)
            self.sessions[session.session_id] = session
            self._add_user_session(created_by, session.session_id)
            return session

    def get_session(self, session_id: str) -> Optional[CollaborationSession]:
        return self.sessions.get(session_id)

    def join_session(self, session_id: str, user_id: str, username: str, role: SessionRole = SessionRole.PARTICIPANT) -> bool:
        with self._lock:
            session = self.sessions.get(session_id)
            if session and session.add_participant(user_id, username, role):
                self._add_user_session(user_id, session_id)
                return True
            return False

    def leave_session(self, session_id: str, user_id: str) -> bool:
        with self._lock:
            session = self.sessions.get(session_id)
            if session and session.remove_participant(user_id):
                self._remove_user_session(user_id, session_id)
                return True
            return False

    def get_user_sessions(self, user_id: str) -> List[Dict]:
        return [self.sessions[sid].to_dict() for sid in self.user_sessions.get(user_id, []) if sid in self.sessions]

    def get_active_sessions(self) -> List[Dict]:
        return [s.to_dict() for s in self.sessions.values() if s.status == SessionStatus.ACTIVE]

    def _add_user_session(self, user_id: str, session_id: str):
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = set()
        self.user_sessions[user_id].add(session_id)

    def _remove_user_session(self, user_id: str, session_id: str):
        if user_id in self.user_sessions:
            self.user_sessions[user_id].discard(session_id)
