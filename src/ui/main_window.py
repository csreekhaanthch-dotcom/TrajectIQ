"""
TrajectIQ Enterprise Desktop UI - Version 3.0
==============================================
Clean 3-panel layout with modern design.
"""

import sys
import os
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QTextEdit, QComboBox, QTabWidget,
    QTableWidget, QTableWidgetItem, QHeaderView, QGroupBox, QFormLayout,
    QSpinBox, QDoubleSpinBox, QCheckBox, QMessageBox, QProgressBar,
    QStatusBar, QToolBar, QAction, QMenu, QMenuBar, QSplitter,
    QTreeWidget, QTreeWidgetItem, QFrame, QScrollArea, QDialog,
    QDialogButtonBox, QGridLayout, QFileDialog, QListWidget, 
    QListWidgetItem, QSizePolicy, QPlainTextEdit, QShortcut,
    QLayout, QLayoutItem
)
from PyQt5.QtCore import Qt, QTimer, QThread, pyqtSignal, QSize, QRect
from PyQt5.QtGui import (
    QFont, QIcon, QColor, QPalette, QPainter, QPen, QBrush,
    QLinearGradient, QFontMetrics, QKeySequence
)


# =============================================================================
# FLOW LAYOUT - Custom implementation for tag-style buttons
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

QPlainTextEdit:hover, QTextEdit:hover {
    border: 1px solid #4a4a6a;
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

QPushButton#concernTag {
    background-color: #2a1a2a;
    border: 1px solid #e74c3c;
    color: #e74c3c;
    border-radius: 12px;
    padding: 4px 12px;
    font-size: 11px;
}

QPushButton#concernTag:hover {
    background-color: #3a2a3a;
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
        
        # Decision label
        self.decision_label = QLabel("AWAITING EVALUATION")
        self.decision_label.setAlignment(Qt.AlignCenter)
        self.decision_label.setStyleSheet("font-size: 22px; font-weight: bold; color: #6a6a8a;")
        layout.addWidget(self.decision_label)
        
        # Score and grade
        self.score_label = QLabel("Score: -- | Grade: --")
        self.score_label.setAlignment(Qt.AlignCenter)
        self.score_label.setStyleSheet("font-size: 16px; color: #8a8aaa;")
        layout.addWidget(self.score_label)
    
    def set_decision(self, decision: str, score: int, grade: str):
        """Set the decision with score and grade"""
        self._decision = decision.upper()
        self._score = score
        self._grade = grade
        
        # Determine color based on decision
        if decision.upper() in ["STRONG HIRE", "STRONG PASS", "HIRE", "PASS"]:
            self._color = QColor("#2ecc71")  # Green
        elif decision.upper() in ["CONSIDER", "BORDERLINE"]:
            self._color = QColor("#f1c40f")  # Amber
        else:
            self._color = QColor("#e74c3c")  # Red
        
        self.decision_label.setText(self._decision)
        self.decision_label.setStyleSheet(f"font-size: 22px; font-weight: bold; color: {self._color.name()};")
        self.score_label.setText(f"Hiring Index: {score} | Grade: {grade}")
    
    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        # Draw rounded background with border
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
        
        # Progress bar
        self.bar_widget = QWidget()
        self.bar_widget.setMinimumHeight(4)
        self.bar_widget.setMaximumHeight(6)
        self._bar_value = 0
        self._bar_color = QColor("#7c5cff")
        layout.addWidget(self.bar_widget)
    
    def set_value(self, value: int, color: QColor = None):
        """Set the metric value"""
        self.value_label.setText(f"{value}%")
        self._bar_value = value
        if color:
            self._bar_color = color
            self.value_label.setStyleSheet(f"font-size: 24px; font-weight: bold; color: {color.name()};")
        self.update()
    
    def paintEvent(self, event):
        super().paintEvent(event)
        
        # Draw mini progress bar
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        bar_rect = self.bar_widget.geometry()
        
        # Background
        painter.setPen(Qt.NoPen)
        painter.setBrush(QBrush(QColor("#2a2a3a")))
        painter.drawRoundedRect(bar_rect, 3, 3)
        
        # Fill
        if self._bar_value > 0:
            fill_width = int(bar_rect.width() * self._bar_value / 100)
            fill_rect = bar_rect.adjusted(0, 0, -(bar_rect.width() - fill_width), 0)
            painter.setBrush(QBrush(self._bar_color))
            painter.drawRoundedRect(fill_rect, 3, 3)


class DetailDialog(QDialog):
    """Dialog showing details for strengths/concerns"""
    
    def __init__(self, title: str, details: Dict, parent=None):
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setMinimumSize(500, 400)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Style
        self.setStyleSheet("""
            QDialog { background-color: #171727; }
            QLabel { color: #e8e8f0; }
            QTextEdit { background-color: #0d0d1a; border: 1px solid #2a2a40; 
                       border-radius: 8px; padding: 12px; color: #e8e8f0; }
            QPushButton { background-color: #7c5cff; color: white; border-radius: 8px;
                         padding: 10px 20px; font-weight: 600; }
        """)
        
        # Description
        if 'description' in details:
            desc_label = QLabel(details['description'])
            desc_label.setWordWrap(True)
            desc_label.setStyleSheet("font-size: 14px; margin-bottom: 10px;")
            layout.addWidget(desc_label)
        
        # Resume evidence
        if 'evidence' in details:
            evidence_group = QGroupBox("Resume Evidence")
            evidence_group.setStyleSheet("QGroupBox { color: #7c5cff; font-weight: 600; }")
            evidence_layout = QVBoxLayout(evidence_group)
            
            evidence_text = QTextEdit()
            evidence_text.setReadOnly(True)
            evidence_text.setPlainText(details['evidence'])
            evidence_text.setMaximumHeight(120)
            evidence_layout.addWidget(evidence_text)
            
            layout.addWidget(evidence_group)
        
        # Rules triggered
        if 'rules' in details:
            rules_group = QGroupBox("Rules Triggered")
            rules_group.setStyleSheet("QGroupBox { color: #7c5cff; font-weight: 600; }")
            rules_layout = QVBoxLayout(rules_group)
            
            rules_text = QTextEdit()
            rules_text.setReadOnly(True)
            rules_text.setPlainText(details['rules'])
            rules_text.setMaximumHeight(100)
            rules_layout.addWidget(rules_text)
            
            layout.addWidget(rules_group)
        
        # Close button
        close_btn = QPushButton("Close")
        close_btn.clicked.connect(self.accept)
        layout.addWidget(close_btn, alignment=Qt.AlignRight)


# =============================================================================
# EVALUATION WORKER
# =============================================================================

class EvaluationWorker(QThread):
    """Background evaluation worker"""
    
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
    """Wrapper for IMAP email connector"""
    
    def __init__(self):
        self._connector = None
        self.connected = False
    
    def connect(self, host: str, port: int, username: str, password: str, use_ssl: bool = True) -> tuple:
        try:
            self._connector = RealEmailConnector(
                server=host, port=port, username=username,
                password=password, use_ssl=use_ssl
            )
            if self._connector.connect():
                self.connected = True
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
            from datetime import timedelta
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
        except Exception as e:
            return []


class ATSConnectorWrapper:
    """Wrapper for ATS connectors"""
    
    SUPPORTED_SYSTEMS = ['Greenhouse', 'Lever', 'Workable']
    
    def __init__(self):
        self._connector = None
        self.connected = False
    
    def connect(self, system_type: str, api_key: str, company_id: str = '') -> tuple:
        try:
            kwargs = {'api_key': api_key}
            if system_type.lower() == 'workable' and company_id:
                kwargs['subdomain'] = company_id
            self._connector = get_ats_connector(system_type, **kwargs)
            self._connector.get_jobs()
            self.connected = True
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
# MAIN WINDOW
# =============================================================================

class MainWindow(QMainWindow):
    """Main application window with clean 3-panel layout"""
    
    def __init__(self):
        super().__init__()
        
        self.setWindowTitle("TrajectIQ Enterprise v3.1")
        self.setMinimumSize(1400, 900)
        
        # Initialize connectors
        self.email_connector = EmailConnectorWrapper()
        self.ats_connector = ATSConnectorWrapper()
        self.discovered_resumes = []
        
        # Apply stylesheet
        self.setStyleSheet(STYLESHEET)
        
        # Setup UI
        self._setup_ui()
        self._create_menus()
        self._setup_shortcuts()
        
        # License check
        self._check_license()
    
    def _setup_ui(self):
        """Setup the main UI with 3-panel layout"""
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(15, 10, 15, 10)
        main_layout.setSpacing(10)
        
        # Top bar
        top_bar = self._create_top_bar()
        main_layout.addWidget(top_bar)
        
        # Main splitter with 3 panels
        splitter = QSplitter(Qt.Horizontal)
        
        # Left panel - Resume (35%)
        resume_panel = self._create_resume_panel()
        splitter.addWidget(resume_panel)
        
        # Middle panel - Job Requirements (35%)
        job_panel = self._create_job_panel()
        splitter.addWidget(job_panel)
        
        # Right panel - Evaluation Results (30%)
        results_panel = self._create_results_panel()
        splitter.addWidget(results_panel)
        
        # Set initial sizes (35%, 35%, 30%)
        total_width = 1400
        splitter.setSizes([int(total_width * 0.35), int(total_width * 0.35), int(total_width * 0.30)])
        
        main_layout.addWidget(splitter, 1)
        
        # Status bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Ready")
        
        # Progress bar (hidden initially)
        self.progress_bar = QProgressBar()
        self.progress_bar.setMaximumHeight(20)
        self.progress_bar.setVisible(False)
        self.status_bar.addPermanentWidget(self.progress_bar)
    
    def _create_top_bar(self) -> QFrame:
        """Create top bar with title and action buttons"""
        bar = QFrame()
        bar.setObjectName("panel")
        bar.setMaximumHeight(70)
        
        layout = QHBoxLayout(bar)
        layout.setContentsMargins(15, 10, 15, 10)
        
        # Left side - Title and job info
        title_layout = QVBoxLayout()
        
        title = QLabel("TrajectIQ – Candidate Evaluation")
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #7c5cff;")
        title_layout.addWidget(title)
        
        self.job_info_label = QLabel("No job selected")
        self.job_info_label.setStyleSheet("font-size: 12px; color: #6a6a8a;")
        title_layout.addWidget(self.job_info_label)
        
        layout.addLayout(title_layout)
        layout.addStretch()
        
        # Right side - Action buttons
        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(10)
        
        self.run_btn = QPushButton("▶ Run Evaluation")
        self.run_btn.setObjectName("successBtn")
        self.run_btn.setMinimumWidth(140)
        self.run_btn.clicked.connect(self._run_evaluation)
        btn_layout.addWidget(self.run_btn)
        
        self.auto_btn = QPushButton("⚡ Auto-Scan")
        self.auto_btn.setMinimumWidth(120)
        self.auto_btn.clicked.connect(self._auto_evaluate)
        btn_layout.addWidget(self.auto_btn)
        
        layout.addLayout(btn_layout)
        
        return bar
    
    def _create_resume_panel(self) -> QFrame:
        """Create resume input panel"""
        panel = QFrame()
        panel.setObjectName("panel")
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)
        
        # Header with toolbar
        header = QHBoxLayout()
        
        title = QLabel("📄 Resume")
        title.setStyleSheet("font-size: 15px; font-weight: bold; color: #7c5cff;")
        header.addWidget(title)
        header.addStretch()
        
        upload_btn = QPushButton("Upload")
        upload_btn.setMaximumWidth(80)
        upload_btn.clicked.connect(self._upload_resume)
        header.addWidget(upload_btn)
        
        paste_btn = QPushButton("Paste")
        paste_btn.setMaximumWidth(70)
        paste_btn.clicked.connect(lambda: self.resume_input.paste())
        header.addWidget(paste_btn)
        
        clear_btn = QPushButton("Clear")
        clear_btn.setMaximumWidth(70)
        clear_btn.clicked.connect(lambda: self.resume_input.clear())
        header.addWidget(clear_btn)
        
        layout.addLayout(header)
        
        # Resume text input
        self.resume_input = QPlainTextEdit()
        self.resume_input.setPlaceholderText("Paste resume content here or upload a file...")
        self.resume_input.setStyleSheet("QPlainTextEdit { font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; }")
        layout.addWidget(self.resume_input)
        
        return panel
    
    def _create_job_panel(self) -> QFrame:
        """Create job requirements panel"""
        panel = QFrame()
        panel.setObjectName("panel")
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)
        
        # Header
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
        
        # Requirements text input
        self.requirements_input = QPlainTextEdit()
        self.requirements_input.setPlaceholderText(
            "Paste job description or requirements...\n\n"
            "Plain text: \"Looking for Python developer with 5+ years, AWS, Docker...\"\n\n"
            "JSON: [{\"name\": \"Python\", \"classification\": \"mission_critical\", \"minimum_years\": 5}]"
        )
        self.requirements_input.setStyleSheet("QPlainTextEdit { font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; }")
        layout.addWidget(self.requirements_input)
        
        # Weights section
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
        
        return panel
    
    def _create_results_panel(self) -> QFrame:
        """Create evaluation results panel"""
        panel = QFrame()
        panel.setObjectName("panel")
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(12)
        
        # Header
        header = QLabel("📊 Evaluation Results")
        header.setStyleSheet("font-size: 15px; font-weight: bold; color: #7c5cff;")
        layout.addWidget(header)
        
        # Decision badge
        self.decision_badge = DecisionBadge()
        layout.addWidget(self.decision_badge)
        
        # Metrics grid (2x3)
        metrics_group = QGroupBox("Key Metrics")
        metrics_layout = QGridLayout(metrics_group)
        metrics_layout.setSpacing(10)
        
        self.metric_skills = MetricCard("Skills Match")
        metrics_layout.addWidget(self.metric_skills, 0, 0)
        
        self.metric_skill_score = MetricCard("Skills Score")
        metrics_layout.addWidget(self.metric_skill_score, 0, 1)
        
        self.metric_impact = MetricCard("Impact Score")
        metrics_layout.addWidget(self.metric_impact, 0, 2)
        
        self.metric_trajectory = MetricCard("Trajectory")
        metrics_layout.addWidget(self.metric_trajectory, 1, 0)
        
        self.metric_experience = MetricCard("Experience")
        metrics_layout.addWidget(self.metric_experience, 1, 1)
        
        self.metric_overall = MetricCard("Overall Match")
        metrics_layout.addWidget(self.metric_overall, 1, 2)
        
        layout.addWidget(metrics_group)
        
        # Strengths and Concerns
        details_layout = QHBoxLayout()
        
        # Strengths
        strengths_group = QGroupBox("✅ Strengths (Top 5)")
        strengths_layout = QVBoxLayout(strengths_group)
        self.strengths_list = QListWidget()
        self.strengths_list.doubleClicked.connect(self._show_strength_detail)
        strengths_layout.addWidget(self.strengths_list)
        details_layout.addWidget(strengths_group)
        
        # Concerns
        concerns_group = QGroupBox("⚠️ Concerns & Gaps")
        concerns_layout = QVBoxLayout(concerns_group)
        self.concerns_widget = QWidget()
        self.concerns_layout = FlowLayout(self.concerns_widget)
        concerns_layout.addWidget(self.concerns_widget)
        details_layout.addWidget(concerns_group)
        
        layout.addLayout(details_layout, 1)
        
        return panel
    
    def _create_menus(self):
        """Create menu bar"""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("File")
        
        upload_action = QAction("Upload Resume", self)
        upload_action.setShortcut("Ctrl+O")
        upload_action.triggered.connect(self._upload_resume)
        file_menu.addAction(upload_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("Exit", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Evaluation menu
        eval_menu = menubar.addMenu("Evaluation")
        
        run_action = QAction("Run Evaluation", self)
        run_action.setShortcut("Ctrl+R")
        run_action.triggered.connect(self._run_evaluation)
        eval_menu.addAction(run_action)
        
        re_eval_action = QAction("Re-evaluate", self)
        re_eval_action.setShortcut("F5")
        re_eval_action.triggered.connect(self._run_evaluation)
        eval_menu.addAction(re_eval_action)
        
        # Help menu
        help_menu = menubar.addMenu("Help")
        
        about_action = QAction("About", self)
        about_action.triggered.connect(self._show_about)
        help_menu.addAction(about_action)
    
    def _setup_shortcuts(self):
        """Setup keyboard shortcuts"""
        QShortcut(QKeySequence("Ctrl+R"), self, self._run_evaluation)
        QShortcut(QKeySequence("F5"), self, self._run_evaluation)
        QShortcut(QKeySequence("Ctrl+O"), self, self._upload_resume)
    
    def _check_license(self):
        """Check license status"""
        try:
            license_manager = get_license_manager()
            status = license_manager.validate_license()
            if not status.is_valid:
                self.status_bar.showMessage(f"License: {status.message}")
        except:
            self.status_bar.showMessage("Demo Mode")
    
    # -------------------------------------------------------------------------
    # Actions
    # -------------------------------------------------------------------------
    
    def _upload_resume(self):
        """Upload resume file"""
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
                
                self.status_bar.showMessage(f"Loaded: {Path(file_path).name}")
            except Exception as e:
                QMessageBox.warning(self, "Error", f"Failed to load file: {e}")
    
    def _run_evaluation(self):
        """Run the evaluation"""
        resume_text = self.resume_input.toPlainText().strip()
        req_text = self.requirements_input.toPlainText().strip()
        
        if not resume_text:
            QMessageBox.warning(self, "Missing Input", "Please enter resume content.")
            return
        
        if not req_text:
            QMessageBox.warning(self, "Missing Input", "Please enter job requirements.")
            return
        
        # Parse requirements
        requirements = self._parse_requirements(req_text)
        
        # Get weights
        weights = {
            'skills': self.weight_skills.value(),
            'impact': self.weight_impact.value(),
            'trajectory': self.weight_trajectory.value(),
            'experience': self.weight_experience.value()
        }
        
        # Disable buttons
        self.run_btn.setEnabled(False)
        self.auto_btn.setEnabled(False)
        
        # Show progress
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)  # Indeterminate
        self.status_bar.showMessage("Evaluating resume vs job requirements...")
        
        # Start worker
        self.worker = EvaluationWorker(resume_text, requirements, weights)
        self.worker.progress.connect(self._on_progress)
        self.worker.finished.connect(self._on_evaluation_finished)
        self.worker.error.connect(self._on_evaluation_error)
        self.worker.start()
    
    def _parse_requirements(self, text: str) -> list:
        """Parse requirements from text"""
        text = text.strip()
        
        # Try JSON
        if text.startswith('['):
            try:
                return json.loads(text)
            except:
                pass
        
        # Plain text - convert to structured format
        requirements = []
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if line and len(line) > 3:
                requirements.append({
                    'name': line,
                    'classification': 'important',
                    'minimum_years': None
                })
        
        return requirements
    
    def _on_progress(self, message: str):
        """Handle progress update"""
        self.status_bar.showMessage(message)
    
    def _on_evaluation_finished(self, result: dict):
        """Handle evaluation completion"""
        self.progress_bar.setVisible(False)
        self.run_btn.setEnabled(True)
        self.auto_btn.setEnabled(True)
        self.status_bar.showMessage("Evaluation complete")
        
        # Update UI with results
        self._update_results(result)
    
    def _on_evaluation_error(self, error: str):
        """Handle evaluation error"""
        self.progress_bar.setVisible(False)
        self.run_btn.setEnabled(True)
        self.auto_btn.setEnabled(True)
        self.status_bar.showMessage("Evaluation failed")
        
        QMessageBox.critical(self, "Evaluation Error", f"An error occurred:\n\n{error[:500]}")
    
    def _update_results(self, result: dict):
        """Update results panel with evaluation data"""
        # Extract scores
        scores = result.get('scores', {})
        overall = scores.get('overall', 0)
        grade = scores.get('grade', 'N/A')
        
        # Determine decision
        if overall >= 85:
            decision = "STRONG HIRE"
        elif overall >= 70:
            decision = "HIRE"
        elif overall >= 55:
            decision = "CONSIDER"
        else:
            decision = "REJECT"
        
        # Update decision badge
        self.decision_badge.set_decision(decision, overall, grade)
        
        # Update metrics
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
        self.metric_skill_score.set_value(scores.get('skills', 0), get_color(scores.get('skills', 0)))
        self.metric_impact.set_value(scores.get('impact', 0), get_color(scores.get('impact', 0)))
        self.metric_trajectory.set_value(scores.get('trajectory', 0), get_color(scores.get('trajectory', 0)))
        self.metric_experience.set_value(scores.get('experience', 0), get_color(scores.get('experience', 0)))
        self.metric_overall.set_value(overall, get_color(overall))
        
        # Update strengths
        self.strengths_list.clear()
        strengths = result.get('strengths', [])
        for s in strengths[:5]:
            item = QListWidgetItem(f"• {s.get('name', str(s))}")
            item.setData(Qt.UserRole, s)
            self.strengths_list.addItem(item)
        
        # Update concerns
        self._clear_layout(self.concerns_layout)
        concerns = result.get('concerns', [])
        for c in concerns[:6]:
            btn = QPushButton(f"⚠ {c.get('name', str(c))}")
            btn.setObjectName("concernTag")
            btn.clicked.connect(lambda checked, concern=c: self._show_concern_detail(concern))
            self.concerns_layout.addWidget(btn)
    
    def _clear_layout(self, layout):
        """Clear all widgets from layout"""
        while layout.count():
            item = layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
    
    def _show_strength_detail(self, index):
        """Show detail dialog for strength"""
        item = self.strengths_list.item(index.row())
        if item:
            data = item.data(Qt.UserRole)
            if isinstance(data, dict):
                dialog = DetailDialog("Strength Detail", data, self)
                dialog.exec_()
    
    def _show_concern_detail(self, concern: dict):
        """Show detail dialog for concern"""
        dialog = DetailDialog("Concern Detail", concern, self)
        dialog.exec_()
    
    def _auto_evaluate(self):
        """Auto-scan and evaluate from connected sources"""
        QMessageBox.information(self, "Auto-Scan", "Auto-scan feature requires email or ATS connection.\n\nPlease configure integrations in Settings tab.")
    
    def _show_about(self):
        """Show about dialog"""
        QMessageBox.about(self, "About TrajectIQ",
            "<h2>TrajectIQ Enterprise v3.1</h2>"
            "<p>Intelligence-Driven Hiring Platform</p>"
            "<p>Features:</p>"
            "<ul>"
            "<li>Deterministic candidate scoring</li>"
            "<li>Real-time collaboration</li>"
            "<li>Advanced analytics & reporting</li>"
            "<li>Email & ATS integrations</li>"
            "</ul>"
            "<p>License: TRAJECTIQ-DEMO-2024-FULL-ACCESS</p>"
        )


# =============================================================================
# ENTRY POINT
# =============================================================================

def run_application():
    """Main entry point called from main.py"""
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    
    # Set dark palette
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
    """Standalone entry point"""
    return run_application()


if __name__ == "__main__":
    sys.exit(main())
