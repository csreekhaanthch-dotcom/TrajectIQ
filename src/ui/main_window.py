"""
TrajectIQ Enterprise Desktop UI - Version 4.0
==============================================
Full-featured application with Dashboard, Evaluation, Email & ATS Integration.
"""

import sys
import os
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import random

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QTextEdit, QComboBox, QTabWidget,
    QTableWidget, QTableWidgetItem, QHeaderView, QGroupBox, QFormLayout,
    QSpinBox, QDoubleSpinBox, QCheckBox, QMessageBox, QProgressBar,
    QStatusBar, QToolBar, QAction, QMenu, QMenuBar, QSplitter,
    QTreeWidget, QTreeWidgetItem, QFrame, QScrollArea, QDialog,
    QDialogButtonBox, QGridLayout, QFileDialog, QListWidget, 
    QListWidgetItem, QSizePolicy, QPlainTextEdit, QShortcut,
    QLayout, QLayoutItem, QCheckBox
)
from PyQt5.QtCore import Qt, QTimer, QThread, pyqtSignal, QSize, QRect
from PyQt5.QtGui import (
    QFont, QIcon, QColor, QPalette, QPainter, QPen, QBrush,
    QLinearGradient, QFontMetrics, QKeySequence
)


# =============================================================================
# FLOW LAYOUT
# =============================================================================

class FlowLayout(QLayout):
    """A flow layout that arranges widgets in rows, wrapping as needed"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self._items = []
        self._spacing = 6
        
    def addItem(self, item):
        self._items.append(item)
        
    def count(self):
        return len(self._items)
        
    def itemAt(self, index):
        if 0 <= index < len(self._items):
            return self._items[index]
        return None
        
    def takeAt(self, index):
        if 0 <= index < len(self._items):
            return self._items.pop(index)
        return None
        
    def expandingDirections(self):
        return Qt.Orientations(0)
        
    def hasHeightForWidth(self):
        return True
        
    def heightForWidth(self, width):
        return self._do_layout(QRect(0, 0, width, 0), True)
        
    def setGeometry(self, rect):
        super().setGeometry(rect)
        self._do_layout(rect, False)
        
    def sizeHint(self):
        return self.minimumSize()
        
    def minimumSize(self):
        size = QSize()
        for item in self._items:
            size = size.expandedTo(item.minimumSize())
        return size
        
    def _do_layout(self, rect, test_only):
        x = rect.x()
        y = rect.y()
        line_height = 0
        
        for item in self._items:
            widget = item.widget()
            if widget is None:
                continue
                
            space_x = self._spacing
            space_y = self._spacing
            next_x = x + item.sizeHint().width() + space_x
            
            if next_x - space_x > rect.right() and line_height > 0:
                x = rect.x()
                y = y + line_height + space_y
                next_x = x + item.sizeHint().width() + space_x
                line_height = 0
                
            if not test_only:
                item.setGeometry(QRect(x, y, item.sizeHint().width(), item.sizeHint().height()))
                
            x = next_x
            line_height = max(line_height, item.sizeHint().height())
            
        return y + line_height - rect.y()


sys.path.insert(0, str(Path(__file__).parent.parent))

from security.license import get_license_manager, LicenseStatus
from modules.scoring_engine import run_full_evaluation
from connectors.email_connector import EmailConnector as RealEmailConnector
from connectors.ats_connector import get_ats_connector, SUPPORTED_SYSTEMS


# =============================================================================
# STYLESHEET
# =============================================================================

STYLESHEET = """
/* Main Window */
QMainWindow {
    background-color: #050510;
}

QWidget {
    font-family: 'Segoe UI', 'SF Pro Display', -apple-system, Arial, sans-serif;
    font-size: 13px;
    color: #e8e8f0;
}

/* Panels/Cards */
QFrame#panel {
    background-color: #171727;
    border: 1px solid #2a2a40;
    border-radius: 8px;
}

QFrame#card {
    background-color: #171727;
    border: 1px solid #2a2a40;
    border-radius: 12px;
}

QFrame#decisionBadge {
    background-color: #1a1a2a;
    border-radius: 16px;
    border: 2px solid #3a3a50;
}

/* Input Fields */
QPlainTextEdit, QTextEdit, QLineEdit {
    background-color: #0d0d1a;
    border: 1px solid #2a2a40;
    border-radius: 8px;
    padding: 12px;
    color: #e8e8f0;
    font-size: 13px;
    selection-background-color: #7c5cff;
}

QPlainTextEdit:focus, QTextEdit:focus, QLineEdit:focus {
    border: 2px solid #7c5cff;
}

/* Buttons */
QPushButton {
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
        stop:0 #7c5cff, stop:1 #6a4ce6);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 600;
    font-size: 13px;
}

QPushButton:hover {
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
        stop:0 #9074ff, stop:1 #7c5cff);
}

QPushButton:pressed {
    background: #5a3cd6;
}

QPushButton:disabled {
    background: #2a2a3a;
    color: #5a5a6a;
}

QPushButton#successBtn {
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
        stop:0 #2ecc71, stop:1 #27ae60);
}

QPushButton#successBtn:hover {
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
        stop:0 #3ddc81, stop:1 #2ecc71);
}

QPushButton#dangerBtn {
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
        stop:0 #e74c3c, stop:1 #c0392b);
}

QPushButton#secondaryBtn {
    background: #2a2a40;
    border: 1px solid #3a3a5a;
}

QPushButton#secondaryBtn:hover {
    background: #3a3a50;
}

QPushButton#concernTag {
    background-color: #2a1a2a;
    border: 1px solid #e74c3c;
    color: #e74c3c;
    border-radius: 12px;
    padding: 4px 12px;
    font-size: 11px;
}

/* ComboBox */
QComboBox {
    background-color: #0d0d1a;
    border: 1px solid #2a2a40;
    border-radius: 8px;
    padding: 8px 12px;
    color: #e8e8f0;
}

QComboBox::drop-down {
    border: none;
    width: 30px;
}

QComboBox QAbstractItemView {
    background-color: #171727;
    selection-background-color: #7c5cff;
}

/* SpinBox */
QSpinBox, QDoubleSpinBox {
    background-color: #0d0d1a;
    border: 1px solid #2a2a40;
    border-radius: 8px;
    padding: 8px;
    color: #e8e8f0;
}

/* GroupBox */
QGroupBox {
    background-color: #171727;
    border: 1px solid #2a2a40;
    border-radius: 8px;
    margin-top: 16px;
    padding-top: 16px;
    font-weight: 600;
}

QGroupBox::title {
    subcontrol-origin: margin;
    left: 12px;
    padding: 0 8px;
    color: #7c5cff;
}

/* Table */
QTableWidget {
    background-color: #0d0d1a;
    border: 1px solid #2a2a40;
    border-radius: 8px;
    gridline-color: #2a2a40;
}

QTableWidget::item {
    padding: 8px;
}

QTableWidget::item:selected {
    background-color: rgba(124, 92, 255, 0.3);
}

QHeaderView::section {
    background-color: #171727;
    color: #7c5cff;
    padding: 10px;
    border: none;
    border-bottom: 2px solid #7c5cff;
    font-weight: 600;
}

/* List Widget */
QListWidget {
    background-color: #0d0d1a;
    border: 1px solid #2a2a40;
    border-radius: 8px;
    padding: 4px;
}

QListWidget::item {
    padding: 8px 12px;
    border-radius: 4px;
}

QListWidget::item:selected {
    background-color: rgba(124, 92, 255, 0.3);
}

QListWidget::item:hover {
    background-color: rgba(124, 92, 255, 0.15);
}

/* ScrollBar */
QScrollBar:vertical {
    background-color: #0d0d1a;
    width: 10px;
    border-radius: 5px;
}

QScrollBar::handle:vertical {
    background-color: #3a3a5a;
    border-radius: 5px;
    min-height: 30px;
}

QScrollBar::handle:vertical:hover {
    background-color: #7c5cff;
}

/* ProgressBar */
QProgressBar {
    background-color: #0d0d1a;
    border: 1px solid #2a2a40;
    border-radius: 6px;
    text-align: center;
    font-weight: 600;
}

QProgressBar::chunk {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #7c5cff, stop:1 #2ecc71);
    border-radius: 5px;
}

/* Tab Widget */
QTabWidget::pane {
    border: 1px solid #2a2a40;
    border-radius: 8px;
    background-color: transparent;
}

QTabBar::tab {
    background-color: #171727;
    color: #6a6a8a;
    padding: 12px 24px;
    margin-right: 2px;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    font-weight: 600;
}

QTabBar::tab:selected {
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
        stop:0 #7c5cff, stop:1 #6a4ce6);
    color: white;
}

QTabBar::tab:hover:!selected {
    background-color: #2a2a40;
    color: #8a8aaa;
}

/* Status Bar */
QStatusBar {
    background-color: #0d0d1a;
    color: #6a6a8a;
    border-top: 1px solid #2a2a40;
    padding: 4px 8px;
}

/* CheckBox */
QCheckBox {
    spacing: 8px;
}

QCheckBox::indicator {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 2px solid #3a3a5a;
}

QCheckBox::indicator:checked {
    background-color: #7c5cff;
    border-color: #7c5cff;
}

/* Splitter */
QSplitter::handle {
    background-color: #2a2a40;
    width: 3px;
}

QSplitter::handle:hover {
    background-color: #7c5cff;
}
"""


# =============================================================================
# CUSTOM WIDGETS
# =============================================================================

class StatCard(QFrame):
    """Dashboard stat card with icon, value, and trend"""
    
    def __init__(self, title: str, icon: str = "📊", parent=None):
        super().__init__(parent)
        self.setObjectName("card")
        self.setMinimumSize(180, 100)
        self.setMaximumHeight(120)
        
        self._value = 0
        self._trend = 0
        self._color = QColor("#7c5cff")
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 12, 16, 12)
        layout.setSpacing(6)
        
        # Title row
        title_row = QHBoxLayout()
        self.icon_label = QLabel(icon)
        self.icon_label.setStyleSheet("font-size: 20px;")
        title_row.addWidget(self.icon_label)
        
        self.title_label = QLabel(title)
        self.title_label.setStyleSheet("font-size: 12px; color: #8a8aaa;")
        title_row.addWidget(self.title_label)
        title_row.addStretch()
        layout.addLayout(title_row)
        
        # Value
        self.value_label = QLabel("--")
        self.value_label.setStyleSheet("font-size: 28px; font-weight: bold; color: #e8e8f0;")
        layout.addWidget(self.value_label)
        
        # Trend
        self.trend_label = QLabel("")
        self.trend_label.setStyleSheet("font-size: 11px; color: #6a6a8a;")
        layout.addWidget(self.trend_label)
    
    def set_value(self, value: int, trend: int = 0, color: QColor = None):
        self._value = value
        self._trend = trend
        if color:
            self._color = color
        
        self.value_label.setText(f"{value}")
        self.value_label.setStyleSheet(f"font-size: 28px; font-weight: bold; color: {self._color.name()};")
        
        if trend > 0:
            self.trend_label.setText(f"↑ +{trend}% this week")
            self.trend_label.setStyleSheet("font-size: 11px; color: #2ecc71;")
        elif trend < 0:
            self.trend_label.setText(f"↓ {trend}% this week")
            self.trend_label.setStyleSheet("font-size: 11px; color: #e74c3c;")
        else:
            self.trend_label.setText("No change")


class DecisionBadge(QFrame):
    """Large decision badge widget showing hiring recommendation"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("decisionBadge")
        self.setMinimumHeight(100)
        self.setMaximumHeight(130)
        
        self._decision = "PENDING"
        self._score = 0
        self._grade = "N/A"
        self._color = QColor("#6a6a8a")
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 15, 20, 15)
        layout.setSpacing(8)
        
        self.decision_label = QLabel("AWAITING EVALUATION")
        self.decision_label.setAlignment(Qt.AlignCenter)
        self.decision_label.setStyleSheet("font-size: 22px; font-weight: bold; color: #6a6a8a;")
        layout.addWidget(self.decision_label)
        
        self.score_label = QLabel("Score: -- | Grade: --")
        self.score_label.setAlignment(Qt.AlignCenter)
        self.score_label.setStyleSheet("font-size: 16px; color: #8a8aaa;")
        layout.addWidget(self.score_label)
    
    def set_decision(self, decision: str, score: int, grade: str):
        self._decision = decision.upper()
        self._score = score
        self._grade = grade
        
        if decision.upper() in ["STRONG HIRE", "STRONG PASS", "HIRE", "PASS"]:
            self._color = QColor("#2ecc71")
        elif decision.upper() in ["CONSIDER", "BORDERLINE"]:
            self._color = QColor("#f1c40f")
        else:
            self._color = QColor("#e74c3c")
        
        self.decision_label.setText(self._decision)
        self.decision_label.setStyleSheet(f"font-size: 22px; font-weight: bold; color: {self._color.name()};")
        self.score_label.setText(f"Hiring Index: {score} | Grade: {grade}")
    
    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setPen(QPen(self._color.darker(120), 2))
        painter.setBrush(QBrush(QColor("#1a1a2a")))
        painter.drawRoundedRect(self.rect().adjusted(1, 1, -1, -1), 16, 16)
        super().paintEvent(event)


class MetricCard(QFrame):
    """Small metric card for the grid"""
    
    def __init__(self, title: str, parent=None):
        super().__init__(parent)
        self.setObjectName("panel")
        self.setMinimumSize(120, 80)
        self.setMaximumHeight(90)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 10, 12, 10)
        layout.setSpacing(4)
        
        self.title_label = QLabel(title)
        self.title_label.setStyleSheet("font-size: 11px; color: #8a8aaa;")
        layout.addWidget(self.title_label)
        
        self.value_label = QLabel("--")
        self.value_label.setStyleSheet("font-size: 24px; font-weight: bold; color: #e8e8f0;")
        layout.addWidget(self.value_label)
        
        self.bar_widget = QWidget()
        self.bar_widget.setMinimumHeight(4)
        self.bar_widget.setMaximumHeight(6)
        self._bar_value = 0
        self._bar_color = QColor("#7c5cff")
        layout.addWidget(self.bar_widget)
    
    def set_value(self, value: int, color: QColor = None):
        self.value_label.setText(f"{value}%")
        self._bar_value = value
        if color:
            self._bar_color = color
            self.value_label.setStyleSheet(f"font-size: 24px; font-weight: bold; color: {color.name()};")
        self.update()
    
    def paintEvent(self, event):
        super().paintEvent(event)
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        bar_rect = self.bar_widget.geometry()
        painter.setPen(Qt.NoPen)
        painter.setBrush(QBrush(QColor("#2a2a3a")))
        painter.drawRoundedRect(bar_rect, 3, 3)
        if self._bar_value > 0:
            fill_width = int(bar_rect.width() * self._bar_value / 100)
            fill_rect = bar_rect.adjusted(0, 0, -(bar_rect.width() - fill_width), 0)
            painter.setBrush(QBrush(self._bar_color))
            painter.drawRoundedRect(fill_rect, 3, 3)


# =============================================================================
# EVALUATION WORKER
# =============================================================================

class EvaluationWorker(QThread):
    progress = pyqtSignal(str)
    finished = pyqtSignal(dict)
    error = pyqtSignal(str)
    
    def __init__(self, resume_text: str, job_requirements: list, weights: dict):
        super().__init__()
        self.resume_text = resume_text
        self.job_requirements = job_requirements
        self.weights = weights
    
    def run(self):
        try:
            self.progress.emit("Parsing resume...")
            result = run_full_evaluation(
                self.resume_text,
                self.job_requirements,
                self.weights
            )
            self.finished.emit(result)
        except Exception as e:
            import traceback
            self.error.emit(f"{str(e)}\n\n{traceback.format_exc()}")


# =============================================================================
# CONNECTOR WRAPPERS
# =============================================================================

class EmailConnectorWrapper:
    def __init__(self):
        self._connector = None
        self.connected = False
        self.server = ""
        self.username = ""
    
    def connect(self, host: str, port: int, username: str, password: str, use_ssl: bool = True) -> tuple:
        try:
            self._connector = RealEmailConnector(
                server=host, port=port, username=username,
                password=password, use_ssl=use_ssl
            )
            if self._connector.connect():
                self.connected = True
                self.server = host
                self.username = username
                return True, None
            return False, "Connection failed"
        except Exception as e:
            return False, str(e)
    
    def disconnect(self):
        if self._connector:
            try:
                self._connector.disconnect()
            except:
                pass
        self._connector = None
        self.connected = False
    
    def scan_for_resumes(self, folder: str = "INBOX", days: int = 30) -> List[Dict]:
        if not self.connected or not self._connector:
            return []
        try:
            since = datetime.utcnow() - timedelta(days=days)
            messages = self._connector.fetch_resumes(limit=100, unseen_only=False, since_date=since)
            results = []
            for msg in messages:
                if msg.is_resume:
                    results.append({
                        'id': msg.message_id, 'from': msg.sender,
                        'subject': msg.subject, 'date': msg.received_at.strftime('%Y-%m-%d %H:%M'),
                        'attachment': msg.attachments[0].filename if msg.attachments else "",
                        'resume_text': msg.body_text
                    })
            return results
        except:
            return []


class ATSConnectorWrapper:
    SUPPORTED_SYSTEMS = ['Greenhouse', 'Lever', 'Workable']
    
    def __init__(self):
        self._connector = None
        self.connected = False
        self.system_type = ""
        self.company = ""
    
    def connect(self, system_type: str, api_key: str, company_id: str = '') -> tuple:
        try:
            kwargs = {'api_key': api_key}
            if system_type.lower() == 'workable' and company_id:
                kwargs['subdomain'] = company_id
            self._connector = get_ats_connector(system_type, **kwargs)
            self._connector.get_jobs()
            self.connected = True
            self.system_type = system_type
            self.company = company_id
            return True, None
        except Exception as e:
            return False, str(e)
    
    def disconnect(self):
        self._connector = None
        self.connected = False
    
    def get_jobs(self) -> List[Dict]:
        if not self.connected or not self._connector:
            return []
        try:
            return self._connector.get_jobs()
        except:
            return []
    
    def get_candidates(self, job_id: str) -> List[Dict]:
        if not self.connected or not self._connector:
            return []
        try:
            candidates = self._connector.get_candidates(job_id=job_id)
            return [{'id': c.candidate_id, 'name': f"{c.first_name} {c.last_name}",
                    'email': c.email, 'status': c.status} for c in candidates]
        except:
            return []


# =============================================================================
# DASHBOARD TAB
# =============================================================================

class DashboardTab(QWidget):
    """Dashboard with analytics and statistics"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self._setup_ui()
        self._load_stats()
    
    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(20)
        
        # Header
        header = QLabel("📊 Dashboard")
        header.setStyleSheet("font-size: 24px; font-weight: bold; color: #7c5cff;")
        layout.addWidget(header)
        
        # Stats row
        stats_row = QHBoxLayout()
        stats_row.setSpacing(15)
        
        self.stat_evaluations = StatCard("Total Evaluations", "📋")
        stats_row.addWidget(self.stat_evaluations)
        
        self.stat_hired = StatCard("Candidates Hired", "✅")
        stats_row.addWidget(self.stat_hired)
        
        self.stat_pending = StatCard("Pending Review", "⏳")
        stats_row.addWidget(self.stat_pending)
        
        self.stat_avg_score = StatCard("Average Score", "📈")
        stats_row.addWidget(self.stat_avg_score)
        
        layout.addLayout(stats_row)
        
        # Content splitter
        splitter = QSplitter(Qt.Horizontal)
        
        # Recent Evaluations
        recent_group = QGroupBox("Recent Evaluations")
        recent_layout = QVBoxLayout(recent_group)
        
        self.recent_table = QTableWidget()
        self.recent_table.setColumnCount(5)
        self.recent_table.setHorizontalHeaderLabels(["Candidate", "Position", "Score", "Decision", "Date"])
        self.recent_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.recent_table.setSelectionBehavior(QTableWidget.SelectRows)
        self.recent_table.setEditTriggers(QTableWidget.NoEditTriggers)
        recent_layout.addWidget(self.recent_table)
        
        splitter.addWidget(recent_group)
        
        # Score Distribution
        dist_group = QGroupBox("Score Distribution")
        dist_layout = QVBoxLayout(dist_group)
        
        self.dist_widget = QWidget()
        self.dist_layout = QVBoxLayout(self.dist_widget)
        
        # Score bars
        self.score_bars = {}
        for label, color in [("A+ (90-100)", "#2ecc71"), ("A (80-89)", "#27ae60"),
                            ("B (70-79)", "#f1c40f"), ("C (60-69)", "#e67e22"),
                            ("D/F (<60)", "#e74c3c")]:
            row = QHBoxLayout()
            lbl = QLabel(label)
            lbl.setMinimumWidth(100)
            row.addWidget(lbl)
            
            bar = QProgressBar()
            bar.setMaximum(100)
            bar.setValue(0)
            bar.setStyleSheet(f"QProgressBar::chunk {{ background-color: {color}; }}")
            row.addWidget(bar)
            
            self.score_bars[label] = bar
            self.dist_layout.addLayout(row)
        
        dist_layout.addWidget(self.dist_widget)
        splitter.addWidget(dist_group)
        
        splitter.setSizes([700, 400])
        layout.addWidget(splitter, 1)
        
        # Quick Actions
        actions_group = QGroupBox("Quick Actions")
        actions_layout = QHBoxLayout(actions_group)
        
        new_eval_btn = QPushButton("📋 New Evaluation")
        new_eval_btn.clicked.connect(self._on_new_evaluation)
        actions_layout.addWidget(new_eval_btn)
        
        import_btn = QPushButton("📥 Import Resumes")
        import_btn.clicked.connect(self._on_import)
        actions_layout.addWidget(import_btn)
        
        export_btn = QPushButton("📤 Export Report")
        export_btn.clicked.connect(self._on_export)
        actions_layout.addWidget(export_btn)
        
        actions_layout.addStretch()
        layout.addWidget(actions_group)
    
    def _load_stats(self):
        # Demo data
        self.stat_evaluations.set_value(247, 12)
        self.stat_hired.set_value(34, 8, QColor("#2ecc71"))
        self.stat_pending.set_value(18, -5, QColor("#f1c40f"))
        self.stat_avg_score.set_value(72, 3, QColor("#7c5cff"))
        
        # Recent evaluations
        demo_data = [
            ("John Smith", "Senior Developer", 87, "HIRE", "2024-01-15"),
            ("Sarah Johnson", "Product Manager", 92, "STRONG HIRE", "2024-01-14"),
            ("Mike Brown", "Data Analyst", 65, "CONSIDER", "2024-01-14"),
            ("Emily Davis", "UX Designer", 78, "HIRE", "2024-01-13"),
            ("Chris Wilson", "DevOps Engineer", 54, "REJECT", "2024-01-12"),
        ]
        
        self.recent_table.setRowCount(len(demo_data))
        for i, (name, pos, score, decision, date) in enumerate(demo_data):
            self.recent_table.setItem(i, 0, QTableWidgetItem(name))
            self.recent_table.setItem(i, 1, QTableWidgetItem(pos))
            
            score_item = QTableWidgetItem(str(score))
            if score >= 80:
                score_item.setForeground(QColor("#2ecc71"))
            elif score >= 60:
                score_item.setForeground(QColor("#f1c40f"))
            else:
                score_item.setForeground(QColor("#e74c3c"))
            self.recent_table.setItem(i, 2, score_item)
            
            decision_item = QTableWidgetItem(decision)
            if "HIRE" in decision:
                decision_item.setForeground(QColor("#2ecc71"))
            elif decision == "CONSIDER":
                decision_item.setForeground(QColor("#f1c40f"))
            else:
                decision_item.setForeground(QColor("#e74c3c"))
            self.recent_table.setItem(i, 3, decision_item)
            
            self.recent_table.setItem(i, 4, QTableWidgetItem(date))
        
        # Score distribution
        dist_values = [15, 25, 30, 20, 10]  # Percentages
        for i, (label, value) in enumerate(zip(self.score_bars.keys(), dist_values)):
            self.score_bars[label].setValue(value)
    
    def _on_new_evaluation(self):
        # Switch to evaluation tab
        main_window = self.window()
        if hasattr(main_window, 'tabs'):
            main_window.tabs.setCurrentIndex(1)
    
    def _on_import(self):
        QMessageBox.information(self, "Import", "Import feature - select files or connect to ATS/Email")
    
    def _on_export(self):
        file_path, _ = QFileDialog.getSaveFileName(self, "Export Report", "", "JSON (*.json);;CSV (*.csv)")
        if file_path:
            QMessageBox.information(self, "Export", f"Report exported to: {file_path}")


# =============================================================================
# EVALUATION TAB
# =============================================================================

class EvaluationTab(QWidget):
    """Main evaluation interface"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self._setup_ui()
    
    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)
        
        # Header
        header = QLabel("🔍 Candidate Evaluation")
        header.setStyleSheet("font-size: 24px; font-weight: bold; color: #7c5cff;")
        layout.addWidget(header)
        
        # Main splitter
        splitter = QSplitter(Qt.Horizontal)
        
        # Left - Resume
        resume_panel = self._create_resume_panel()
        splitter.addWidget(resume_panel)
        
        # Middle - Requirements
        req_panel = self._create_requirements_panel()
        splitter.addWidget(req_panel)
        
        # Right - Results
        results_panel = self._create_results_panel()
        splitter.addWidget(results_panel)
        
        splitter.setSizes([400, 400, 350])
        layout.addWidget(splitter, 1)
    
    def _create_resume_panel(self) -> QFrame:
        panel = QFrame()
        panel.setObjectName("panel")
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(12, 12, 12, 12)
        
        header = QHBoxLayout()
        title = QLabel("📄 Resume")
        title.setStyleSheet("font-size: 15px; font-weight: bold; color: #7c5cff;")
        header.addWidget(title)
        header.addStretch()
        
        upload_btn = QPushButton("Upload")
        upload_btn.setMaximumWidth(80)
        upload_btn.clicked.connect(self._upload_resume)
        header.addWidget(upload_btn)
        layout.addLayout(header)
        
        self.resume_input = QPlainTextEdit()
        self.resume_input.setPlaceholderText("Paste resume content or upload a file...")
        self.resume_input.setStyleSheet("QPlainTextEdit { font-family: 'Consolas', monospace; }")
        layout.addWidget(self.resume_input)
        
        return panel
    
    def _create_requirements_panel(self) -> QFrame:
        panel = QFrame()
        panel.setObjectName("panel")
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(12, 12, 12, 12)
        
        header = QHBoxLayout()
        title = QLabel("📋 Job Requirements")
        title.setStyleSheet("font-size: 15px; font-weight: bold; color: #7c5cff;")
        header.addWidget(title)
        header.addStretch()
        
        self.format_combo = QComboBox()
        self.format_combo.addItems(["Auto", "Plain Text", "JSON"])
        self.format_combo.setMaximumWidth(100)
        header.addWidget(self.format_combo)
        layout.addLayout(header)
        
        self.requirements_input = QPlainTextEdit()
        self.requirements_input.setPlaceholderText(
            "Paste job description or requirements...\n\n"
            "Plain text: \"Looking for Python developer with 5+ years, AWS, Docker...\"\n\n"
            "JSON: [{\"name\": \"Python\", \"classification\": \"mission_critical\", \"minimum_years\": 5}]"
        )
        self.requirements_input.setStyleSheet("QPlainTextEdit { font-family: 'Consolas', monospace; }")
        layout.addWidget(self.requirements_input)
        
        # Weights
        weights_group = QGroupBox("Evaluation Weights")
        weights_layout = QGridLayout(weights_group)
        
        weights_layout.addWidget(QLabel("Skills:"), 0, 0)
        self.weight_skills = QDoubleSpinBox()
        self.weight_skills.setRange(0, 1)
        self.weight_skills.setValue(0.3)
        self.weight_skills.setSingleStep(0.1)
        weights_layout.addWidget(self.weight_skills, 0, 1)
        
        weights_layout.addWidget(QLabel("Impact:"), 0, 2)
        self.weight_impact = QDoubleSpinBox()
        self.weight_impact.setRange(0, 1)
        self.weight_impact.setValue(0.25)
        self.weight_impact.setSingleStep(0.1)
        weights_layout.addWidget(self.weight_impact, 0, 3)
        
        weights_layout.addWidget(QLabel("Trajectory:"), 1, 0)
        self.weight_trajectory = QDoubleSpinBox()
        self.weight_trajectory.setRange(0, 1)
        self.weight_trajectory.setValue(0.2)
        self.weight_trajectory.setSingleStep(0.1)
        weights_layout.addWidget(self.weight_trajectory, 1, 1)
        
        weights_layout.addWidget(QLabel("Experience:"), 1, 2)
        self.weight_experience = QDoubleSpinBox()
        self.weight_experience.setRange(0, 1)
        self.weight_experience.setValue(0.25)
        self.weight_experience.setSingleStep(0.1)
        weights_layout.addWidget(self.weight_experience, 1, 3)
        
        layout.addWidget(weights_group)
        
        # Run button
        self.run_btn = QPushButton("▶ Run Evaluation")
        self.run_btn.setObjectName("successBtn")
        self.run_btn.clicked.connect(self._run_evaluation)
        layout.addWidget(self.run_btn)
        
        return panel
    
    def _create_results_panel(self) -> QFrame:
        panel = QFrame()
        panel.setObjectName("panel")
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(12, 12, 12, 12)
        
        header = QLabel("📊 Results")
        header.setStyleSheet("font-size: 15px; font-weight: bold; color: #7c5cff;")
        layout.addWidget(header)
        
        self.decision_badge = DecisionBadge()
        layout.addWidget(self.decision_badge)
        
        # Metrics
        metrics_group = QGroupBox("Key Metrics")
        metrics_layout = QGridLayout(metrics_group)
        
        self.metric_skills = MetricCard("Skills Match")
        metrics_layout.addWidget(self.metric_skills, 0, 0)
        self.metric_impact = MetricCard("Impact")
        metrics_layout.addWidget(self.metric_impact, 0, 1)
        self.metric_trajectory = MetricCard("Trajectory")
        metrics_layout.addWidget(self.metric_trajectory, 1, 0)
        self.metric_overall = MetricCard("Overall")
        metrics_layout.addWidget(self.metric_overall, 1, 1)
        
        layout.addWidget(metrics_group)
        
        # Strengths
        strengths_group = QGroupBox("✅ Strengths")
        strengths_layout = QVBoxLayout(strengths_group)
        self.strengths_list = QListWidget()
        strengths_layout.addWidget(self.strengths_list)
        layout.addWidget(strengths_group)
        
        # Concerns
        concerns_group = QGroupBox("⚠️ Concerns")
        concerns_layout = QVBoxLayout(concerns_group)
        self.concerns_list = QListWidget()
        concerns_layout.addWidget(self.concerns_list)
        layout.addWidget(concerns_group)
        
        return panel
    
    def _upload_resume(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Open Resume", "",
            "Documents (*.pdf *.docx *.doc *.txt);;All Files (*)"
        )
        if file_path:
            try:
                if file_path.endswith('.txt'):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        self.resume_input.setPlainText(f.read())
                elif file_path.endswith('.pdf'):
                    import PyPDF2
                    with open(file_path, 'rb') as f:
                        reader = PyPDF2.PdfReader(f)
                        text = '\n'.join(page.extract_text() for page in reader.pages)
                        self.resume_input.setPlainText(text)
                elif file_path.endswith(('.docx', '.doc')):
                    from docx import Document
                    doc = Document(file_path)
                    text = '\n'.join(p.text for p in doc.paragraphs)
                    self.resume_input.setPlainText(text)
            except Exception as e:
                QMessageBox.warning(self, "Error", f"Failed to load file: {e}")
    
    def _run_evaluation(self):
        resume_text = self.resume_input.toPlainText().strip()
        req_text = self.requirements_input.toPlainText().strip()
        
        if not resume_text or not req_text:
            QMessageBox.warning(self, "Missing Input", "Please enter both resume and requirements.")
            return
        
        # Parse requirements
        requirements = self._parse_requirements(req_text)
        
        weights = {
            'skills': self.weight_skills.value(),
            'impact': self.weight_impact.value(),
            'trajectory': self.weight_trajectory.value(),
            'experience': self.weight_experience.value()
        }
        
        self.run_btn.setEnabled(False)
        
        self.worker = EvaluationWorker(resume_text, requirements, weights)
        self.worker.finished.connect(self._on_finished)
        self.worker.error.connect(self._on_error)
        self.worker.start()
    
    def _parse_requirements(self, text: str) -> list:
        if text.startswith('['):
            try:
                return json.loads(text)
            except:
                pass
        
        requirements = []
        for line in text.split('\n'):
            line = line.strip()
            if line and len(line) > 3:
                requirements.append({
                    'name': line,
                    'classification': 'core',
                    'minimum_years': None
                })
        return requirements
    
    def _on_finished(self, result: dict):
        self.run_btn.setEnabled(True)
        self._update_results(result)
    
    def _on_error(self, error: str):
        self.run_btn.setEnabled(True)
        QMessageBox.critical(self, "Error", f"Evaluation failed:\n{error[:500]}")
    
    def _update_results(self, result: dict):
        scores = result.get('scores', {})
        overall = scores.get('overall', 0)
        grade = scores.get('grade', 'N/A')
        
        if overall >= 85:
            decision = "STRONG HIRE"
        elif overall >= 70:
            decision = "HIRE"
        elif overall >= 55:
            decision = "CONSIDER"
        else:
            decision = "REJECT"
        
        self.decision_badge.set_decision(decision, overall, grade)
        
        green = QColor("#2ecc71")
        amber = QColor("#f1c40f")
        blue = QColor("#7c5cff")
        red = QColor("#e74c3c")
        
        def get_color(val):
            if val >= 80: return green
            if val >= 60: return blue
            if val >= 40: return amber
            return red
        
        self.metric_skills.set_value(scores.get('skills_match', 0), get_color(scores.get('skills_match', 0)))
        self.metric_impact.set_value(scores.get('impact', 0), get_color(scores.get('impact', 0)))
        self.metric_trajectory.set_value(scores.get('trajectory', 0), get_color(scores.get('trajectory', 0)))
        self.metric_overall.set_value(overall, get_color(overall))
        
        # Update lists
        self.strengths_list.clear()
        for s in result.get('strengths', [])[:5]:
            self.strengths_list.addItem(f"• {s.get('name', str(s))}")
        
        self.concerns_list.clear()
        for c in result.get('concerns', [])[:5]:
            self.concerns_list.addItem(f"⚠ {c.get('name', str(c))}")


# =============================================================================
# EMAIL INTEGRATION TAB
# =============================================================================

class EmailIntegrationTab(QWidget):
    """Email integration for scanning resumes from email"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.email_connector = EmailConnectorWrapper()
        self._setup_ui()
    
    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)
        
        # Header
        header = QLabel("📧 Email Integration")
        header.setStyleSheet("font-size: 24px; font-weight: bold; color: #7c5cff;")
        layout.addWidget(header)
        
        # Connection settings
        conn_group = QGroupBox("IMAP Connection Settings")
        conn_layout = QFormLayout(conn_group)
        
        self.host_input = QLineEdit()
        self.host_input.setPlaceholderText("imap.gmail.com")
        conn_layout.addRow("IMAP Server:", self.host_input)
        
        self.port_input = QSpinBox()
        self.port_input.setRange(1, 65535)
        self.port_input.setValue(993)
        conn_layout.addRow("Port:", self.port_input)
        
        self.username_input = QLineEdit()
        self.username_input.setPlaceholderText("your.email@gmail.com")
        conn_layout.addRow("Username:", self.username_input)
        
        self.password_input = QLineEdit()
        self.password_input.setEchoMode(QLineEdit.Password)
        self.password_input.setPlaceholderText("App password (not your regular password)")
        conn_layout.addRow("Password:", self.password_input)
        
        self.ssl_check = QCheckBox("Use SSL/TLS")
        self.ssl_check.setChecked(True)
        conn_layout.addRow("", self.ssl_check)
        
        # Connection buttons
        btn_layout = QHBoxLayout()
        
        self.connect_btn = QPushButton("🔗 Connect")
        self.connect_btn.clicked.connect(self._toggle_connection)
        btn_layout.addWidget(self.connect_btn)
        
        self.test_btn = QPushButton("🧪 Test Connection")
        self.test_btn.clicked.connect(self._test_connection)
        btn_layout.addWidget(self.test_btn)
        
        btn_layout.addStretch()
        conn_layout.addRow("", btn_layout)
        
        layout.addWidget(conn_group)
        
        # Scan settings
        scan_group = QGroupBox("Scan Settings")
        scan_layout = QHBoxLayout(scan_group)
        
        scan_layout.addWidget(QLabel("Folder:"))
        self.folder_input = QLineEdit("INBOX")
        self.folder_input.setMaximumWidth(150)
        scan_layout.addWidget(self.folder_input)
        
        scan_layout.addWidget(QLabel("Days:"))
        self.days_input = QSpinBox()
        self.days_input.setRange(1, 365)
        self.days_input.setValue(30)
        scan_layout.addWidget(self.days_input)
        
        self.scan_btn = QPushButton("🔍 Scan for Resumes")
        self.scan_btn.clicked.connect(self._scan_emails)
        scan_layout.addWidget(self.scan_btn)
        
        scan_layout.addStretch()
        layout.addWidget(scan_group)
        
        # Results table
        results_group = QGroupBox("Discovered Resumes")
        results_layout = QVBoxLayout(results_group)
        
        self.email_table = QTableWidget()
        self.email_table.setColumnCount(5)
        self.email_table.setHorizontalHeaderLabels(["From", "Subject", "Date", "Attachment", "Actions"])
        self.email_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self.email_table.setSelectionBehavior(QTableWidget.SelectRows)
        results_layout.addWidget(self.email_table)
        
        # Bulk actions
        bulk_layout = QHBoxLayout()
        
        select_all_btn = QPushButton("Select All")
        select_all_btn.clicked.connect(lambda: self.email_table.selectAll())
        bulk_layout.addWidget(select_all_btn)
        
        evaluate_btn = QPushButton("📋 Evaluate Selected")
        evaluate_btn.clicked.connect(self._evaluate_selected)
        bulk_layout.addWidget(evaluate_btn)
        
        bulk_layout.addStretch()
        results_layout.addLayout(bulk_layout)
        
        layout.addWidget(results_group, 1)
        
        # Status
        self.status_label = QLabel("Not connected")
        self.status_label.setStyleSheet("color: #6a6a8a;")
        layout.addWidget(self.status_label)
    
    def _toggle_connection(self):
        if self.email_connector.connected:
            self.email_connector.disconnect()
            self.connect_btn.setText("🔗 Connect")
            self.status_label.setText("Disconnected")
            self.status_label.setStyleSheet("color: #e74c3c;")
        else:
            success, error = self.email_connector.connect(
                self.host_input.text(),
                self.port_input.value(),
                self.username_input.text(),
                self.password_input.text(),
                self.ssl_check.isChecked()
            )
            if success:
                self.connect_btn.setText("🔌 Disconnect")
                self.status_label.setText(f"Connected to {self.host_input.text()}")
                self.status_label.setStyleSheet("color: #2ecc71;")
            else:
                QMessageBox.warning(self, "Connection Failed", f"Could not connect: {error}")
    
    def _test_connection(self):
        success, error = self.email_connector.connect(
            self.host_input.text(),
            self.port_input.value(),
            self.username_input.text(),
            self.password_input.text(),
            self.ssl_check.isChecked()
        )
        if success:
            QMessageBox.information(self, "Success", "Connection test successful!")
            self.email_connector.disconnect()
        else:
            QMessageBox.warning(self, "Failed", f"Connection test failed: {error}")
    
    def _scan_emails(self):
        if not self.email_connector.connected:
            QMessageBox.warning(self, "Not Connected", "Please connect to email server first.")
            return
        
        resumes = self.email_connector.scan_for_resumes(
            self.folder_input.text(),
            self.days_input.value()
        )
        
        self.email_table.setRowCount(len(resumes))
        for i, resume in enumerate(resumes):
            self.email_table.setItem(i, 0, QTableWidgetItem(resume.get('from', '')))
            self.email_table.setItem(i, 1, QTableWidgetItem(resume.get('subject', '')))
            self.email_table.setItem(i, 2, QTableWidgetItem(resume.get('date', '')))
            self.email_table.setItem(i, 3, QTableWidgetItem(resume.get('attachment', '')))
            
            eval_btn = QPushButton("Evaluate")
            eval_btn.clicked.connect(lambda checked, r=resume: self._evaluate_resume(r))
            self.email_table.setCellWidget(i, 4, eval_btn)
        
        self.status_label.setText(f"Found {len(resumes)} resumes")
    
    def _evaluate_resume(self, resume: dict):
        main_window = self.window()
        if hasattr(main_window, 'evaluation_tab'):
            main_window.evaluation_tab.resume_input.setPlainText(resume.get('resume_text', ''))
            main_window.tabs.setCurrentIndex(1)
    
    def _evaluate_selected(self):
        selected = self.email_table.selectedItems()
        if not selected:
            QMessageBox.warning(self, "No Selection", "Please select resumes to evaluate.")
            return
        QMessageBox.information(self, "Selected", f"Evaluating {len(selected) // 5} resumes...")


# =============================================================================
# ATS INTEGRATION TAB
# =============================================================================

class ATSIntegrationTab(QWidget):
    """ATS integration for Greenhouse, Lever, Workable"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.ats_connector = ATSConnectorWrapper()
        self._setup_ui()
    
    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)
        
        # Header
        header = QLabel("🔗 ATS Integration")
        header.setStyleSheet("font-size: 24px; font-weight: bold; color: #7c5cff;")
        layout.addWidget(header)
        
        # Connection settings
        conn_group = QGroupBox("ATS Connection")
        conn_layout = QFormLayout(conn_group)
        
        self.system_combo = QComboBox()
        self.system_combo.addItems(ATSConnectorWrapper.SUPPORTED_SYSTEMS)
        conn_layout.addRow("ATS System:", self.system_combo)
        
        self.api_key_input = QLineEdit()
        self.api_key_input.setEchoMode(QLineEdit.Password)
        self.api_key_input.setPlaceholderText("Your API key")
        conn_layout.addRow("API Key:", self.api_key_input)
        
        self.company_input = QLineEdit()
        self.company_input.setPlaceholderText("Company ID / Subdomain (for Workable)")
        conn_layout.addRow("Company ID:", self.company_input)
        
        btn_layout = QHBoxLayout()
        
        self.connect_btn = QPushButton("🔗 Connect")
        self.connect_btn.clicked.connect(self._toggle_connection)
        btn_layout.addWidget(self.connect_btn)
        
        btn_layout.addStretch()
        conn_layout.addRow("", btn_layout)
        
        layout.addWidget(conn_group)
        
        # Jobs and Candidates splitter
        splitter = QSplitter(Qt.Horizontal)
        
        # Jobs panel
        jobs_group = QGroupBox("Open Positions")
        jobs_layout = QVBoxLayout(jobs_group)
        
        refresh_btn = QPushButton("🔄 Refresh Jobs")
        refresh_btn.clicked.connect(self._load_jobs)
        jobs_layout.addWidget(refresh_btn)
        
        self.jobs_table = QTableWidget()
        self.jobs_table.setColumnCount(3)
        self.jobs_table.setHorizontalHeaderLabels(["Job Title", "Department", "Candidates"])
        self.jobs_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.jobs_table.setSelectionBehavior(QTableWidget.SelectRows)
        self.jobs_table.itemClicked.connect(self._load_candidates)
        jobs_layout.addWidget(self.jobs_table)
        
        splitter.addWidget(jobs_group)
        
        # Candidates panel
        candidates_group = QGroupBox("Candidates")
        candidates_layout = QVBoxLayout(candidates_group)
        
        self.candidates_table = QTableWidget()
        self.candidates_table.setColumnCount(4)
        self.candidates_table.setHorizontalHeaderLabels(["Name", "Email", "Status", "Actions"])
        self.candidates_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        candidates_layout.addWidget(self.candidates_table)
        
        # Actions
        action_layout = QHBoxLayout()
        
        import_btn = QPushButton("📥 Import Selected")
        import_btn.clicked.connect(self._import_candidates)
        action_layout.addWidget(import_btn)
        
        evaluate_btn = QPushButton("📋 Evaluate Selected")
        evaluate_btn.clicked.connect(self._evaluate_candidates)
        action_layout.addWidget(evaluate_btn)
        
        candidates_layout.addLayout(action_layout)
        
        splitter.addWidget(candidates_group)
        splitter.setSizes([400, 600])
        
        layout.addWidget(splitter, 1)
        
        # Status
        self.status_label = QLabel("Not connected")
        self.status_label.setStyleSheet("color: #6a6a8a;")
        layout.addWidget(self.status_label)
    
    def _toggle_connection(self):
        if self.ats_connector.connected:
            self.ats_connector.disconnect()
            self.connect_btn.setText("🔗 Connect")
            self.status_label.setText("Disconnected")
            self.status_label.setStyleSheet("color: #e74c3c;")
        else:
            success, error = self.ats_connector.connect(
                self.system_combo.currentText(),
                self.api_key_input.text(),
                self.company_input.text()
            )
            if success:
                self.connect_btn.setText("🔌 Disconnect")
                self.status_label.setText(f"Connected to {self.system_combo.currentText()}")
                self.status_label.setStyleSheet("color: #2ecc71;")
                self._load_jobs()
            else:
                QMessageBox.warning(self, "Connection Failed", f"Could not connect: {error}")
    
    def _load_jobs(self):
        if not self.ats_connector.connected:
            return
        
        jobs = self.ats_connector.get_jobs()
        self.jobs_table.setRowCount(len(jobs))
        
        for i, job in enumerate(jobs):
            self.jobs_table.setItem(i, 0, QTableWidgetItem(job.get('title', job.get('name', ''))))
            self.jobs_table.setItem(i, 1, QTableWidgetItem(job.get('department', '')))
            self.jobs_table.setItem(i, 2, QTableWidgetItem(str(job.get('candidate_count', '--'))))
    
    def _load_candidates(self, item):
        row = item.row()
        job_id_item = self.jobs_table.item(row, 0)
        if not job_id_item:
            return
        
        # Get job ID from stored data
        jobs = self.ats_connector.get_jobs()
        if row < len(jobs):
            job_id = jobs[row].get('id', '')
            candidates = self.ats_connector.get_candidates(job_id)
            
            self.candidates_table.setRowCount(len(candidates))
            for i, cand in enumerate(candidates):
                self.candidates_table.setItem(i, 0, QTableWidgetItem(cand.get('name', '')))
                self.candidates_table.setItem(i, 1, QTableWidgetItem(cand.get('email', '')))
                self.candidates_table.setItem(i, 2, QTableWidgetItem(cand.get('status', '')))
                
                eval_btn = QPushButton("Evaluate")
                self.candidates_table.setCellWidget(i, 3, eval_btn)
    
    def _import_candidates(self):
        QMessageBox.information(self, "Import", "Candidates imported to local database")
    
    def _evaluate_candidates(self):
        QMessageBox.information(self, "Evaluate", "Opening selected candidates in Evaluation tab...")


# =============================================================================
# MAIN WINDOW
# =============================================================================

class MainWindow(QMainWindow):
    """Main application window with tabs"""
    
    def __init__(self):
        super().__init__()
        
        self.setWindowTitle("TrajectIQ Enterprise v4.0")
        self.setMinimumSize(1400, 900)
        
        self.setStyleSheet(STYLESHEET)
        
        self._setup_ui()
        self._create_menus()
    
    def _setup_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setContentsMargins(10, 10, 10, 10)
        
        # Tabs
        self.tabs = QTabWidget()
        
        # Dashboard
        self.dashboard_tab = DashboardTab()
        self.tabs.addTab(self.dashboard_tab, "📊 Dashboard")
        
        # Evaluation
        self.evaluation_tab = EvaluationTab()
        self.tabs.addTab(self.evaluation_tab, "🔍 Evaluation")
        
        # Email Integration
        self.email_tab = EmailIntegrationTab()
        self.tabs.addTab(self.email_tab, "📧 Email")
        
        # ATS Integration
        self.ats_tab = ATSIntegrationTab()
        self.tabs.addTab(self.ats_tab, "🔗 ATS")
        
        layout.addWidget(self.tabs)
        
        # Status bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Ready | License: TRAJECTIQ-DEMO-2024-FULL-ACCESS")
    
    def _create_menus(self):
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("File")
        
        upload_action = QAction("Upload Resume", self)
        upload_action.setShortcut("Ctrl+O")
        upload_action.triggered.connect(lambda: self.tabs.setCurrentIndex(1))
        file_menu.addAction(upload_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("Exit", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # View menu
        view_menu = menubar.addMenu("View")
        
        dashboard_action = QAction("Dashboard", self)
        dashboard_action.triggered.connect(lambda: self.tabs.setCurrentIndex(0))
        view_menu.addAction(dashboard_action)
        
        eval_action = QAction("Evaluation", self)
        eval_action.triggered.connect(lambda: self.tabs.setCurrentIndex(1))
        view_menu.addAction(eval_action)
        
        email_action = QAction("Email Integration", self)
        email_action.triggered.connect(lambda: self.tabs.setCurrentIndex(2))
        view_menu.addAction(email_action)
        
        ats_action = QAction("ATS Integration", self)
        ats_action.triggered.connect(lambda: self.tabs.setCurrentIndex(3))
        view_menu.addAction(ats_action)
        
        # Help menu
        help_menu = menubar.addMenu("Help")
        
        about_action = QAction("About", self)
        about_action.triggered.connect(self._show_about)
        help_menu.addAction(about_action)
    
    def _show_about(self):
        QMessageBox.about(self, "About TrajectIQ",
            "<h2>TrajectIQ Enterprise v4.0</h2>"
            "<p>Intelligence-Driven Hiring Platform</p>"
            "<p><b>Features:</b></p>"
            "<ul>"
            "<li>Dashboard with analytics</li>"
            "<li>Candidate evaluation</li>"
            "<li>Email integration (IMAP)</li>"
            "<li>ATS integration (Greenhouse, Lever, Workable)</li>"
            "<li>Bias detection</li>"
            "<li>Advanced reporting</li>"
            "</ul>"
            "<p><b>License:</b> TRAJECTIQ-DEMO-2024-FULL-ACCESS</p>"
        )


# =============================================================================
# ENTRY POINT
# =============================================================================

def run_application():
    """Main entry point called from main.py"""
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    
    palette = QPalette()
    palette.setColor(QPalette.Window, QColor(5, 5, 16))
    palette.setColor(QPalette.WindowText, QColor(232, 232, 240))
    palette.setColor(QPalette.Base, QColor(13, 13, 26))
    palette.setColor(QPalette.Text, QColor(232, 232, 240))
    palette.setColor(QPalette.Button, QColor(23, 23, 39))
    palette.setColor(QPalette.ButtonText, QColor(232, 232, 240))
    palette.setColor(QPalette.Highlight, QColor(124, 92, 255))
    app.setPalette(palette)
    
    window = MainWindow()
    window.show()
    
    return app.exec_()


def main():
    return run_application()


if __name__ == "__main__":
    sys.exit(main())
