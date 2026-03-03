"""
TrajectIQ ATS Connector
=======================
Connects to Applicant Tracking Systems to retrieve candidate data.
Supports Greenhouse, Lever, Workday, and custom ATS integrations.
"""

import json
import hashlib
from datetime import datetime
from typing import Any, Dict, List, Optional
import requests

from core.config import config
from core.logger import get_logger, log_audit


class ATSConnector:
    """
    Base ATS connector with common functionality.
    """
    
    def __init__(self, api_key: str, base_url: str):
        """
        Initialize ATS connector.
        
        Args:
            api_key: API key for authentication
            base_url: Base URL for API requests
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.logger = get_logger("trajectiq.ats_connector")
        self.session = requests.Session()
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None
    ) -> Optional[Dict]:
        """
        Make authenticated API request.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            params: Query parameters
            data: Request body data
            
        Returns:
            Response JSON or None on error
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=data,
                timeout=30
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"ATS API request failed: {str(e)}")
            return None


class GreenhouseConnector(ATSConnector):
    """
    Greenhouse ATS connector.
    API Documentation: https://developers.greenhouse.io/
    """
    
    def __init__(self, api_key: str):
        super().__init__(api_key, "https://harvest.greenhouse.io/v1")
        
        # Greenhouse uses HTTP Basic Auth with API key as username
        self.session.auth = (api_key, "")
    
    def get_candidates(
        self,
        job_id: Optional[str] = None,
        status: Optional[str] = None,
        since: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get candidates from Greenhouse.
        
        Args:
            job_id: Filter by job ID
            status: Filter by status (active, hired, rejected)
            since: Filter by updated date
            limit: Maximum number of candidates
            
        Returns:
            List of normalized candidate data
        """
        candidates = []
        
        params = {"per_page": min(limit, 500)}
        
        if job_id:
            params["job_id"] = job_id
        if status:
            params["status"] = status
        if since:
            params["updated_after"] = since.isoformat()
        
        endpoint = "candidates"
        
        while len(candidates) < limit:
            response = self._make_request("GET", endpoint, params=params)
            
            if not response:
                break
            
            for candidate in response.get("candidates", response):
                normalized = self._normalize_candidate(candidate)
                candidates.append(normalized)
                
                if len(candidates) >= limit:
                    break
            
            # Check for next page
            next_link = response.get("links", {}).get("next")
            if not next_link:
                break
            
            # Parse next page URL
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(next_link)
            params = parse_qs(parsed.query)
        
        log_audit(
            action="ats_fetch",
            module="greenhouse_connector",
            details={
                "candidates_fetched": len(candidates),
                "job_id": job_id
            }
        )
        
        return candidates
    
    def get_candidate_resume(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        """
        Get resume attachment for a candidate.
        
        Args:
            candidate_id: Greenhouse candidate ID
            
        Returns:
            Resume data dictionary
        """
        # Get candidate attachments
        response = self._make_request(
            "GET",
            f"candidates/{candidate_id}/attachments"
        )
        
        if not response:
            return None
        
        # Find resume attachment
        for attachment in response:
            if attachment.get("type") == "resume":
                # Download the file
                download_url = attachment.get("download_url")
                
                if download_url:
                    file_response = self.session.get(download_url)
                    
                    if file_response.ok:
                        return {
                            "candidate_id": candidate_id,
                            "filename": attachment.get("filename"),
                            "content": file_response.content,
                            "content_type": file_response.headers.get("Content-Type"),
                            "file_extension": self._get_extension(attachment.get("filename", ""))
                        }
        
        return None
    
    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get job details from Greenhouse.
        
        Args:
            job_id: Greenhouse job ID
            
        Returns:
            Normalized job data
        """
        response = self._make_request("GET", f"jobs/{job_id}")
        
        if response:
            return self._normalize_job(response)
        
        return None
    
    def _normalize_candidate(self, candidate: Dict) -> Dict[str, Any]:
        """Normalize Greenhouse candidate to TrajectIQ format"""
        
        return {
            "source": "greenhouse",
            "candidate_id": str(candidate.get("id")),
            "first_name": candidate.get("first_name", ""),
            "last_name": candidate.get("last_name", ""),
            "full_name": f"{candidate.get('first_name', '')} {candidate.get('last_name', '')}".strip(),
            "email": candidate.get("email_addresses", [{}])[0].get("value", "") if candidate.get("email_addresses") else "",
            "phone": candidate.get("phone_numbers", [{}])[0].get("value", "") if candidate.get("phone_numbers") else "",
            "location": candidate.get("address", {}).get("value", ""),
            "created_at": candidate.get("created_at"),
            "updated_at": candidate.get("updated_at"),
            "status": candidate.get("status"),
            "applications": [
                {
                    "job_id": str(app.get("jobs", [{}])[0].get("id", "")) if app.get("jobs") else "",
                    "status": app.get("status"),
                    "applied_at": app.get("applied_at")
                }
                for app in candidate.get("applications", [])
            ],
            "tags": candidate.get("tags", []),
            "metadata": {
                "greenhouse_id": candidate.get("id"),
                "recruiter_id": candidate.get("recruiter"),
                "coordinator_id": candidate.get("coordinator")
            }
        }
    
    def _normalize_job(self, job: Dict) -> Dict[str, Any]:
        """Normalize Greenhouse job to TrajectIQ format"""
        
        return {
            "source": "greenhouse",
            "job_id": str(job.get("id")),
            "title": job.get("name", ""),
            "department": job.get("departments", [{}])[0].get("name", "") if job.get("departments") else "",
            "office": job.get("offices", [{}])[0].get("name", "") if job.get("offices") else "",
            "status": job.get("status"),
            "created_at": job.get("created_at"),
            "updated_at": job.get("updated_at"),
            "description": job.get("description"),
            "requirements": job.get("requirements"),
            "metadata": {
                "greenhouse_id": job.get("id"),
                "requisition_id": job.get("requisition_id")
            }
        }
    
    def _get_extension(self, filename: str) -> str:
        """Get file extension"""
        parts = filename.rsplit(".", 1)
        return parts[-1].lower() if len(parts) > 1 else "pdf"


class LeverConnector(ATSConnector):
    """
    Lever ATS connector.
    API Documentation: https://hire.lever.co/developer/documentation
    """
    
    def __init__(self, api_key: str, instance_name: str):
        super().__init__(api_key, f"https://api.lever.co/v1")
        self.instance_name = instance_name
        self.session.headers["Authorization"] = f"Bearer {api_key}"
    
    def get_candidates(
        self,
        posting_id: Optional[str] = None,
        stage: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get candidates from Lever.
        
        Args:
            posting_id: Filter by posting ID
            stage: Filter by stage
            limit: Maximum number of candidates
            
        Returns:
            List of normalized candidate data
        """
        candidates = []
        
        params = {"limit": min(limit, 100)}
        
        if posting_id:
            params["posting_id"] = posting_id
        
        endpoint = "candidates"
        
        while len(candidates) < limit:
            response = self._make_request("GET", endpoint, params=params)
            
            if not response:
                break
            
            for candidate in response.get("data", []):
                normalized = self._normalize_candidate(candidate)
                candidates.append(normalized)
                
                if len(candidates) >= limit:
                    break
            
            # Check for next page
            next_link = response.get("links", {}).get("next")
            if not next_link:
                break
            
            params = {"limit": min(limit - len(candidates), 100)}
        
        return candidates
    
    def get_candidate_resume(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        """Get resume for a Lever candidate"""
        
        response = self._make_request(
            "GET",
            f"candidates/{candidate_id}/applications"
        )
        
        if not response:
            return None
        
        for application in response.get("data", []):
            for file in application.get("files", []):
                if file.get("type") == "resume":
                    # Download file
                    download_url = file.get("downloadUrl")
                    
                    if download_url:
                        file_response = self.session.get(download_url)
                        
                        if file_response.ok:
                            return {
                                "candidate_id": candidate_id,
                                "filename": file.get("name"),
                                "content": file_response.content,
                                "content_type": file.get("contentType"),
                                "file_extension": self._get_extension(file.get("name", ""))
                            }
        
        return None
    
    def _normalize_candidate(self, candidate: Dict) -> Dict[str, Any]:
        """Normalize Lever candidate to TrajectIQ format"""
        
        return {
            "source": "lever",
            "candidate_id": candidate.get("id"),
            "first_name": candidate.get("name", {}).get("first", ""),
            "last_name": candidate.get("name", {}).get("last", ""),
            "full_name": f"{candidate.get('name', {}).get('first', '')} {candidate.get('name', {}).get('last', '')}".strip(),
            "email": candidate.get("emails", [{}])[0] if candidate.get("emails") else "",
            "phone": candidate.get("phones", [{}])[0] if candidate.get("phones") else "",
            "location": candidate.get("location", ""),
            "created_at": candidate.get("createdAt"),
            "updated_at": candidate.get("updatedAt"),
            "stage": candidate.get("stage"),
            "applications": [
                {
                    "posting_id": app.get("posting"),
                    "stage": app.get("stage")
                }
                for app in candidate.get("applications", [])
            ],
            "tags": candidate.get("tags", []),
            "metadata": {
                "lever_id": candidate.get("id"),
                "owner_id": candidate.get("owner")
            }
        }
    
    def _get_extension(self, filename: str) -> str:
        """Get file extension"""
        parts = filename.rsplit(".", 1)
        return parts[-1].lower() if len(parts) > 1 else "pdf"


class WorkdayConnector(ATSConnector):
    """
    Workday ATS connector.
    Note: Workday requires custom integration setup.
    """
    
    def __init__(self, api_key: str, tenant_id: str, base_url: str):
        super().__init__(api_key, base_url)
        self.tenant_id = tenant_id
        self.session.headers["Authorization"] = f"Bearer {api_key}"
    
    def get_candidates(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get candidates from Workday"""
        # Workday integration varies significantly between implementations
        # This is a template that should be customized for your Workday setup
        
        response = self._make_request(
            "GET",
            f"recruiting/v1/{self.tenant_id}/candidates",
            params={"limit": limit}
        )
        
        if not response:
            return []
        
        candidates = []
        
        for candidate in response.get("candidates", []):
            normalized = self._normalize_candidate(candidate)
            candidates.append(normalized)
        
        return candidates
    
    def _normalize_candidate(self, candidate: Dict) -> Dict[str, Any]:
        """Normalize Workday candidate to TrajectIQ format"""
        
        return {
            "source": "workday",
            "candidate_id": candidate.get("id"),
            "first_name": candidate.get("name", {}).get("first", ""),
            "last_name": candidate.get("name", {}).get("last", ""),
            "full_name": candidate.get("name", {}).get("formatted", ""),
            "email": candidate.get("email"),
            "phone": candidate.get("phone"),
            "location": candidate.get("location"),
            "created_at": candidate.get("created"),
            "updated_at": candidate.get("updated"),
            "status": candidate.get("status"),
            "metadata": {
                "workday_id": candidate.get("id")
            }
        }


def get_ats_connector(
    ats_type: str,
    api_key: str,
    **kwargs
) -> ATSConnector:
    """
    Factory function to create ATS connector.
    
    Args:
        ats_type: Type of ATS (greenhouse, lever, workday)
        api_key: API key
        **kwargs: Additional connector-specific arguments
        
    Returns:
        ATS connector instance
    """
    connectors = {
        "greenhouse": GreenhouseConnector,
        "lever": LeverConnector,
        "workday": WorkdayConnector
    }
    
    connector_class = connectors.get(ats_type.lower())
    
    if not connector_class:
        raise ValueError(f"Unsupported ATS type: {ats_type}")
    
    return connector_class(api_key=api_key, **kwargs)
