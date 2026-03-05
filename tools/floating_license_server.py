#!/usr/bin/env python3
"""
TrajectIQ Floating License Server
=================================
Lightweight internal license server for concurrent usage tracking.

Runs as a separate service for enterprise deployments.
"""

import json
import time
import threading
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from flask import Flask, request, jsonify
from functools import wraps


# Configuration
DEFAULT_PORT = 8080
DEFAULT_DATABASE = "floating_license.db"
SESSION_TIMEOUT_MINUTES = 5
CLEANUP_INTERVAL_SECONDS = 60


@dataclass
class Seat:
    """Active seat information"""
    session_id: str
    machine_fingerprint: str
    license_id: str
    claimed_at: datetime
    last_activity: datetime


class FloatingLicenseManager:
    """Manages floating license seats"""
    
    def __init__(self, db_path: str = DEFAULT_DATABASE, max_seats: int = 10):
        self.db_path = db_path
        self.max_seats = max_seats
        self._lock = threading.RLock()
        self._seats: Dict[str, Seat] = {}
        self._init_database()
    
    def _init_database(self):
        """Initialize database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS seats (
                session_id TEXT PRIMARY KEY,
                machine_fingerprint TEXT NOT NULL,
                license_id TEXT NOT NULL,
                claimed_at TIMESTAMP NOT NULL,
                last_activity TIMESTAMP NOT NULL
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS usage_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                action TEXT NOT NULL,
                machine_fingerprint TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                details TEXT
            )
        """)
        
        conn.commit()
        conn.close()
    
    def request_seat(
        self,
        license_id: str,
        machine_fingerprint: str
    ) -> Tuple[bool, Optional[str], str]:
        """
        Request a license seat.
        
        Returns:
            Tuple of (granted, session_id, message)
        """
        with self._lock:
            # Load current seats from database
            self._load_seats()
            
            # Check if machine already has a seat
            for session_id, seat in self._seats.items():
                if seat.machine_fingerprint == machine_fingerprint:
                    # Update activity
                    seat.last_activity = datetime.utcnow()
                    self._save_seat(seat)
                    self._log_action(session_id, "renewed", machine_fingerprint)
                    return True, session_id, "Seat renewed"
            
            # Check if seats available
            active_count = len(self._seats)
            if active_count >= self.max_seats:
                return False, None, f"No seats available ({active_count}/{self.max_seats} in use)"
            
            # Grant new seat
            session_id = secrets.token_urlsafe(32)
            seat = Seat(
                session_id=session_id,
                machine_fingerprint=machine_fingerprint,
                license_id=license_id,
                claimed_at=datetime.utcnow(),
                last_activity=datetime.utcnow()
            )
            
            self._seats[session_id] = seat
            self._save_seat(seat)
            self._log_action(session_id, "claimed", machine_fingerprint)
            
            return True, session_id, f"Seat granted ({active_count + 1}/{self.max_seats})"
    
    def release_seat(self, session_id: str, machine_fingerprint: str) -> Tuple[bool, str]:
        """Release a license seat"""
        with self._lock:
            if session_id in self._seats:
                seat = self._seats[session_id]
                if seat.machine_fingerprint == machine_fingerprint:
                    del self._seats[session_id]
                    self._delete_seat(session_id)
                    self._log_action(session_id, "released", machine_fingerprint)
                    return True, "Seat released"
            
            return False, "Session not found"
    
    def heartbeat(self, session_id: str, machine_fingerprint: str) -> Tuple[bool, str]:
        """Update seat activity"""
        with self._lock:
            if session_id in self._seats:
                seat = self._seats[session_id]
                if seat.machine_fingerprint == machine_fingerprint:
                    seat.last_activity = datetime.utcnow()
                    self._save_seat(seat)
                    return True, "Heartbeat recorded"
            
            return False, "Session not found"
    
    def get_status(self) -> Dict:
        """Get server status"""
        with self._lock:
            self._load_seats()
            
            return {
                "max_seats": self.max_seats,
                "active_seats": len(self._seats),
                "available_seats": self.max_seats - len(self._seats),
                "sessions": [
                    {
                        "session_id": seat.session_id[:8] + "...",
                        "machine": seat.machine_fingerprint[:8] + "...",
                        "claimed_at": seat.claimed_at.isoformat(),
                        "last_activity": seat.last_activity.isoformat()
                    }
                    for seat in self._seats.values()
                ]
            }
    
    def cleanup_expired(self):
        """Remove expired sessions"""
        with self._lock:
            self._load_seats()
            
            cutoff = datetime.utcnow() - timedelta(minutes=SESSION_TIMEOUT_MINUTES)
            expired = [
                sid for sid, seat in self._seats.items()
                if seat.last_activity < cutoff
            ]
            
            for session_id in expired:
                seat = self._seats[session_id]
                del self._seats[session_id]
                self._delete_seat(session_id)
                self._log_action(session_id, "expired", seat.machine_fingerprint)
            
            if expired:
                print(f"Cleaned up {len(expired)} expired sessions")
    
    def _load_seats(self):
        """Load seats from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM seats")
        
        self._seats = {}
        for row in cursor.fetchall():
            seat = Seat(
                session_id=row[0],
                machine_fingerprint=row[1],
                license_id=row[2],
                claimed_at=datetime.fromisoformat(row[3]),
                last_activity=datetime.fromisoformat(row[4])
            )
            self._seats[seat.session_id] = seat
        
        conn.close()
    
    def _save_seat(self, seat: Seat):
        """Save seat to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO seats 
            (session_id, machine_fingerprint, license_id, claimed_at, last_activity)
            VALUES (?, ?, ?, ?, ?)
        """, (
            seat.session_id,
            seat.machine_fingerprint,
            seat.license_id,
            seat.claimed_at.isoformat(),
            seat.last_activity.isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    def _delete_seat(self, session_id: str):
        """Delete seat from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM seats WHERE session_id = ?", (session_id,))
        
        conn.commit()
        conn.close()
    
    def _log_action(self, session_id: str, action: str, machine_fingerprint: str, details: str = None):
        """Log action to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO usage_log (session_id, action, machine_fingerprint, details)
            VALUES (?, ?, ?, ?)
        """, (session_id, action, machine_fingerprint, details))
        
        conn.commit()
        conn.close()


# Flask application
app = Flask(__name__)
license_manager: Optional[FloatingLicenseManager] = None


def get_license_manager() -> FloatingLicenseManager:
    global license_manager
    if license_manager is None:
        license_manager = FloatingLicenseManager()
    return license_manager


def require_auth(f):
    """Decorator for API key authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # In production, implement proper API key validation
        return f(*args, **kwargs)
    return decorated


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()})


@app.route('/seat/request', methods=['POST'])
def request_seat():
    """Request a license seat"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Invalid request"}), 400
    
    license_id = data.get('license_id')
    machine_fingerprint = data.get('machine_fingerprint')
    
    if not license_id or not machine_fingerprint:
        return jsonify({"error": "Missing required fields"}), 400
    
    manager = get_license_manager()
    granted, session_id, message = manager.request_seat(license_id, machine_fingerprint)
    
    if granted:
        return jsonify({
            "granted": True,
            "session_id": session_id,
            "message": message
        })
    else:
        return jsonify({
            "granted": False,
            "message": message
        }), 503


@app.route('/seat/release', methods=['POST'])
def release_seat():
    """Release a license seat"""
    data = request.get_json()
    
    session_id = data.get('session_id')
    machine_fingerprint = data.get('machine_fingerprint')
    
    if not session_id or not machine_fingerprint:
        return jsonify({"error": "Missing required fields"}), 400
    
    manager = get_license_manager()
    success, message = manager.release_seat(session_id, machine_fingerprint)
    
    if success:
        return jsonify({"released": True, "message": message})
    else:
        return jsonify({"released": False, "message": message}), 404


@app.route('/seat/heartbeat', methods=['POST'])
def heartbeat():
    """Update seat activity"""
    data = request.get_json()
    
    session_id = data.get('session_id')
    machine_fingerprint = data.get('machine_fingerprint')
    
    if not session_id or not machine_fingerprint:
        return jsonify({"error": "Missing required fields"}), 400
    
    manager = get_license_manager()
    success, message = manager.heartbeat(session_id, machine_fingerprint)
    
    if success:
        return jsonify({"alive": True, "message": message})
    else:
        return jsonify({"alive": False, "message": message}), 404


@app.route('/status', methods=['GET'])
@require_auth
def status():
    """Get server status"""
    manager = get_license_manager()
    return jsonify(manager.get_status())


@app.route('/usage', methods=['GET'])
@require_auth
def usage():
    """Get usage history"""
    # Implementation would query usage_log table
    return jsonify({"message": "Usage history endpoint"})


def cleanup_thread():
    """Background thread for cleaning up expired sessions"""
    while True:
        time.sleep(CLEANUP_INTERVAL_SECONDS)
        try:
            get_license_manager().cleanup_expired()
        except Exception as e:
            print(f"Cleanup error: {e}")


def run_server(port: int = DEFAULT_PORT, max_seats: int = 10, database: str = DEFAULT_DATABASE):
    """Run the floating license server"""
    global license_manager
    
    print("=" * 50)
    print("  TrajectIQ Floating License Server")
    print("=" * 50)
    print(f"\nPort: {port}")
    print(f"Max Seats: {max_seats}")
    print(f"Database: {database}")
    print(f"Session Timeout: {SESSION_TIMEOUT_MINUTES} minutes")
    print("\nEndpoints:")
    print(f"  GET  /health         - Health check")
    print(f"  POST /seat/request   - Request a seat")
    print(f"  POST /seat/release   - Release a seat")
    print(f"  POST /seat/heartbeat - Keep seat alive")
    print(f"  GET  /status         - Server status")
    print("\nStarting server...\n")
    
    # Initialize license manager
    license_manager = FloatingLicenseManager(db_path=database, max_seats=max_seats)
    
    # Start cleanup thread
    cleanup = threading.Thread(target=cleanup_thread, daemon=True)
    cleanup.start()
    
    # Run Flask app
    app.run(host='0.0.0.0', port=port, threaded=True)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description="TrajectIQ Floating License Server")
    parser.add_argument('--port', type=int, default=DEFAULT_PORT, help='Server port')
    parser.add_argument('--max-seats', type=int, default=10, help='Maximum concurrent seats')
    parser.add_argument('--database', type=str, default=DEFAULT_DATABASE, help='Database path')
    
    args = parser.parse_args()
    
    run_server(
        port=args.port,
        max_seats=args.max_seats,
        database=args.database
    )
