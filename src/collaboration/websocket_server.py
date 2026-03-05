"""
TrajectIQ Enterprise - WebSocket Collaboration Server
======================================================
Real-time bidirectional communication for collaborative hiring.
"""

import asyncio
import json
import logging
import uuid
import time
from datetime import datetime
from typing import Dict, List, Set, Optional, Callable, Any
from dataclasses import dataclass, field
from enum import Enum

try:
    import websockets
    from websockets.server import WebSocketServerProtocol
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    WebSocketServerProtocol = None


class MessageType(Enum):
    """Message types for collaboration"""
    JOIN = "join"
    LEAVE = "leave"
    HEARTBEAT = "heartbeat"
    PRESENCE_UPDATE = "presence_update"
    USER_LIST = "user_list"
    CANDIDATE_OPEN = "candidate_open"
    CANDIDATE_CLOSE = "candidate_close"
    CANDIDATE_UPDATE = "candidate_update"
    CANDIDATE_COMMENT = "candidate_comment"
    CANDIDATE_SCORE = "candidate_score"
    SESSION_CREATE = "session_create"
    SESSION_JOIN = "session_join"
    SESSION_LOCK = "session_lock"
    SESSION_UNLOCK = "session_unlock"
    NOTIFICATION = "notification"
    ERROR = "error"


@dataclass
class CollaborationMessage:
    """Structured message for collaboration"""
    type: MessageType
    payload: Dict[str, Any]
    sender_id: str
    sender_name: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    session_id: Optional[str] = None
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    def to_json(self) -> str:
        return json.dumps({
            "type": self.type.value,
            "payload": self.payload,
            "sender_id": self.sender_id,
            "sender_name": self.sender_name,
            "timestamp": self.timestamp,
            "session_id": self.session_id,
            "message_id": self.message_id
        })

    @classmethod
    def from_json(cls, data: str) -> 'CollaborationMessage':
        obj = json.loads(data)
        return cls(
            type=MessageType(obj["type"]),
            payload=obj["payload"],
            sender_id=obj["sender_id"],
            sender_name=obj["sender_name"],
            timestamp=obj.get("timestamp", datetime.utcnow().isoformat()),
            session_id=obj.get("session_id"),
            message_id=obj.get("message_id", str(uuid.uuid4()))
        )


@dataclass
class ConnectedUser:
    """Represents a connected user"""
    user_id: str
    username: str
    role: str
    websocket: Any
    session_ids: Set[str] = field(default_factory=set)
    last_activity: float = field(default_factory=time.time)
    viewing_candidate: Optional[str] = None


class CollaborationServer:
    """WebSocket server for real-time collaboration."""

    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.users: Dict[str, ConnectedUser] = {}
        self.sessions: Dict[str, Dict] = {}
        self.message_handlers: Dict[MessageType, Callable] = {}
        self._logger = logging.getLogger(__name__)
        self._server = None
        self._register_handlers()

    def _register_handlers(self):
        """Register message handlers"""
        self.message_handlers = {
            MessageType.JOIN: self._handle_join,
            MessageType.LEAVE: self._handle_leave,
            MessageType.HEARTBEAT: self._handle_heartbeat,
            MessageType.CANDIDATE_OPEN: self._handle_candidate_open,
            MessageType.CANDIDATE_CLOSE: self._handle_candidate_close,
            MessageType.CANDIDATE_UPDATE: self._handle_candidate_update,
            MessageType.CANDIDATE_COMMENT: self._handle_candidate_comment,
            MessageType.CANDIDATE_SCORE: self._handle_candidate_score,
        }

    async def start(self):
        """Start the WebSocket server"""
        if not WEBSOCKETS_AVAILABLE:
            self._logger.error("websockets library not installed")
            return False
        try:
            self._server = await websockets.serve(
                self._handle_connection, self.host, self.port,
                ping_interval=30, ping_timeout=10
            )
            self._logger.info(f"Collaboration server started on ws://{self.host}:{self.port}")
            return True
        except Exception as e:
            self._logger.error(f"Failed to start server: {e}")
            return False

    async def stop(self):
        """Stop the WebSocket server"""
        if self._server:
            self._server.close()
            await self._server.wait_closed()

    async def _handle_connection(self, websocket, path: str):
        """Handle new WebSocket connection"""
        user_id = None
        try:
            async for message in websocket:
                try:
                    msg = CollaborationMessage.from_json(message)
                    if msg.type == MessageType.JOIN:
                        user_id = msg.sender_id
                        await self._handle_join(websocket, msg)
                    if user_id and user_id in self.users:
                        self.users[user_id].last_activity = time.time()
                        handler = self.message_handlers.get(msg.type)
                        if handler:
                            await handler(websocket, msg)
                except json.JSONDecodeError:
                    await self._send_error(websocket, "Invalid message format")
        except Exception as e:
            self._logger.error(f"Connection error: {e}")
        finally:
            if user_id and user_id in self.users:
                await self._cleanup_user(user_id)

    async def _handle_join(self, websocket, msg: CollaborationMessage):
        """Handle user join"""
        user_id = msg.sender_id
        payload = msg.payload
        self.users[user_id] = ConnectedUser(
            user_id=user_id,
            username=payload.get("username", "Unknown"),
            role=payload.get("role", "recruiter"),
            websocket=websocket
        )
        await self._broadcast_user_list()
        self._logger.info(f"User joined: {user_id}")

    async def _handle_leave(self, websocket, msg: CollaborationMessage):
        """Handle user leave"""
        await self._cleanup_user(msg.sender_id)

    async def _handle_heartbeat(self, websocket, msg: CollaborationMessage):
        """Handle heartbeat"""
        user_id = msg.sender_id
        if user_id in self.users:
            self.users[user_id].last_activity = time.time()
            await self._send_message(websocket, CollaborationMessage(
                type=MessageType.HEARTBEAT, payload={"status": "ok"},
                sender_id="system", sender_name="System"
            ))

    async def _handle_candidate_open(self, websocket, msg: CollaborationMessage):
        """Handle candidate open event"""
        user_id = msg.sender_id
        if user_id in self.users:
            self.users[user_id].viewing_candidate = msg.payload.get("candidate_id")
            await self._broadcast_user_list()

    async def _handle_candidate_close(self, websocket, msg: CollaborationMessage):
        """Handle candidate close event"""
        user_id = msg.sender_id
        if user_id in self.users:
            self.users[user_id].viewing_candidate = None
            await self._broadcast_user_list()

    async def _handle_candidate_update(self, websocket, msg: CollaborationMessage):
        """Handle candidate update"""
        await self._broadcast_all(msg)

    async def _handle_candidate_comment(self, websocket, msg: CollaborationMessage):
        """Handle candidate comment"""
        await self._broadcast_all(msg)

    async def _handle_candidate_score(self, websocket, msg: CollaborationMessage):
        """Handle candidate scoring"""
        await self._broadcast_all(msg)

    async def _send_message(self, websocket, msg: CollaborationMessage):
        """Send message to websocket"""
        try:
            await websocket.send(msg.to_json())
        except Exception as e:
            self._logger.error(f"Error sending message: {e}")

    async def _send_error(self, websocket, error: str):
        """Send error message"""
        await self._send_message(websocket, CollaborationMessage(
            type=MessageType.ERROR, payload={"error": error},
            sender_id="system", sender_name="System"
        ))

    async def _broadcast_user_list(self):
        """Broadcast user list to all users"""
        user_list = [{"user_id": u.user_id, "username": u.username,
                      "role": u.role, "viewing_candidate": u.viewing_candidate}
                     for u in self.users.values()]
        for user in self.users.values():
            await self._send_message(user.websocket, CollaborationMessage(
                type=MessageType.USER_LIST, payload={"users": user_list},
                sender_id="system", sender_name="System"
            ))

    async def _broadcast_all(self, msg: CollaborationMessage):
        """Broadcast message to all users"""
        for user in self.users.values():
            await self._send_message(user.websocket, msg)

    async def _cleanup_user(self, user_id: str):
        """Clean up user on disconnect"""
        if user_id in self.users:
            del self.users[user_id]
            await self._broadcast_user_list()
            self._logger.info(f"User disconnected: {user_id}")

    def get_stats(self) -> Dict:
        """Get server statistics"""
        return {
            "connected_users": len(self.users),
            "active_sessions": len(self.sessions),
        }


class CollaborationClient:
    """WebSocket client for collaboration."""

    def __init__(self, server_url: str = "ws://localhost:8765"):
        self.server_url = server_url
        self.websocket = None
        self.user_id = str(uuid.uuid4())
        self.username = ""
        self._logger = logging.getLogger(__name__)

    async def connect(self):
        """Connect to server"""
        if not WEBSOCKETS_AVAILABLE:
            raise RuntimeError("websockets library not installed")
        self.websocket = await websockets.connect(self.server_url)

    async def disconnect(self):
        """Disconnect from server"""
        if self.websocket:
            await self.websocket.close()

    async def join(self, username: str, role: str = "recruiter"):
        """Join the collaboration server"""
        self.username = username
        await self._send(CollaborationMessage(
            type=MessageType.JOIN, payload={"username": username, "role": role},
            sender_id=self.user_id, sender_name=username
        ))

    async def open_candidate(self, candidate_id: str):
        """Notify viewing a candidate"""
        await self._send(CollaborationMessage(
            type=MessageType.CANDIDATE_OPEN, payload={"candidate_id": candidate_id},
            sender_id=self.user_id, sender_name=self.username
        ))

    async def add_comment(self, candidate_id: str, comment: str):
        """Add comment to candidate"""
        await self._send(CollaborationMessage(
            type=MessageType.CANDIDATE_COMMENT,
            payload={"candidate_id": candidate_id, "comment": comment},
            sender_id=self.user_id, sender_name=self.username
        ))

    async def _send(self, msg: CollaborationMessage):
        """Send message"""
        if self.websocket:
            await self.websocket.send(msg.to_json())
