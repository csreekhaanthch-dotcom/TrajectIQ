"""
TrajectIQ Enterprise - Notification Manager
===========================================
Real-time notification system for collaboration.
"""

import uuid
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum


class NotificationType(Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    CANDIDATE_LOCKED = "candidate_locked"
    CANDIDATE_UPDATED = "candidate_updated"
    CANDIDATE_COMMENTED = "candidate_commented"
    SESSION_INVITE = "session_invite"
    MENTION = "mention"


class NotificationPriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4


@dataclass
class Notification:
    """A notification message."""
    notification_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    notification_type: NotificationType = NotificationType.INFO
    priority: NotificationPriority = NotificationPriority.NORMAL
    title: str = ""
    message: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    data: Dict = field(default_factory=dict)
    actions: List[Dict] = field(default_factory=list)
    read: bool = False
    dismissed: bool = False
    expires_at: Optional[str] = None

    def mark_read(self):
        self.read = True

    def is_expired(self) -> bool:
        if self.expires_at:
            return datetime.utcnow() > datetime.fromisoformat(self.expires_at)
        return False

    def to_dict(self) -> Dict:
        return {
            "notification_id": self.notification_id,
            "notification_type": self.notification_type.value,
            "priority": self.priority.value,
            "title": self.title,
            "message": self.message,
            "created_at": self.created_at,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "data": self.data,
            "actions": self.actions,
            "read": self.read,
            "dismissed": self.dismissed
        }


class NotificationManager:
    """Manages notifications for users."""
    
    def __init__(self, max_notifications: int = 1000):
        self.notifications: Dict[str, Notification] = {}
        self.user_notifications: Dict[str, List[str]] = {}
        self._max_notifications = max_notifications
        self._logger = logging.getLogger(__name__)
        self._delivery_handlers: Dict[str, Callable] = {}

    def create_notification(
        self,
        notification_type: NotificationType,
        title: str,
        message: str,
        user_id: str = None,
        session_id: str = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        data: Dict = None,
        actions: List[Dict] = None,
        expires_in_hours: int = None
    ) -> Notification:
        notification = Notification(
            notification_type=notification_type,
            priority=priority,
            title=title,
            message=message,
            user_id=user_id,
            session_id=session_id,
            data=data or {},
            actions=actions or []
        )
        if expires_in_hours:
            notification.expires_at = (datetime.utcnow() + timedelta(hours=expires_in_hours)).isoformat()
        
        self.notifications[notification.notification_id] = notification
        if user_id:
            if user_id not in self.user_notifications:
                self.user_notifications[user_id] = []
            self.user_notifications[user_id].append(notification.notification_id)
        
        self._deliver(notification)
        return notification

    def notify_user(self, user_id: str, title: str, message: str, 
                   notification_type: NotificationType = NotificationType.INFO, **kwargs) -> Notification:
        return self.create_notification(notification_type, title, message, user_id=user_id, **kwargs)

    def broadcast(self, title: str, message: str, 
                 notification_type: NotificationType = NotificationType.INFO, **kwargs) -> Notification:
        return self.create_notification(notification_type, title, message, **kwargs)

    def get_user_notifications(self, user_id: str, unread_only: bool = False, limit: int = 50) -> List[Notification]:
        notification_ids = self.user_notifications.get(user_id, [])
        notifications = []
        for nid in reversed(notification_ids[-limit:]):
            if nid in self.notifications:
                notification = self.notifications[nid]
                if notification.is_expired() or notification.dismissed:
                    continue
                if unread_only and notification.read:
                    continue
                notifications.append(notification)
        return notifications

    def get_unread_count(self, user_id: str) -> int:
        return len(self.get_user_notifications(user_id, unread_only=True))

    def mark_read(self, notification_id: str, user_id: str = None) -> bool:
        if notification_id in self.notifications:
            notification = self.notifications[notification_id]
            if user_id is None or notification.user_id == user_id:
                notification.mark_read()
                return True
        return False

    def mark_all_read(self, user_id: str) -> int:
        count = 0
        for notification in self.get_user_notifications(user_id):
            if not notification.read:
                notification.mark_read()
                count += 1
        return count

    def dismiss(self, notification_id: str, user_id: str = None) -> bool:
        if notification_id in self.notifications:
            notification = self.notifications[notification_id]
            if user_id is None or notification.user_id == user_id:
                notification.dismissed = True
                return True
        return False

    def register_delivery_handler(self, method: str, handler: Callable):
        self._delivery_handlers[method] = handler

    def _deliver(self, notification: Notification):
        handler = self._delivery_handlers.get("websocket")
        if handler:
            try:
                handler(notification)
            except Exception as e:
                self._logger.error(f"Delivery error: {e}")
