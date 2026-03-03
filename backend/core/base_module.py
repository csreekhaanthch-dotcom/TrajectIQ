"""
TrajectIQ Base Module
=====================
Base class for all evaluation modules.
Ensures consistent interface and deterministic outputs.
"""

import json
import hashlib
import time
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, Optional
from pathlib import Path

from core.config import config
from core.logger import get_logger, log_audit


class BaseModule(ABC):
    """
    Abstract base class for all TrajectIQ modules.
    Enforces deterministic outputs and auditability.
    """
    
    module_name: str = "base"
    version: str = "1.0.0"
    
    def __init__(self, ollama_client: Optional[Any] = None):
        """
        Initialize the module.
        
        Args:
            ollama_client: Optional Ollama client for LLM operations
        """
        self.logger = get_logger(f"trajectiq.{self.module_name}")
        self.ollama_client = ollama_client
        self.config = config
    
    @abstractmethod
    def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process input data and return results.
        Must be implemented by all modules.
        
        Args:
            input_data: Validated input data matching module schema
            
        Returns:
            Output dictionary matching module output schema
        """
        pass
    
    @abstractmethod
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """
        Validate input data against module schema.
        
        Args:
            input_data: Input data to validate
            
        Returns:
            True if valid, raises ValueError if invalid
        """
        pass
    
    def generate_id(self, prefix: str = "ID") -> str:
        """Generate a deterministic unique ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
        return f"{prefix}-{timestamp}"
    
    def hash_content(self, content: Any) -> str:
        """Generate SHA256 hash of content for auditability"""
        content_str = json.dumps(content, sort_keys=True, default=str)
        return hashlib.sha256(content_str.encode()).hexdigest()
    
    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main execution wrapper with logging and timing.
        
        Args:
            input_data: Input data for processing
            
        Returns:
            Processed output with metadata
        """
        start_time = time.time()
        
        # Validate input
        self.validate_input(input_data)
        
        # Log input
        input_hash = self.hash_content(input_data)
        self.logger.info(
            f"Processing started for {self.module_name}",
            extra={
                "candidate_id": input_data.get("candidate_id"),
                "job_id": input_data.get("job_id"),
                "input_hash": input_hash
            }
        )
        
        try:
            # Process
            result = self.process(input_data)
            
            # Add metadata
            execution_time_ms = (time.time() - start_time) * 1000
            
            result["processing_metadata"] = {
                "module": self.module_name,
                "version": self.version,
                "execution_time_ms": round(execution_time_ms, 2),
                "input_hash": input_hash,
                "output_hash": self.hash_content(result),
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "config_hash": self.hash_content({
                    "temperature": self.config.ollama.temperature,
                    "model": self.config.ollama.model
                })
            }
            
            # Log success
            self.logger.info(
                f"Processing completed for {self.module_name}",
                extra={
                    "candidate_id": input_data.get("candidate_id"),
                    "job_id": input_data.get("job_id"),
                    "execution_time_ms": execution_time_ms
                }
            )
            
            # Audit log
            log_audit(
                action="module_execution",
                module=self.module_name,
                candidate_id=input_data.get("candidate_id"),
                job_id=input_data.get("job_id"),
                details={
                    "status": "success",
                    "execution_time_ms": execution_time_ms
                }
            )
            
            return result
            
        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            
            self.logger.error(
                f"Processing failed for {self.module_name}: {str(e)}",
                extra={
                    "candidate_id": input_data.get("candidate_id"),
                    "job_id": input_data.get("job_id"),
                    "execution_time_ms": execution_time_ms,
                    "error": str(e)
                }
            )
            
            log_audit(
                action="module_execution",
                module=self.module_name,
                candidate_id=input_data.get("candidate_id"),
                job_id=input_data.get("job_id"),
                details={
                    "status": "error",
                    "error": str(e),
                    "execution_time_ms": execution_time_ms
                }
            )
            
            raise
    
    def llm_call(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = True
    ) -> str:
        """
        Make a call to Ollama LLM with deterministic settings.
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            json_mode: Whether to expect JSON output
            
        Returns:
            LLM response text
        """
        if not self.ollama_client:
            raise RuntimeError("Ollama client not initialized")
        
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        # Make the API call
        response = self.ollama_client.chat(
            model=self.config.ollama.model,
            messages=messages,
            options={
                "temperature": self.config.ollama.temperature,  # 0.1 for determinism
                "num_predict": self.config.ollama.max_tokens
            }
        )
        
        return response.get("message", {}).get("content", "")
    
    def ensure_json_output(self, text: str) -> Dict[str, Any]:
        """
        Ensure output is valid JSON.
        Attempts to extract JSON from potentially mixed content.
        
        Args:
            text: Text that should contain JSON
            
        Returns:
            Parsed JSON dictionary
        """
        # Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        # Try to extract JSON from markdown code blocks
        import re
        json_pattern = r'```(?:json)?\s*([\s\S]*?)```'
        matches = re.findall(json_pattern, text)
        
        for match in matches:
            try:
                return json.loads(match.strip())
            except json.JSONDecodeError:
                continue
        
        # Try to find JSON-like content
        brace_pattern = r'\{[\s\S]*\}'
        matches = re.findall(brace_pattern, text)
        
        for match in matches:
            try:
                return json.loads(match)
            except json.JSONDecodeError:
                continue
        
        raise ValueError(f"Could not extract valid JSON from response: {text[:200]}...")


class ModuleRegistry:
    """Registry for all available modules"""
    
    _modules: Dict[str, type] = {}
    
    @classmethod
    def register(cls, module_class: type) -> type:
        """Register a module class"""
        cls._modules[module_class.module_name] = module_class
        return module_class
    
    @classmethod
    def get(cls, module_name: str) -> Optional[type]:
        """Get a module class by name"""
        return cls._modules.get(module_name)
    
    @classmethod
    def list_modules(cls) -> list:
        """List all registered modules"""
        return list(cls._modules.keys())
