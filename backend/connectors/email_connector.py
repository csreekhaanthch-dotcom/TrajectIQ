"""
TrajectIQ Email Connector
=========================
Connects to email sources (IMAP/Gmail/Exchange) to retrieve resumes.
Supports multiple email providers with secure authentication.
"""

import json
import imaplib
import os
import re
from datetime import datetime
from email.header import decode_header
from email.utils import parseaddr
from email.message import Message
from email import message_from_bytes
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path
import hashlib

from core.config import config
from core.logger import get_logger, log_audit


class EmailConnector:
    """
    Email connector for retrieving candidate resumes.
    Supports IMAP, Gmail API, and Microsoft Exchange.
    """
    
    PROVIDERS = {
        "gmail": {
            "imap_server": "imap.gmail.com",
            "imap_port": 993,
            "oauth_support": True
        },
        "outlook": {
            "imap_server": "outlook.office365.com",
            "imap_port": 993,
            "oauth_support": True
        },
        "exchange": {
            "imap_server": "outlook.office365.com",
            "imap_port": 993,
            "oauth_support": True
        },
        "yahoo": {
            "imap_server": "imap.mail.yahoo.com",
            "imap_port": 993,
            "oauth_support": False
        },
        "custom": {
            "imap_server": None,
            "imap_port": 993,
            "oauth_support": False
        }
    }
    
    def __init__(self, provider: str = "gmail"):
        """
        Initialize email connector.
        
        Args:
            provider: Email provider name
        """
        self.logger = get_logger("trajectiq.email_connector")
        self.provider = provider.lower()
        self.provider_config = self.PROVIDERS.get(self.provider, self.PROVIDERS["custom"])
        self.imap_connection = None
    
    def connect(
        self,
        username: str,
        password: str,
        oauth_token: Optional[str] = None,
        custom_server: Optional[str] = None
    ) -> bool:
        """
        Connect to email server.
        
        Args:
            username: Email username
            password: Email password or app password
            oauth_token: OAuth token for providers that support it
            custom_server: Custom IMAP server (for custom provider)
            
        Returns:
            True if connected successfully
        """
        try:
            server = custom_server or self.provider_config["imap_server"]
            port = self.provider_config["imap_port"]
            
            if not server:
                raise ValueError("IMAP server not configured")
            
            self.imap_connection = imaplib.IMAP4_SSL(server, port)
            
            # Authenticate
            if oauth_token and self.provider_config["oauth_support"]:
                # OAuth authentication
                auth_string = self._build_oauth_string(username, oauth_token)
                self.imap_connection.authenticate("XOAUTH2", lambda x: auth_string)
            else:
                # Basic authentication
                self.imap_connection.login(username, password)
            
            self.logger.info(f"Connected to {self.provider} email server")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to connect to email server: {str(e)}")
            return False
    
    def disconnect(self) -> None:
        """Disconnect from email server"""
        if self.imap_connection:
            try:
                self.imap_connection.close()
                self.imap_connection.logout()
            except:
                pass
            finally:
                self.imap_connection = None
    
    def fetch_resumes(
        self,
        folder: str = "INBOX",
        since_date: Optional[datetime] = None,
        limit: int = 100,
        unread_only: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Fetch resume attachments from emails.
        
        Args:
            folder: Email folder to search
            since_date: Only fetch emails after this date
            limit: Maximum number of emails to process
            unread_only: Only fetch unread emails
            
        Returns:
            List of resume data dictionaries
        """
        if not self.imap_connection:
            raise RuntimeError("Not connected to email server")
        
        resumes = []
        
        try:
            # Select folder
            self.imap_connection.select(folder)
            
            # Build search criteria
            search_criteria = []
            
            if since_date:
                date_str = since_date.strftime("%d-%b-%Y")
                search_criteria.append(f'(SINCE "{date_str}")')
            
            if unread_only:
                search_criteria.append("(UNSEEN)")
            
            search_query = " ".join(search_criteria) if search_criteria else "ALL"
            
            # Search for emails
            status, message_ids = self.imap_connection.search(None, search_query)
            
            if status != "OK":
                return resumes
            
            ids = message_ids[0].split()
            ids = ids[-limit:]  # Get most recent emails
            
            for msg_id in ids:
                try:
                    resume_data = self._process_email(msg_id)
                    if resume_data:
                        resumes.append(resume_data)
                except Exception as e:
                    self.logger.warning(f"Failed to process email {msg_id}: {str(e)}")
                    continue
            
            log_audit(
                action="email_fetch",
                module="email_connector",
                details={
                    "folder": folder,
                    "emails_processed": len(ids),
                    "resumes_found": len(resumes)
                }
            )
            
        except Exception as e:
            self.logger.error(f"Failed to fetch resumes: {str(e)}")
        
        return resumes
    
    def _process_email(self, msg_id: bytes) -> Optional[Dict[str, Any]]:
        """Process a single email and extract resume"""
        
        status, msg_data = self.imap_connection.fetch(msg_id, "(RFC822)")
        
        if status != "OK":
            return None
        
        raw_email = msg_data[0][1]
        msg = message_from_bytes(raw_email)
        
        # Extract email metadata
        subject = self._decode_header(msg.get("Subject", ""))
        from_addr = parseaddr(msg.get("From", ""))
        date_str = msg.get("Date", "")
        
        # Find resume attachments
        attachments = self._extract_attachments(msg)
        
        if not attachments:
            return None
        
        # Return first valid resume attachment
        for attachment in attachments:
            if self._is_resume_file(attachment["filename"]):
                return {
                    "source": "email",
                    "email_id": msg_id.decode(),
                    "subject": subject,
                    "sender_email": from_addr[1],
                    "sender_name": from_addr[0],
                    "received_date": date_str,
                    "filename": attachment["filename"],
                    "content": attachment["content"],
                    "content_type": attachment["content_type"],
                    "file_extension": self._get_extension(attachment["filename"])
                }
        
        return None
    
    def _extract_attachments(self, msg: Message) -> List[Dict]:
        """Extract attachments from email message"""
        
        attachments = []
        
        for part in msg.walk():
            if part.get_content_maintype() == "multipart":
                continue
            
            if part.get("Content-Disposition") is None:
                continue
            
            filename = part.get_filename()
            
            if filename:
                filename = self._decode_header(filename)
                content = part.get_payload(decode=True)
                
                attachments.append({
                    "filename": filename,
                    "content": content,
                    "content_type": part.get_content_type()
                })
        
        return attachments
    
    def _decode_header(self, header: str) -> str:
        """Decode email header"""
        
        if not header:
            return ""
        
        decoded_parts = decode_header(header)
        result = []
        
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                result.append(part.decode(encoding or "utf-8", errors="ignore"))
            else:
                result.append(part)
        
        return "".join(result)
    
    def _is_resume_file(self, filename: str) -> bool:
        """Check if file is a resume"""
        
        resume_extensions = [".pdf", ".doc", ".docx", ".rtf", ".txt"]
        resume_keywords = ["resume", "cv", "curriculum"]
        
        ext = self._get_extension(filename)
        
        if ext in resume_extensions:
            return True
        
        filename_lower = filename.lower()
        return any(kw in filename_lower for kw in resume_keywords)
    
    def _get_extension(self, filename: str) -> str:
        """Get file extension"""
        
        if not filename:
            return ""
        
        parts = filename.rsplit(".", 1)
        return f".{parts[-1].lower()}" if len(parts) > 1 else ""
    
    def _build_oauth_string(self, username: str, token: str) -> bytes:
        """Build OAuth authentication string"""
        
        auth_string = f"user={username}\x01auth=Bearer {token}\x01\x01"
        return auth_string.encode()


class GmailAPIConnector:
    """
    Gmail API connector for more advanced Gmail integration.
    Requires Google Cloud Console setup.
    """
    
    def __init__(self, credentials_path: Optional[str] = None):
        """
        Initialize Gmail API connector.
        
        Args:
            credentials_path: Path to Google credentials JSON file
        """
        self.logger = get_logger("trajectiq.gmail_api_connector")
        self.credentials_path = credentials_path
        self.service = None
    
    def authenticate(self) -> bool:
        """
        Authenticate with Gmail API.
        
        Returns:
            True if authenticated successfully
        """
        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build
            
            credentials = service_account.Credentials.from_service_account_file(
                self.credentials_path,
                scopes=["https://www.googleapis.com/auth/gmail.readonly"]
            )
            
            self.service = build("gmail", "v1", credentials=credentials)
            
            self.logger.info("Authenticated with Gmail API")
            return True
            
        except ImportError:
            self.logger.error("Google API libraries not installed")
            return False
        except Exception as e:
            self.logger.error(f"Gmail API authentication failed: {str(e)}")
            return False
    
    def fetch_resumes(
        self,
        query: str = "has:attachment (resume OR cv)",
        max_results: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch resume attachments using Gmail API.
        
        Args:
            query: Gmail search query
            max_results: Maximum number of results
            
        Returns:
            List of resume data dictionaries
        """
        if not self.service:
            raise RuntimeError("Not authenticated with Gmail API")
        
        resumes = []
        
        try:
            # Search for messages
            results = self.service.users().messages().list(
                userId="me",
                q=query,
                maxResults=max_results
            ).execute()
            
            messages = results.get("messages", [])
            
            for msg in messages:
                resume_data = self._process_gmail_message(msg["id"])
                if resume_data:
                    resumes.append(resume_data)
            
        except Exception as e:
            self.logger.error(f"Failed to fetch Gmail messages: {str(e)}")
        
        return resumes
    
    def _process_gmail_message(self, msg_id: str) -> Optional[Dict[str, Any]]:
        """Process a Gmail message and extract resume"""
        
        try:
            msg = self.service.users().messages().get(
                userId="me",
                id=msg_id
            ).execute()
            
            headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
            
            # Find attachments
            parts = msg["payload"].get("parts", [])
            
            for part in parts:
                filename = part.get("filename")
                
                if filename and self._is_resume_file(filename):
                    attachment_id = part["body"].get("attachmentId")
                    
                    if attachment_id:
                        attachment = self.service.users().messages().attachments().get(
                            userId="me",
                            messageId=msg_id,
                            id=attachment_id
                        ).execute()
                        
                        import base64
                        content = base64.urlsafe_b64decode(attachment["data"])
                        
                        return {
                            "source": "gmail_api",
                            "email_id": msg_id,
                            "subject": headers.get("Subject", ""),
                            "sender_email": self._extract_email(headers.get("From", "")),
                            "sender_name": self._extract_name(headers.get("From", "")),
                            "received_date": headers.get("Date", ""),
                            "filename": filename,
                            "content": content,
                            "file_extension": self._get_extension(filename)
                        }
            
        except Exception as e:
            self.logger.warning(f"Failed to process Gmail message {msg_id}: {str(e)}")
        
        return None
    
    def _is_resume_file(self, filename: str) -> bool:
        """Check if file is a resume"""
        resume_extensions = [".pdf", ".doc", ".docx", ".rtf"]
        ext = self._get_extension(filename)
        return ext in resume_extensions
    
    def _get_extension(self, filename: str) -> str:
        """Get file extension"""
        parts = filename.rsplit(".", 1)
        return f".{parts[-1].lower()}" if len(parts) > 1 else ""
    
    def _extract_email(self, from_header: str) -> str:
        """Extract email from From header"""
        match = re.search(r'<(.+?)>', from_header)
        return match.group(1) if match else from_header
    
    def _extract_name(self, from_header: str) -> str:
        """Extract name from From header"""
        match = re.match(r'^([^<]+)', from_header)
        return match.group(1).strip() if match else ""
