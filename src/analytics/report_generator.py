"""
TrajectIQ Enterprise - Report Generator
=======================================
Comprehensive reporting system for recruitment analytics.
"""

import uuid
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


class ReportType(Enum):
    CANDIDATE_SUMMARY = "candidate_summary"
    SCORING_SUMMARY = "scoring_summary"
    BIAS_REPORT = "bias_report"
    TEAM_PERFORMANCE = "team_performance"
    EXECUTIVE_SUMMARY = "executive_summary"
    CUSTOM = "custom"


class ReportFormat(Enum):
    JSON = "json"
    HTML = "html"
    PDF = "pdf"
    CSV = "csv"
    MARKDOWN = "markdown"


class ReportStatus(Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ReportSection:
    section_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str = ""
    content: Any = None
    content_type: str = "text"
    order: int = 0

    def to_dict(self) -> Dict:
        return {"section_id": self.section_id, "title": self.title, "content": self.content,
                "content_type": self.content_type, "order": self.order}


@dataclass
class Report:
    report_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    report_type: ReportType = ReportType.CANDIDATE_SUMMARY
    title: str = ""
    description: str = ""
    generated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    status: ReportStatus = ReportStatus.PENDING
    sections: List[ReportSection] = field(default_factory=list)
    summary: str = ""
    format: ReportFormat = ReportFormat.JSON
    created_by: str = ""

    def add_section(self, section: ReportSection):
        self.sections.append(section)
        self.sections.sort(key=lambda s: s.order)

    def to_dict(self) -> Dict:
        return {
            "report_id": self.report_id, "report_type": self.report_type.value,
            "title": self.title, "description": self.description,
            "generated_at": self.generated_at, "status": self.status.value,
            "sections": [s.to_dict() for s in self.sections], "summary": self.summary,
            "format": self.format.value, "created_by": self.created_by
        }


class ReportGenerator:
    """Generates comprehensive recruitment reports."""

    def __init__(self):
        self.reports: Dict[str, Report] = {}
        self._logger = logging.getLogger(__name__)

    def create_report(self, report_type: ReportType, title: str = None, description: str = "",
                     created_by: str = "", format: ReportFormat = ReportFormat.JSON) -> Report:
        report = Report(
            report_type=report_type,
            title=title or report_type.value.replace("_", " ").title(),
            description=description,
            format=format,
            created_by=created_by
        )
        self.reports[report.report_id] = report
        return report

    def generate_report(self, report_id: str, data: Dict = None) -> Report:
        report = self.reports.get(report_id)
        if not report:
            raise ValueError(f"Report not found: {report_id}")
        
        report.status = ReportStatus.GENERATING
        try:
            if report.report_type == ReportType.EXECUTIVE_SUMMARY:
                self._generate_executive_summary(report, data)
            elif report.report_type == ReportType.CANDIDATE_SUMMARY:
                self._generate_candidate_summary(report, data)
            elif report.report_type == ReportType.SCORING_SUMMARY:
                self._generate_scoring_summary(report, data)
            else:
                self._generate_default_report(report, data)
            report.status = ReportStatus.COMPLETED
        except Exception as e:
            report.status = ReportStatus.FAILED
            self._logger.error(f"Report generation failed: {e}")
            raise
        return report

    def _generate_executive_summary(self, report: Report, data: Dict):
        report.add_section(ReportSection(title="Overview", content_type="metrics", order=1,
            content=data.get("overview", {"total_candidates": 0, "average_score": 0})))
        report.add_section(ReportSection(title="Key Metrics", content_type="table", order=2,
            content=data.get("kpis", [])))
        report.summary = f"Executive summary with {len(report.sections)} sections."

    def _generate_candidate_summary(self, report: Report, data: Dict):
        report.add_section(ReportSection(title="Statistics", content_type="metrics", order=1,
            content=data.get("statistics", {"total": 0, "new": 0, "hired": 0})))
        report.add_section(ReportSection(title="Top Candidates", content_type="table", order=2,
            content=data.get("top_candidates", [])))
        report.summary = f"Candidate summary with {data.get('total', 0)} candidates."

    def _generate_scoring_summary(self, report: Report, data: Dict):
        report.add_section(ReportSection(title="Score Analysis", content_type="metrics", order=1,
            content=data.get("overall_scores", {"mean": 0, "median": 0})))
        report.add_section(ReportSection(title="Components", content_type="table", order=2,
            content=data.get("component_scores", [])))
        report.summary = "Scoring analysis across all evaluation components."

    def _generate_default_report(self, report: Report, data: Dict):
        report.add_section(ReportSection(title="Data", content_type="text", order=1, content=data))
        report.summary = f"Report generated for {report.report_type.value}."

    def export_report(self, report_id: str, format: ReportFormat = None) -> str:
        report = self.reports.get(report_id)
        if not report:
            raise ValueError(f"Report not found: {report_id}")
        format = format or report.format
        if format == ReportFormat.JSON:
            return json.dumps(report.to_dict(), indent=2)
        elif format == ReportFormat.MARKDOWN:
            return self._export_markdown(report)
        return json.dumps(report.to_dict(), indent=2)

    def _export_markdown(self, report: Report) -> str:
        md = f"# {report.title}\n\n*Generated: {report.generated_at}*\n\n**Summary:** {report.summary}\n\n"
        for section in report.sections:
            md += f"## {section.title}\n\n"
            if section.content_type == "metrics":
                md += "| Metric | Value |\n|--------|-------|\n"
                for k, v in section.content.items():
                    md += f"| {k} | {v} |\n"
            elif section.content_type == "table" and section.content:
                if len(section.content) > 0:
                    headers = list(section.content[0].keys())
                    md += "| " + " | ".join(headers) + " |\n|" + "|".join(["---"]*len(headers)) + "|\n"
                    for row in section.content:
                        md += "| " + " | ".join(str(v) for v in row.values()) + " |\n"
            else:
                md += f"{section.content}\n"
            md += "\n"
        return md

    def get_report(self, report_id: str) -> Optional[Report]:
        return self.reports.get(report_id)

    def list_reports(self) -> List[Report]:
        return list(self.reports.values())
