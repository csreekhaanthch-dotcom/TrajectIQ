"""
TrajectIQ Enterprise - ATS Connectors
=====================================
Integration with Applicant Tracking Systems.
Supports Greenhouse, Lever, and Workable.
"""

import os
import json
import hashlib
import logging
import requests
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from abc import ABC, abstractmethod


# Supported ATS providers
SUPPORTED_SYSTEMS = ["Greenhouse", "Lever", "Workable"]


@dataclass
class ATSCandidate:
    """Candidate from ATS"""
    candidate_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    resume_url: Optional[str]
    resume_text: Optional[str]
    job_id: str
    job_title: str
    stage: str
    status: str
    applied_at: datetime
    source: str
    tags: List[str]
    raw_data: Dict[str, Any]


class BaseATSConnector(ABC):
    """Base class for ATS connectors"""
    
    def __init__(self, api_key: str, api_endpoint: Optional[str] = None):
        self.api_key = api_key
        self.api_endpoint = api_endpoint or self.DEFAULT_ENDPOINT
        self._logger = logging.getLogger(__name__)
        self._session = requests.Session()
        self._session.headers.update(self._get_headers())
    
    @property
    @abstractmethod
    def DEFAULT_ENDPOINT(self) -> str:
        pass
    
    @abstractmethod
    def _get_headers(self) -> Dict[str, str]:
        pass
    
    @abstractmethod
    def get_candidates(self, job_id: Optional[str] = None, limit: int = 100) -> List[ATSCandidate]:
        pass
    
    @abstractmethod
    def get_jobs(self) -> List[Dict[str, Any]]:
        pass
    
    @abstractmethod
    def get_resume(self, candidate_id: str) -> Optional[bytes]:
        pass
    
    def _request(self, method: str, path: str, **kwargs) -> Optional[Dict]:
        """Make API request"""
        url = f"{self.api_endpoint.rstrip('/')}{path}"
        try:
            response = self._session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            self._logger.error(f"API request failed: {e}")
            return None


class GreenhouseConnector(BaseATSConnector):
    """Greenhouse ATS connector"""
    
    DEFAULT_ENDPOINT = "https://boards-api.greenhouse.io/v1"
    HARVEST_ENDPOINT = "https://harvest.greenhouse.io/v1"
    
    def __init__(self, api_key: str, api_endpoint: Optional[str] = None):
        super().__init__(api_key, api_endpoint or self.HARVEST_ENDPOINT)
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Basic {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def get_candidates(self, job_id: Optional[str] = None, limit: int = 100) -> List[ATSCandidate]:
        """Fetch candidates from Greenhouse"""
        candidates = []
        
        path = f"/candidates?per_page={limit}"
        if job_id:
            path += f"&job_id={job_id}"
        
        data = self._request("GET", path)
        
        if not data:
            return candidates
        
        for item in data.get("candidates", data if isinstance(data, list) else []):
            try:
                candidate = ATSCandidate(
                    candidate_id=str(item.get("id", "")),
                    first_name=item.get("first_name", ""),
                    last_name=item.get("last_name", ""),
                    email=item.get("email_addresses", [{}])[0].get("value", "") if item.get("email_addresses") else "",
                    phone=item.get("phone_numbers", [{}])[0].get("value", "") if item.get("phone_numbers") else None,
                    resume_url=self._get_resume_attachment_url(item),
                    resume_text=item.get("resume_text"),
                    job_id=str(item.get("applications", [{}])[0].get("job_id", "")) if item.get("applications") else "",
                    job_title=item.get("applications", [{}])[0].get("job_name", "") if item.get("applications") else "",
                    stage=item.get("applications", [{}])[0].get("status", "") if item.get("applications") else "",
                    status=item.get("status", "active"),
                    applied_at=datetime.fromisoformat(item.get("created_at", datetime.utcnow().isoformat()).replace("Z", "+00:00")),
                    source=item.get("source", {}).get("name", "unknown"),
                    tags=[tag.get("name", "") for tag in item.get("tags", [])],
                    raw_data=item
                )
                candidates.append(candidate)
            except Exception as e:
                self._logger.error(f"Error parsing candidate: {e}")
        
        return candidates
    
    def _get_resume_attachment_url(self, candidate_data: Dict) -> Optional[str]:
        """Extract resume URL from candidate attachments"""
        attachments = candidate_data.get("attachments", [])
        for attachment in attachments:
            if attachment.get("type") == "resume":
                return attachment.get("url")
        return None
    
    def get_jobs(self) -> List[Dict[str, Any]]:
        """Fetch all jobs from Greenhouse"""
        jobs = []
        data = self._request("GET", "/jobs?status=open")
        
        if data:
            for item in data.get("jobs", data if isinstance(data, list) else []):
                jobs.append({
                    "id": str(item.get("id", "")),
                    "title": item.get("name", ""),
                    "department": item.get("departments", [{}])[0].get("name", "") if item.get("departments") else "",
                    "location": item.get("offices", [{}])[0].get("name", "") if item.get("offices") else "",
                    "status": item.get("status", "open"),
                    "created_at": item.get("created_at"),
                    "opened_at": item.get("opened_at")
                })
        
        return jobs
    
    def get_resume(self, candidate_id: str) -> Optional[bytes]:
        """Download resume for a candidate"""
        path = f"/candidates/{candidate_id}/attachments"
        data = self._request("GET", path)
        
        if not data:
            return None
        
        for attachment in data:
            if attachment.get("type") == "resume":
                url = attachment.get("url")
                if url:
                    try:
                        response = self._session.get(url)
                        response.raise_for_status()
                        return response.content
                    except:
                        pass
        
        return None


class LeverConnector(BaseATSConnector):
    """Lever ATS connector"""
    
    DEFAULT_ENDPOINT = "https://api.lever.co/v1"
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def get_candidates(self, job_id: Optional[str] = None, limit: int = 100) -> List[ATSCandidate]:
        """Fetch candidates from Lever"""
        candidates = []
        
        path = f"/candidates?limit={limit}"
        if job_id:
            path += f"&posting_id={job_id}"
        
        data = self._request("GET", path)
        
        if not data:
            return candidates
        
        for item in data.get("data", []):
            try:
                candidate = ATSCandidate(
                    candidate_id=item.get("id", ""),
                    first_name=item.get("name", "").split()[0] if item.get("name") else "",
                    last_name=" ".join(item.get("name", "").split()[1:]) if item.get("name") else "",
                    email=item.get("emails", [{}])[0] if item.get("emails") else "",
                    phone=item.get("phones", [{}])[0] if item.get("phones") else None,
                    resume_url=self._get_resume_url(item),
                    resume_text=None,
                    job_id=item.get("archive", {}).get("posting", "") if item.get("archive") else "",
                    job_title=item.get("archive", {}).get("postingTitle", "") if item.get("archive") else "",
                    stage=item.get("stage", ""),
                    status="active" if item.get("archived") is False else "archived",
                    applied_at=datetime.fromisoformat(item.get("createdAt", datetime.utcnow().isoformat()).replace("Z", "+00:00")),
                    source=item.get("sources", ["unknown"])[0] if item.get("sources") else "unknown",
                    tags=item.get("tags", []),
                    raw_data=item
                )
                candidates.append(candidate)
            except Exception as e:
                self._logger.error(f"Error parsing Lever candidate: {e}")
        
        return candidates
    
    def _get_resume_url(self, candidate_data: Dict) -> Optional[str]:
        """Extract resume URL from candidate"""
        for file in candidate_data.get("files", []):
            if file.get("fileType") == "resume":
                return file.get("downloadUrl")
        return None
    
    def get_jobs(self) -> List[Dict[str, Any]]:
        """Fetch all jobs/postings from Lever"""
        jobs = []
        data = self._request("GET", "/postings?state=published")
        
        if data:
            for item in data.get("data", []):
                jobs.append({
                    "id": item.get("id", ""),
                    "title": item.get("text", ""),
                    "department": item.get("categories", {}).get("team", ""),
                    "location": item.get("categories", {}).get("location", ""),
                    "status": "open" if item.get("state") == "published" else "closed",
                    "created_at": item.get("createdAt"),
                    "updated_at": item.get("updatedAt")
                })
        
        return jobs
    
    def get_resume(self, candidate_id: str) -> Optional[bytes]:
        """Download resume for a candidate"""
        path = f"/candidates/{candidate_id}"
        data = self._request("GET", path)
        
        if not data:
            return None
        
        for file in data.get("data", {}).get("files", []):
            if file.get("fileType") == "resume":
                url = file.get("downloadUrl")
                if url:
                    try:
                        response = self._session.get(url)
                        response.raise_for_status()
                        return response.content
                    except:
                        pass
        
        return None


class WorkableConnector(BaseATSConnector):
    """Workable ATS connector"""
    
    DEFAULT_ENDPOINT = "https://www.workable.com/spi/v3"
    
    def __init__(self, api_key: str, subdomain: str, api_endpoint: Optional[str] = None):
        self.subdomain = subdomain
        super().__init__(api_key, api_endpoint)
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def get_candidates(self, job_id: Optional[str] = None, limit: int = 100) -> List[ATSCandidate]:
        """Fetch candidates from Workable"""
        candidates = []
        
        if job_id:
            path = f"/jobs/{job_id}/candidates?limit={limit}"
        else:
            path = f"/candidates?limit={limit}"
        
        data = self._request("GET", path)
        
        if not data:
            return candidates
        
        for item in data.get("candidates", data if isinstance(data, list) else []):
            try:
                candidate = ATSCandidate(
                    candidate_id=item.get("id", ""),
                    first_name=item.get("firstname", ""),
                    last_name=item.get("lastname", ""),
                    email=item.get("email", ""),
                    phone=item.get("phone", ""),
                    resume_url=item.get("resume_url"),
                    resume_text=item.get("resume_text"),
                    job_id=item.get("job", {}).get("shortcode", "") if item.get("job") else "",
                    job_title=item.get("job", {}).get("title", "") if item.get("job") else "",
                    stage=item.get("stage", ""),
                    status=item.get("status", "active"),
                    applied_at=datetime.fromisoformat(item.get("created_at", datetime.utcnow().isoformat()).replace("Z", "+00:00")),
                    source=item.get("source", {}).get("name", "unknown") if item.get("source") else "unknown",
                    tags=item.get("tags", []),
                    raw_data=item
                )
                candidates.append(candidate)
            except Exception as e:
                self._logger.error(f"Error parsing Workable candidate: {e}")
        
        return candidates
    
    def get_jobs(self) -> List[Dict[str, Any]]:
        """Fetch all jobs from Workable"""
        jobs = []
        data = self._request("GET", "/jobs?state=published")
        
        if data:
            for item in data.get("jobs", []):
                jobs.append({
                    "id": item.get("shortcode", ""),
                    "title": item.get("title", ""),
                    "department": item.get("department", ""),
                    "location": item.get("location", {}).get("city", "") if item.get("location") else "",
                    "status": item.get("state", "open"),
                    "created_at": item.get("created_at"),
                    "updated_at": item.get("updated_at")
                })
        
        return jobs
    
    def get_resume(self, candidate_id: str) -> Optional[bytes]:
        """Download resume for a candidate"""
        path = f"/candidates/{candidate_id}"
        data = self._request("GET", path)
        
        if data and data.get("resume_url"):
            try:
                response = self._session.get(data["resume_url"])
                response.raise_for_status()
                return response.content
            except:
                pass
        
        return None


def get_ats_connector(
    provider: str,
    api_key: str,
    **kwargs
) -> BaseATSConnector:
    """
    Factory function for ATS connectors.
    
    Args:
        provider: 'greenhouse', 'lever', or 'workable'
        api_key: API key for authentication
        **kwargs: Additional connector options
    
    Returns:
        Configured ATS connector instance
    """
    connectors = {
        "greenhouse": GreenhouseConnector,
        "lever": LeverConnector,
        "workable": WorkableConnector
    }
    
    if provider.lower() not in connectors:
        raise ValueError(f"Unsupported ATS provider: {provider}. Supported: {list(connectors.keys())}")
    
    return connectors[provider.lower()](api_key=api_key, **kwargs)
