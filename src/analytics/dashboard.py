"""
TrajectIQ Enterprise - Dashboard Manager
========================================
Real-time dashboard management for analytics visualization.
"""

import uuid
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


class WidgetType(Enum):
    METRIC_CARD = "metric_card"
    LINE_CHART = "line_chart"
    BAR_CHART = "bar_chart"
    PIE_CHART = "pie_chart"
    DATA_TABLE = "data_table"
    FUNNEL_CHART = "funnel_chart"
    GAUGE = "gauge"


class WidgetSize(Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


@dataclass
class DashboardWidget:
    widget_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    widget_type: WidgetType = WidgetType.METRIC_CARD
    title: str = ""
    data_source: str = ""
    position: Dict = field(default_factory=lambda: {"x": 0, "y": 0})
    size: WidgetSize = WidgetSize.MEDIUM
    settings: Dict = field(default_factory=dict)
    data: Any = None
    last_updated: Optional[str] = None

    def set_data(self, data: Any):
        self.data = data
        self.last_updated = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict:
        return {
            "widget_id": self.widget_id, "widget_type": self.widget_type.value,
            "title": self.title, "data_source": self.data_source,
            "position": self.position, "size": self.size.value,
            "settings": self.settings, "data": self.data, "last_updated": self.last_updated
        }


@dataclass
class Dashboard:
    dashboard_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = ""
    description: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    widgets: Dict[str, DashboardWidget] = field(default_factory=dict)
    theme: str = "dark"
    colors: Dict = field(default_factory=lambda: {"primary": "#7c83fd", "secondary": "#4ade80"})
    created_by: str = ""
    is_default: bool = False

    def add_widget(self, widget: DashboardWidget):
        self.widgets[widget.widget_id] = widget

    def remove_widget(self, widget_id: str) -> bool:
        if widget_id in self.widgets:
            del self.widgets[widget_id]
            return True
        return False

    def to_dict(self) -> Dict:
        return {
            "dashboard_id": self.dashboard_id, "name": self.name,
            "description": self.description, "created_at": self.created_at,
            "widgets": {wid: w.to_dict() for wid, w in self.widgets.items()},
            "theme": self.theme, "colors": self.colors,
            "created_by": self.created_by, "is_default": self.is_default
        }


class DashboardManager:
    """Manages dashboards and widgets."""

    def __init__(self):
        self.dashboards: Dict[str, Dashboard] = {}
        self._logger = logging.getLogger(__name__)
        self._create_default_dashboard()

    def _create_default_dashboard(self):
        dashboard = Dashboard(name="Recruitment Overview", description="Default dashboard", is_default=True)
        widgets = [
            DashboardWidget(widget_type=WidgetType.METRIC_CARD, title="Total Candidates",
                          data_source="candidate_count", position={"x": 0, "y": 0}, size=WidgetSize.SMALL),
            DashboardWidget(widget_type=WidgetType.METRIC_CARD, title="Average Score",
                          data_source="avg_score", position={"x": 1, "y": 0}, size=WidgetSize.SMALL),
            DashboardWidget(widget_type=WidgetType.LINE_CHART, title="Trends",
                          data_source="candidate_trends", position={"x": 0, "y": 1}, size=WidgetSize.LARGE),
            DashboardWidget(widget_type=WidgetType.PIE_CHART, title="Sources",
                          data_source="candidate_sources", position={"x": 2, "y": 1}, size=WidgetSize.MEDIUM),
        ]
        for widget in widgets:
            dashboard.add_widget(widget)
        self.dashboards[dashboard.dashboard_id] = dashboard

    def create_dashboard(self, name: str, description: str = "", created_by: str = "") -> Dashboard:
        dashboard = Dashboard(name=name, description=description, created_by=created_by)
        self.dashboards[dashboard.dashboard_id] = dashboard
        return dashboard

    def get_dashboard(self, dashboard_id: str) -> Optional[Dashboard]:
        return self.dashboards.get(dashboard_id)

    def get_default_dashboard(self) -> Optional[Dashboard]:
        for dashboard in self.dashboards.values():
            if dashboard.is_default:
                return dashboard
        return None

    def list_dashboards(self) -> List[Dashboard]:
        return list(self.dashboards.values())

    def add_widget(self, dashboard_id: str, widget_type: WidgetType, title: str, data_source: str) -> Optional[DashboardWidget]:
        dashboard = self.dashboards.get(dashboard_id)
        if not dashboard:
            return None
        widget = DashboardWidget(widget_type=widget_type, title=title, data_source=data_source)
        dashboard.add_widget(widget)
        return widget

    def update_widget_data(self, dashboard_id: str, widget_id: str, data: Any) -> bool:
        dashboard = self.dashboards.get(dashboard_id)
        if not dashboard:
            return False
        widget = dashboard.widgets.get(widget_id)
        if not widget:
            return False
        widget.set_data(data)
        return True

    def delete_dashboard(self, dashboard_id: str) -> bool:
        if dashboard_id in self.dashboards:
            if self.dashboards[dashboard_id].is_default:
                return False
            del self.dashboards[dashboard_id]
            return True
        return False
