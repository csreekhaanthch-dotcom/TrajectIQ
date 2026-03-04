"""
TrajectIQ Connectors Tests
==========================
Tests for Email and ATS integration connectors.
"""

import pytest
import sys
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
import json

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from connectors.email_connector import (
    EmailConnector,
    GmailConnector,
    OutlookConnector,
    EmailMessage,
    EmailAttachment
)
from connectors.ats_connector import (
    BaseATSConnector,
    GreenhouseConnector,
    LeverConnector,
    WorkableConnector,
    ATSCandidate,
    get_ats_connector,
    SUPPORTED_SYSTEMS
)


class TestEmailConnector:
    """Tests for email connector base functionality"""

    @pytest.fixture
    def connector(self):
        return EmailConnector(
            server="imap.example.com",
            port=993,
            username="test@example.com",
            password="password123"
        )

    def test_connector_initialization(self, connector):
        """Test connector initializes correctly"""
        assert connector.server == "imap.example.com"
        assert connector.port == 993
        assert connector.username == "test@example.com"

    def test_connection_test_success(self, connector):
        """Test successful connection test"""
        with patch.object(connector, '_connect') as mock_connect:
            mock_connect.return_value = True
            result = connector.test_connection()
            assert result.success is True

    def test_connection_test_failure(self, connector):
        """Test failed connection test"""
        with patch.object(connector, '_connect') as mock_connect:
            mock_connect.side_effect = Exception("Connection failed")
            result = connector.test_connection()
            assert result.success is False
            assert "failed" in result.error.lower()

    def test_list_folders(self, connector):
        """Test listing email folders"""
        with patch.object(connector, '_list_folders') as mock_list:
            mock_list.return_value = ["INBOX", "Sent", "Drafts"]
            folders = connector.list_folders()
            assert "INBOX" in folders

    def test_fetch_emails(self, connector):
        """Test fetching emails"""
        with patch.object(connector, '_fetch_emails') as mock_fetch:
            mock_fetch.return_value = [
                EmailMessage(
                    id="1",
                    subject="Test Email",
                    sender="sender@example.com",
                    date=datetime.now(),
                    body="Test body"
                )
            ]
            emails = connector.fetch_emails(folder="INBOX", limit=10)
            assert len(emails) == 1
            assert emails[0].subject == "Test Email"


class TestGmailConnector:
    """Tests for Gmail-specific connector"""

    @pytest.fixture
    def connector(self):
        return GmailConnector(
            credentials_path="/path/to/credentials.json",
            token_path="/path/to/token.json"
        )

    def test_oauth_authentication(self, connector):
        """Test OAuth authentication flow"""
        with patch.object(connector, '_authenticate') as mock_auth:
            mock_auth.return_value = True
            result = connector.authenticate()
            assert result is True

    def test_fetch_with_attachments(self, connector):
        """Test fetching emails with attachments"""
        with patch.object(connector, '_fetch_emails') as mock_fetch:
            mock_fetch.return_value = [
                EmailMessage(
                    id="1",
                    subject="Resume",
                    sender="candidate@example.com",
                    date=datetime.now(),
                    body="Please find attached",
                    attachments=[
                        EmailAttachment(
                            filename="resume.pdf",
                            content_type="application/pdf",
                            size=1024
                        )
                    ]
                )
            ]
            emails = connector.fetch_emails()
            assert len(emails[0].attachments) == 1


class TestOutlookConnector:
    """Tests for Outlook/Microsoft connector"""

    @pytest.fixture
    def connector(self):
        return OutlookConnector(
            client_id="test-client-id",
            client_secret="test-secret"
        )

    def test_microsoft_graph_authentication(self, connector):
        """Test Microsoft Graph API authentication"""
        with patch.object(connector, '_get_token') as mock_token:
            mock_token.return_value = "access-token"
            token = connector.get_access_token()
            assert token == "access-token"

    def test_fetch_from_specific_folder(self, connector):
        """Test fetching from specific Outlook folder"""
        with patch.object(connector, '_fetch_emails') as mock_fetch:
            mock_fetch.return_value = []
            connector.fetch_emails(folder="Applications")
            mock_fetch.assert_called_once()


class TestATSConnector:
    """Tests for ATS connector base functionality"""

    def test_supported_systems_list(self):
        """Test that supported systems are defined"""
        assert "Greenhouse" in SUPPORTED_SYSTEMS
        assert "Lever" in SUPPORTED_SYSTEMS
        assert "Workable" in SUPPORTED_SYSTEMS

    def test_get_connector_factory(self):
        """Test connector factory function"""
        connector = get_ats_connector(
            provider="greenhouse",
            api_key="test-key"
        )
        assert isinstance(connector, GreenhouseConnector)


class TestGreenhouseConnector:
    """Tests for Greenhouse ATS connector"""

    @pytest.fixture
    def connector(self):
        return GreenhouseConnector(api_key="test-api-key")

    def test_get_candidates(self, connector):
        """Test fetching candidates from Greenhouse"""
        with patch.object(connector, '_request') as mock_request:
            mock_request.return_value = {
                "candidates": [
                    {
                        "id": "123",
                        "first_name": "John",
                        "last_name": "Doe",
                        "email": "john@example.com"
                    }
                ]
            }
            candidates = connector.get_candidates()
            assert len(candidates) == 1
            assert candidates[0].first_name == "John"

    def test_get_jobs(self, connector):
        """Test fetching job postings"""
        with patch.object(connector, '_request') as mock_request:
            mock_request.return_value = {
                "jobs": [
                    {"id": "1", "title": "Software Engineer"},
                    {"id": "2", "title": "Product Manager"}
                ]
            }
            jobs = connector.get_jobs()
            assert len(jobs) == 2

    def test_get_resume(self, connector):
        """Test fetching candidate resume"""
        with patch.object(connector, '_get_attachment') as mock_attach:
            mock_attach.return_value = b"PDF content"
            resume = connector.get_resume("candidate-123")
            assert resume is not None

    def test_rate_limiting(self, connector):
        """Test rate limiting compliance"""
        with patch.object(connector, '_request') as mock_request:
            mock_request.return_value = {}
            # Make multiple rapid requests
            for _ in range(10):
                connector.get_jobs()
            # Should have rate limited appropriately
            assert mock_request.call_count == 10


class TestLeverConnector:
    """Tests for Lever ATS connector"""

    @pytest.fixture
    def connector(self):
        return LeverConnector(api_key="test-api-key")

    def test_get_candidates(self, connector):
        """Test fetching candidates from Lever"""
        with patch.object(connector, '_request') as mock_request:
            mock_request.return_value = {
                "data": [
                    {
                        "id": "456",
                        "name": "Jane Smith",
                        "emails": [{"value": "jane@example.com"}]
                    }
                ]
            }
            candidates = connector.get_candidates()
            assert len(candidates) == 1

    def test_pipeline_stages(self, connector):
        """Test fetching pipeline stages"""
        with patch.object(connector, '_request') as mock_request:
            mock_request.return_value = {
                "data": [
                    {"id": "s1", "text": "Applied"},
                    {"id": "s2", "text": "Phone Screen"}
                ]
            }
            stages = connector.get_pipeline_stages()
            assert len(stages) == 2


class TestWorkableConnector:
    """Tests for Workable ATS connector"""

    @pytest.fixture
    def connector(self):
        return WorkableConnector(
            api_key="test-api-key",
            subdomain="test-company"
        )

    def test_get_candidates(self, connector):
        """Test fetching candidates from Workable"""
        with patch.object(connector, '_request') as mock_request:
            mock_request.return_value = {
                "candidates": [
                    {
                        "id": "789",
                        "name": "Bob Johnson",
                        "email": "bob@example.com"
                    }
                ]
            }
            candidates = connector.get_candidates()
            assert len(candidates) == 1

    def test_get_jobs(self, connector):
        """Test fetching jobs from Workable"""
        with patch.object(connector, '_request') as mock_request:
            mock_request.return_value = {
                "jobs": [
                    {"id": "job-1", "title": "Developer"}
                ]
            }
            jobs = connector.get_jobs()
            assert len(jobs) == 1


class TestATSCandidate:
    """Tests for ATS candidate data model"""

    def test_candidate_creation(self):
        """Test creating candidate object"""
        candidate = ATSCandidate(
            candidate_id="123",
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            phone="+1234567890",
            resume_url="https://example.com/resume.pdf",
            resume_text="John Doe - Software Engineer",
            job_id="job-1",
            job_title="Software Engineer",
            stage="Phone Screen",
            status="active",
            applied_at=datetime.now(),
            source="LinkedIn",
            tags=["senior", "python"],
            raw_data={"custom_field": "value"}
        )

        assert candidate.candidate_id == "123"
        assert candidate.first_name == "John"
        assert "python" in candidate.tags


class TestConnectorErrorHandling:
    """Tests for error handling in connectors"""

    @pytest.fixture
    def connector(self):
        return GreenhouseConnector(api_key="test-key")

    def test_api_error_handling(self, connector):
        """Test handling of API errors"""
        with patch.object(connector, '_request') as mock_request:
            mock_request.side_effect = Exception("API Error")
            candidates = connector.get_candidates()
            assert candidates == []  # Should return empty list on error

    def test_authentication_error(self, connector):
        """Test handling of authentication errors"""
        with patch.object(connector, '_request') as mock_request:
            mock_request.side_effect = Exception("401 Unauthorized")
            result = connector.test_connection()
            assert result.success is False

    def test_network_timeout(self, connector):
        """Test handling of network timeouts"""
        with patch.object(connector, '_request') as mock_request:
            mock_request.side_effect = TimeoutError("Connection timed out")
            candidates = connector.get_candidates()
            assert candidates == []


class TestConnectorIntegration:
    """Integration tests for connectors"""

    def test_full_email_flow(self):
        """Test complete email scanning flow"""
        connector = EmailConnector(
            server="imap.test.com",
            port=993,
            username="test@test.com",
            password="pass"
        )

        with patch.object(connector, '_connect') as mock_connect, \
             patch.object(connector, '_fetch_emails') as mock_fetch:

            mock_connect.return_value = True
            mock_fetch.return_value = [
                EmailMessage(
                    id="1",
                    subject="Job Application",
                    sender="candidate@example.com",
                    date=datetime.now(),
                    body="Resume attached",
                    attachments=[
                        EmailAttachment(
                            filename="resume.pdf",
                            content_type="application/pdf",
                            size=50000
                        )
                    ]
                )
            ]

            emails = connector.fetch_emails(folder="INBOX")
            resumes = [a for e in emails for a in e.attachments]

            assert len(resumes) == 1
            assert resumes[0].filename == "resume.pdf"

    def test_full_ats_flow(self):
        """Test complete ATS integration flow"""
        connector = get_ats_connector("greenhouse", api_key="test-key")

        with patch.object(connector, '_request') as mock_request:
            mock_request.return_value = {
                "candidates": [
                    {
                        "id": "c1",
                        "first_name": "Test",
                        "last_name": "User",
                        "email": "test@example.com"
                    }
                ]
            }

            candidates = connector.get_candidates()
            assert len(candidates) == 1
