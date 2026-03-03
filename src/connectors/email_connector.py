"""
TrajectIQ Enterprise - Email Connector
======================================
IMAP email integration for resume extraction.
Supports Gmail, Exchange, and custom IMAP servers.
"""

import os
import re
import email
import imaplib
import threading
import hashlib
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path


@dataclass
class EmailAttachment:
    """Email attachment data"""
    filename: str
    content_type: str
    size_bytes: int
    content: bytes
    hash: str


@dataclass
class EmailMessage:
    """Email message data"""
    message_id: str
    sender: str
    subject: str
    received_at: datetime
    body_text: str
    attachments: List[EmailAttachment]
    is_resume: bool = False
    confidence: float = 0.0


class EmailConnector:
    """
    IMAP email connector for resume extraction.
    Supports background polling and attachment processing.
    """
    
    RESUME_EXTENSIONS = {'.pdf', '.doc', '.docx', '.txt', '.rtf'}
    RESUME_KEYWORDS = [
        'resume', 'curriculum vitae', 'cv', 'application',
        'candidate', 'applicant', 'position', 'experience',
        'education', 'skills', 'work history', 'professional'
    ]
    SUBJECT_PATTERNS = [
        r'resume[:\s]', r'cv[:\s]', r'application[:\s]',
        r'candidate[:\s]', r'applying\s+for', r'job\s+application',
    ]
    
    def __init__(
        self,
        server: str,
        port: int = 993,
        username: str = "",
        password: str = "",
        use_ssl: bool = True,
        folder: str = "INBOX",
        polling_interval_minutes: int = 15
    ):
        self.server = server
        self.port = port
        self.username = username
        self.password = password
        self.use_ssl = use_ssl
        self.folder = folder
        self.polling_interval = polling_interval_minutes * 60
        
        self._connection = None
        self._polling_thread = None
        self._stop_polling = threading.Event()
        self._logger = logging.getLogger(__name__)
        self._resume_callback = None
    
    def connect(self) -> bool:
        """Establish IMAP connection"""
        try:
            if self.use_ssl:
                self._connection = imaplib.IMAP4_SSL(self.server, self.port)
            else:
                self._connection = imaplib.IMAP4(self.server, self.port)
            
            self._connection.login(self.username, self.password)
            self._logger.info(f"Connected to {self.server}")
            return True
        except Exception as e:
            self._logger.error(f"Connection failed: {e}")
            return False
    
    def disconnect(self):
        """Close IMAP connection"""
        if self._connection:
            try:
                self._connection.close()
                self._connection.logout()
            except:
                pass
            self._connection = None
    
    def start_polling(self, callback=None):
        """Start background polling for new emails"""
        self._resume_callback = callback
        self._stop_polling.clear()
        self._polling_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._polling_thread.start()
    
    def stop_polling(self):
        """Stop background polling"""
        self._stop_polling.set()
        if self._polling_thread:
            self._polling_thread.join(timeout=10)
    
    def _poll_loop(self):
        """Background polling loop"""
        while not self._stop_polling.is_set():
            try:
                if not self._connection:
                    self.connect()
                if self._connection:
                    new_resumes = self.fetch_resumes(unseen_only=True)
                    for resume in new_resumes:
                        if self._resume_callback:
                            self._resume_callback(resume)
            except Exception as e:
                self._logger.error(f"Polling error: {e}")
                self.disconnect()
            self._stop_polling.wait(self.polling_interval)
    
    def fetch_resumes(
        self,
        limit: int = 100,
        unseen_only: bool = False,
        since_date: Optional[datetime] = None
    ) -> List[EmailMessage]:
        """Fetch resume emails from mailbox"""
        if not self._connection:
            if not self.connect():
                return []
        
        messages = []
        try:
            status, _ = self._connection.select(self.folder)
            if status != 'OK':
                return []
            
            criteria = []
            if unseen_only:
                criteria.append('UNSEEN')
            if since_date:
                criteria.append(f'SINCE {since_date.strftime("%d-%b-%Y")}')
            
            search_query = ' '.join(criteria) if criteria else 'ALL'
            status, message_ids = self._connection.search(None, search_query)
            
            if status != 'OK':
                return []
            
            ids = message_ids[0].split()
            ids = ids[-limit:][::-1]
            
            for msg_id in ids:
                try:
                    message = self._process_message(msg_id)
                    if message and message.is_resume:
                        messages.append(message)
                except Exception as e:
                    self._logger.error(f"Error processing message: {e}")
        except Exception as e:
            self._logger.error(f"Fetch error: {e}")
        
        return messages
    
    def _process_message(self, msg_id: bytes) -> Optional[EmailMessage]:
        """Process a single email message"""
        status, msg_data = self._connection.fetch(msg_id, '(RFC822)')
        if status != 'OK':
            return None
        
        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)
        
        message_id = msg.get('Message-ID', '')
        sender = msg.get('From', '')
        subject = msg.get('Subject', '')
        date_str = msg.get('Date', '')
        
        try:
            received_at = email.utils.parsedate_to_datetime(date_str)
        except:
            received_at = datetime.utcnow()
        
        body_text = self._extract_body(msg)
        attachments = self._extract_attachments(msg)
        is_resume, confidence = self._detect_resume(subject, body_text, attachments)
        
        return EmailMessage(
            message_id=message_id, sender=sender, subject=subject,
            received_at=received_at, body_text=body_text,
            attachments=attachments, is_resume=is_resume, confidence=confidence
        )
    
    def _extract_body(self, msg) -> str:
        """Extract plain text body from email"""
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == 'text/plain':
                    try:
                        payload = part.get_payload(decode=True)
                        charset = part.get_content_charset() or 'utf-8'
                        body = payload.decode(charset, errors='ignore')
                        break
                    except:
                        continue
        else:
            try:
                payload = msg.get_payload(decode=True)
                charset = msg.get_content_charset() or 'utf-8'
                body = payload.decode(charset, errors='ignore')
            except:
                pass
        return body
    
    def _extract_attachments(self, msg) -> List[EmailAttachment]:
        """Extract attachments from email"""
        attachments = []
        if not msg.is_multipart():
            return attachments
        
        for part in msg.walk():
            if 'attachment' in part.get('Content-Disposition', ''):
                filename = part.get_filename()
                if filename:
                    try:
                        content = part.get_payload(decode=True)
                        attachments.append(EmailAttachment(
                            filename=filename,
                            content_type=part.get_content_type(),
                            size_bytes=len(content) if content else 0,
                            content=content or b'',
                            hash=hashlib.sha256(content or b'').hexdigest()[:16]
                        ))
                    except Exception as e:
                        self._logger.error(f"Error extracting attachment: {e}")
        return attachments
    
    def _detect_resume(self, subject: str, body: str, attachments: List[EmailAttachment]) -> Tuple[bool, float]:
        """Detect if email contains a resume"""
        confidence = 0.0
        
        for pattern in self.SUBJECT_PATTERNS:
            if re.search(pattern, subject, re.IGNORECASE):
                confidence += 0.3
                break
        
        body_lower = body.lower()
        keyword_matches = sum(1 for kw in self.RESUME_KEYWORDS if kw in body_lower)
        confidence += min(0.3, keyword_matches * 0.05)
        
        for attachment in attachments:
            ext = Path(attachment.filename).suffix.lower()
            if ext in self.RESUME_EXTENSIONS:
                confidence += 0.4
                filename_lower = attachment.filename.lower()
                if any(kw in filename_lower for kw in ['resume', 'cv', 'curriculum']):
                    confidence += 0.2
                break
        
        confidence = min(1.0, confidence)
        return confidence >= 0.3, confidence
    
    def save_attachment(self, attachment: EmailAttachment, directory: str) -> str:
        """Save attachment to file"""
        os.makedirs(directory, exist_ok=True)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        safe_name = re.sub(r'[^\w\-\.]', '_', attachment.filename)
        filename = f"{timestamp}_{safe_name}"
        filepath = os.path.join(directory, filename)
        with open(filepath, 'wb') as f:
            f.write(attachment.content)
        return filepath


class GmailConnector(EmailConnector):
    """Gmail-specific connector"""
    def __init__(self, username: str, password: str, **kwargs):
        super().__init__(
            server='imap.gmail.com', port=993,
            username=username, password=password, use_ssl=True, **kwargs
        )


class OutlookConnector(EmailConnector):
    """Microsoft Outlook connector"""
    def __init__(self, username: str = "", password: str = "", **kwargs):
        super().__init__(
            server='outlook.office365.com', port=993,
            username=username, password=password, use_ssl=True, **kwargs
        )
