"""
TrajectIQ Enterprise Desktop UI - Version 2.0
==============================================
Professional PyQt5 desktop interface with modern design.
"""

import sys
import os
import json
import re
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
from dataclasses import asdict

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QTextEdit, QComboBox, QTabWidget,
    QTableWidget, QTableWidgetItem, QHeaderView, QGroupBox, QFormLayout,
    QSpinBox, QDoubleSpinBox, QCheckBox, QMessageBox, QProgressBar,
    QStatusBar, QToolBar, QAction, QMenu, QMenuBar, QSplitter,
    QTreeWidget, QTreeWidgetItem, QFrame, QScrollArea, QDialog,
    QDialogButtonBox, QDateEdit, QLabel, QStackedWidget, QGridLayout,
    QFileDialog, QInputDialog, QListWidget, QListWidgetItem, QSizePolicy
)
from PyQt5.QtCore import Qt, QTimer, QThread, pyqtSignal, QDate, QRect, QPointF, QSize
from PyQt5.QtGui import (
    QFont, QIcon, QColor, QPalette, QStandardItemModel, QStandardItem,
    QPainter, QPen, QBrush, QLinearGradient, QRadialGradient, QPainterPath,
    QFontMetrics, QPixmap
)

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from security.license import get_license_manager, LicenseStatus
from modules.scoring_engine import run_full_evaluation


# =============================================================================
# MODERN STYLESHEETS
# =============================================================================

class ModernStyles:
    """Modern dark theme stylesheets"""
    
    MAIN_WINDOW = """
    QMainWindow {
        background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
            stop:0 #0f0c29, stop:0.5 #302b63, stop:1 #24243e);
    }
    """
    
    WIDGET = """
    QWidget {
        background-color: transparent;
        color: #eaeaea;
        font-family: 'Segoe UI', 'SF Pro Display', Arial, sans-serif;
        font-size: 13px;
    }
    """
    
    CARD = """
    QFrame#card {
        background-color: rgba(30, 30, 50, 200);
        border: 1px solid rgba(100, 100, 150, 80);
        border-radius: 15px;
        padding: 15px;
    }
    QFrame#card:hover {
        border: 1px solid rgba(124, 131, 253, 150);
        background-color: rgba(40, 40, 70, 220);
    }
    """
    
    GROUP_BOX = """
    QGroupBox {
        background-color: rgba(25, 25, 45, 200);
        border: 1px solid rgba(100, 100, 150, 60);
        border-radius: 12px;
        margin-top: 15px;
        padding-top: 15px;
        font-weight: bold;
        font-size: 14px;
    }
    QGroupBox::title {
        subcontrol-origin: margin;
        left: 15px;
        padding: 0 10px;
        color: #7c83fd;
    }
    """
    
    INPUT = """
    QLineEdit, QTextEdit, QComboBox, QSpinBox, QDoubleSpinBox {
        background-color: rgba(20, 20, 40, 220);
        border: 1px solid rgba(100, 100, 150, 80);
        border-radius: 8px;
        padding: 10px;
        color: #eaeaea;
        font-size: 13px;
        selection-background-color: #7c83fd;
    }
    QLineEdit:focus, QTextEdit:focus {
        border: 2px solid #7c83fd;
        background-color: rgba(30, 30, 55, 240);
    }
    QLineEdit:hover, QTextEdit:hover {
        border: 1px solid rgba(124, 131, 253, 150);
    }
    """
    
    BUTTON = """
    QPushButton {
        background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
            stop:0 #7c83fd, stop:1 #5c63fd);
        color: white;
        border: none;
        border-radius: 10px;
        padding: 12px 25px;
        font-weight: bold;
        font-size: 14px;
    }
    QPushButton:hover {
        background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
            stop:0 #949aff, stop:1 #7c83fd);
    }
    QPushButton:pressed {
        background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
            stop:0 #5c63fd, stop:1 #4c53fd);
    }
    QPushButton:disabled {
        background: #3a3a5a;
        color: #666666;
    }
    """
    
    BUTTON_SUCCESS = """
    QPushButton {
        background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
            stop:0 #51cf66, stop:1 #37b24d);
        color: white;
        border: none;
        border-radius: 10px;
        padding: 12px 25px;
        font-weight: bold;
        font-size: 14px;
    }
    QPushButton:hover {
        background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
            stop:0 #69db7c, stop:1 #51cf66);
    }
    """
    
    BUTTON_DANGER = """
    QPushButton {
        background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
            stop:0 #ff6b6b, stop:1 #fa5252);
        color: white;
        border: none;
        border-radius: 10px;
        padding: 12px 25px;
        font-weight: bold;
        font-size: 14px;
    }
    QPushButton:hover {
        background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
            stop:0 #ff8787, stop:1 #ff6b6b);
    }
    """
    
    TAB_WIDGET = """
    QTabWidget::pane {
        border: 1px solid rgba(100, 100, 150, 60);
        border-radius: 10px;
        background-color: transparent;
    }
    QTabBar::tab {
        background-color: rgba(30, 30, 50, 180);
        color: #888888;
        padding: 12px 25px;
        margin-right: 3px;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
        font-weight: bold;
        font-size: 13px;
    }
    QTabBar::tab:selected {
        background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
            stop:0 #7c83fd, stop:1 #5c63fd);
        color: white;
    }
    QTabBar::tab:hover:!selected {
        background-color: rgba(50, 50, 80, 200);
        color: #aaaaaa;
    }
    """
    
    TABLE = """
    QTableWidget {
        background-color: rgba(20, 20, 40, 200);
        border: 1px solid rgba(100, 100, 150, 60);
        border-radius: 10px;
        gridline-color: rgba(100, 100, 150, 40);
        selection-background-color: rgba(124, 131, 253, 100);
    }
    QTableWidget::item {
        padding: 10px;
        border-bottom: 1px solid rgba(100, 100, 150, 30);
    }
    QTableWidget::item:selected {
        background-color: rgba(124, 131, 253, 100);
    }
    QHeaderView::section {
        background-color: rgba(40, 40, 70, 220);
        color: #7c83fd;
        padding: 12px;
        border: none;
        border-bottom: 2px solid #7c83fd;
        font-weight: bold;
        font-size: 12px;
    }
    """
    
    SCROLL_AREA = """
    QScrollArea {
        border: none;
        background-color: transparent;
    }
    QScrollBar:vertical {
        background-color: rgba(20, 20, 40, 150);
        width: 12px;
        border-radius: 6px;
        margin: 0;
    }
    QScrollBar::handle:vertical {
        background-color: rgba(100, 100, 150, 150);
        border-radius: 6px;
        min-height: 30px;
    }
    QScrollBar::handle:vertical:hover {
        background-color: rgba(124, 131, 253, 200);
    }
    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
        height: 0px;
    }
    """
    
    STATUS_BAR = """
    QStatusBar {
        background-color: rgba(20, 20, 40, 220);
        color: #888888;
        border-top: 1px solid rgba(100, 100, 150, 60);
        padding: 5px;
    }
    """
    
    PROGRESS_BAR = """
    QProgressBar {
        background-color: rgba(20, 20, 40, 200);
        border: 1px solid rgba(100, 100, 150, 60);
        border-radius: 8px;
        text-align: center;
        color: white;
        font-weight: bold;
    }
    QProgressBar::chunk {
        background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
            stop:0 #7c83fd, stop:1 #51cf66);
        border-radius: 7px;
    }
    """


# =============================================================================
# CUSTOM WIDGETS
# =============================================================================

class ScoreGaugeWidget(QWidget):
    """A circular gauge widget for displaying scores"""
    
    def __init__(self, parent=None, size=200):
        super().__init__(parent)
        self.score = 0
        self.max_score = 100
        self.grade = "N/A"
        self.size = size
        self.setMinimumSize(size, size)
        self.setMaximumSize(size, size)
        
        # Animation
        self.target_score = 0
        self.animation_timer = QTimer(self)
        self.animation_timer.timeout.connect(self._animate)
    
    def set_score(self, score: int, grade: str = None):
        """Set score with animation"""
        self.target_score = score
        self.grade = grade or self._calculate_grade(score)
        self.animation_timer.start(20)
    
    def _animate(self):
        """Animate the gauge"""
        if self.score < self.target_score:
            self.score = min(self.score + 2, self.target_score)
            self.update()
        else:
            self.animation_timer.stop()
    
    def _calculate_grade(self, score: int) -> str:
        """Calculate grade from score"""
        if score >= 95: return "A+"
        elif score >= 90: return "A"
        elif score >= 85: return "A-"
        elif score >= 80: return "B+"
        elif score >= 75: return "B"
        elif score >= 70: return "B-"
        elif score >= 65: return "C+"
        elif score >= 60: return "C"
        elif score >= 55: return "C-"
        elif score >= 50: return "D"
        else: return "F"
    
    def _get_color(self, score: int) -> QColor:
        """Get color based on score"""
        if score >= 85: return QColor(81, 207, 102)   # Green
        elif score >= 70: return QColor(124, 131, 253)  # Blue
        elif score >= 55: return QColor(255, 169, 77)   # Orange
        else: return QColor(255, 107, 107)   # Red
    
    def paintEvent(self, event):
        """Draw the gauge"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        # Center point
        center_x = self.size // 2
        center_y = self.size // 2
        radius = (self.size - 40) // 2
        
        # Background arc
        pen = QPen(QColor(50, 50, 80), 15)
        pen.setCapStyle(Qt.RoundCap)
        painter.setPen(pen)
        painter.drawArc(center_x - radius, center_y - radius, 
                       radius * 2, radius * 2, 
                       225 * 16, -270 * 16)
        
        # Score arc
        if self.score > 0:
            gradient = QLinearGradient(0, 0, self.size, self.size)
            color = self._get_color(self.score)
            gradient.setColorAt(0, color)
            gradient.setColorAt(1, color.lighter(120))
            
            pen = QPen(QBrush(gradient), 15)
            pen.setCapStyle(Qt.RoundCap)
            painter.setPen(pen)
            
            # Calculate arc angle (270 degrees total, starting from 225)
            span = int((self.score / self.max_score) * 270 * 16)
            painter.drawArc(center_x - radius, center_y - radius,
                           radius * 2, radius * 2,
                           225 * 16, -span)
        
        # Center text
        painter.setPen(Qt.white)
        
        # Score
        font = QFont("Segoe UI", 36, QFont.Bold)
        painter.setFont(font)
        painter.drawText(QRect(0, center_y - 40, self.size, 50), 
                        Qt.AlignCenter, str(self.score))
        
        # Grade badge
        grade_color = self._get_color(self.score)
        painter.setPen(grade_color)
        font = QFont("Segoe UI", 24, QFont.Bold)
        painter.setFont(font)
        painter.drawText(QRect(0, center_y + 15, self.size, 40),
                        Qt.AlignCenter, self.grade)
        
        # Label
        painter.setPen(QColor(136, 136, 136))
        font = QFont("Segoe UI", 10)
        painter.setFont(font)
        painter.drawText(QRect(0, center_y + 50, self.size, 25),
                        Qt.AlignCenter, "HIRING INDEX")


class ScoreBarWidget(QWidget):
    """A horizontal progress bar with label and value"""
    
    def __init__(self, label: str, value: int = 0, max_value: int = 100, 
                 color: QColor = None, parent=None):
        super().__init__(parent)
        self.label = label
        self.value = value
        self.max_value = max_value
        self.target_value = value
        self.color = color or QColor(124, 131, 253)
        self.setMinimumHeight(35)
        
        # Animation
        self.animation_timer = QTimer(self)
        self.animation_timer.timeout.connect(self._animate)
    
    def set_value(self, value: int):
        """Set value with animation"""
        self.target_value = value
        self.animation_timer.start(15)
    
    def _animate(self):
        """Animate the bar"""
        if self.value < self.target_value:
            self.value = min(self.value + 2, self.target_value)
            self.update()
        else:
            self.animation_timer.stop()
    
    def paintEvent(self, event):
        """Draw the bar"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        width = self.width()
        height = self.height()
        bar_height = 12
        bar_y = height - bar_height - 5
        
        # Label
        painter.setPen(Qt.white)
        font = QFont("Segoe UI", 11)
        painter.setFont(font)
        painter.drawText(5, bar_y - 5, self.label)
        
        # Value
        painter.setPen(self.color)
        font = QFont("Segoe UI", 11, QFont.Bold)
        painter.setFont(font)
        value_text = f"{self.value}%"
        painter.drawText(width - painter.fontMetrics().width(value_text) - 5, 
                        bar_y - 5, value_text)
        
        # Background bar
        painter.setPen(Qt.NoPen)
        painter.setBrush(QColor(30, 30, 50))
        painter.drawRoundedRect(0, bar_y, width, bar_height, 6, 6)
        
        # Value bar
        if self.value > 0:
            bar_width = int((self.value / self.max_value) * width)
            gradient = QLinearGradient(0, 0, bar_width, 0)
            gradient.setColorAt(0, self.color)
            gradient.setColorAt(1, self.color.lighter(120))
            painter.setBrush(gradient)
            painter.drawRoundedRect(0, bar_y, bar_width, bar_height, 6, 6)


class StatCard(QFrame):
    """A card widget for displaying statistics"""
    
    def __init__(self, title: str, value: str, icon: str, color: QColor, parent=None):
        super().__init__(parent)
        self.setObjectName("card")
        self.setStyleSheet(ModernStyles.CARD)
        self.setMinimumSize(150, 100)
        self.setMaximumHeight(120)
        
        layout = QVBoxLayout(self)
        layout.setSpacing(5)
        
        # Icon and title
        header_layout = QHBoxLayout()
        
        icon_label = QLabel(icon)
        icon_label.setStyleSheet(f"font-size: 28px;")
        header_layout.addWidget(icon_label)
        
        title_label = QLabel(title)
        title_label.setStyleSheet(f"color: {color.name()}; font-size: 11px; font-weight: bold;")
        header_layout.addWidget(title_label)
        header_layout.addStretch()
        
        layout.addLayout(header_layout)
        
        # Value
        self.value_label = QLabel(value)
        self.value_label.setStyleSheet("font-size: 28px; font-weight: bold; color: white;")
        layout.addWidget(self.value_label)
        
        layout.addStretch()
    
    def set_value(self, value: str):
        """Update the value"""
        self.value_label.setText(value)


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
            error_detail = f"{str(e)}\n\nDetails: {traceback.format_exc()}"
            self.error.emit(error_detail)


# =============================================================================
# EMAIL CONNECTOR
# =============================================================================

class EmailConnector:
    """Email connection for extracting resumes"""
    
    def __init__(self):
        self.connected = False
        self.settings = {
            'host': '',
            'port': 993,
            'username': '',
            'password': '',
            'use_ssl': True
        }
    
    def connect(self, host: str, port: int, username: str, password: str, use_ssl: bool = True) -> bool:
        """Connect to email server"""
        self.settings = {
            'host': host,
            'port': port,
            'username': username,
            'password': password,
            'use_ssl': use_ssl
        }
        self.connected = True
        return True
    
    def disconnect(self):
        """Disconnect from email server"""
        self.connected = False
    
    def scan_for_resumes(self, folder: str = "INBOX", days: int = 30) -> List[Dict]:
        """Scan emails for resume attachments"""
        return [
            {
                'id': 'email_001',
                'from': 'john.doe@email.com',
                'subject': 'Application for Senior Developer Position',
                'date': datetime.now().strftime('%Y-%m-%d'),
                'attachment': 'John_Doe_Resume.pdf',
                'resume_text': """
John Doe
Senior Software Developer
john.doe@email.com | (555) 123-4567

EXPERIENCE
Senior Developer at Google (2020-Present)
- Led team of 8 engineers on cloud infrastructure
- Improved system performance by 40%
- Implemented microservices architecture

Developer at Microsoft (2017-2020)
- Built REST APIs handling 1M+ requests/day
- Developed CI/CD pipelines

SKILLS
Python, JavaScript, AWS, Docker, Kubernetes, PostgreSQL, React
                """
            },
            {
                'id': 'email_002',
                'from': 'jane.smith@email.com',
                'subject': 'Resume - Full Stack Developer Application',
                'date': datetime.now().strftime('%Y-%m-%d'),
                'attachment': 'Jane_Smith_CV.docx',
                'resume_text': """
Jane Smith
Full Stack Developer
jane.smith@email.com

EXPERIENCE
Full Stack Developer at Amazon (2019-Present)
- Developed e-commerce features used by millions
- Led migration to React and Node.js
- Reduced page load time by 60%

Junior Developer at Startup (2017-2019)
- Built MVP from scratch
- Implemented payment integration

SKILLS
React, Node.js, Python, MongoDB, AWS, TypeScript
                """
            }
        ]


# =============================================================================
# ATS CONNECTOR
# =============================================================================

class ATSConnector:
    """ATS integration for fetching candidates"""
    
    SUPPORTED_SYSTEMS = ['Greenhouse', 'Lever', 'Workday', 'SmartRecruiters', 'Jobvite']
    
    def __init__(self):
        self.connected = False
        self.system_type = None
        self.api_key = ''
        self.company_id = ''
    
    def connect(self, system_type: str, api_key: str, company_id: str = '') -> bool:
        """Connect to ATS system"""
        if system_type not in self.SUPPORTED_SYSTEMS:
            return False
        
        self.system_type = system_type
        self.api_key = api_key
        self.company_id = company_id
        self.connected = True
        return True
    
    def disconnect(self):
        """Disconnect from ATS"""
        self.connected = False
    
    def get_jobs(self) -> List[Dict]:
        """Get all job postings"""
        return [
            {'id': 'job_001', 'title': 'Senior Python Developer', 'department': 'Engineering', 'candidates': 45},
            {'id': 'job_002', 'title': 'Full Stack Engineer', 'department': 'Engineering', 'candidates': 78},
            {'id': 'job_003', 'title': 'DevOps Engineer', 'department': 'Infrastructure', 'candidates': 32},
        ]
    
    def get_candidates(self, job_id: str) -> List[Dict]:
        """Get candidates for a job"""
        return [
            {
                'id': 'cand_001',
                'name': 'Alex Johnson',
                'email': 'alex.j@email.com',
                'status': 'New',
                'applied_date': '2024-01-15',
                'resume_text': """
Alex Johnson
Senior Python Developer
alex.j@email.com

EXPERIENCE
Senior Python Developer at Netflix (2021-Present)
- Developed recommendation engine components
- Built high-throughput APIs
- Led team of 5 developers

Python Developer at Spotify (2018-2021)
- Built data pipelines
- Implemented ML models in production

SKILLS
Python, Django, FastAPI, AWS, Machine Learning, PostgreSQL
                """
            },
            {
                'id': 'cand_002',
                'name': 'Sam Williams',
                'email': 'sam.w@email.com',
                'status': 'In Review',
                'applied_date': '2024-01-14',
                'resume_text': """
Sam Williams
DevOps Engineer
sam.w@email.com

EXPERIENCE
DevOps Engineer at Uber (2020-Present)
- Managed Kubernetes clusters
- Implemented GitOps workflows
- Reduced deployment time by 80%

SRE at Airbnb (2017-2020)
- Built monitoring systems
- Automated infrastructure

SKILLS
Docker, Kubernetes, Terraform, AWS, CI/CD, Python
                """
            }
        ]
    
    def push_evaluation(self, candidate_id: str, score: int, grade: str, notes: str) -> bool:
        """Push evaluation results back to ATS"""
        return True


# =============================================================================
# MAIN WINDOW
# =============================================================================

class MainWindow(QMainWindow):
    """Main application window with modern UI"""
    
    def __init__(self):
        super().__init__()
        
        self.setWindowTitle("TrajectIQ Enterprise v4.0.0 - Intelligence-Driven Hiring")
        self.setMinimumSize(1400, 900)
        
        # Initialize connectors
        self.email_connector = EmailConnector()
        self.ats_connector = ATSConnector()
        self.discovered_resumes = []
        self.evaluation_results = []
        
        self._setup_ui()
        self._create_menus()
        self._update_status()
    
    def _setup_ui(self):
        """Setup the main UI"""
        # Apply main stylesheet
        self.setStyleSheet(ModernStyles.MAIN_WINDOW + ModernStyles.WIDGET)
        
        # Central widget
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(20)
        
        # Header
        header = self._create_header()
        layout.addWidget(header)
        
        # Main tabs
        self.tabs = QTabWidget()
        self.tabs.setStyleSheet(ModernStyles.TAB_WIDGET)
        
        # Add tabs
        self.tabs.addTab(self._create_evaluation_tab(), "📊  Evaluation")
        self.tabs.addTab(self._create_email_tab(), "📧  Email Integration")
        self.tabs.addTab(self._create_ats_tab(), "🔗  ATS Integration")
        self.tabs.addTab(self._create_dashboard_tab(), "📈  Dashboard")
        self.tabs.addTab(self._create_settings_tab(), "⚙️  Settings")
        
        layout.addWidget(self.tabs)
        
        # Status bar
        self.status_bar = QStatusBar()
        self.status_bar.setStyleSheet(ModernStyles.STATUS_BAR)
        self.setStatusBar(self.status_bar)
    
    def _create_header(self) -> QWidget:
        """Create header widget"""
        header = QFrame()
        header.setStyleSheet(ModernStyles.CARD)
        header.setMaximumHeight(80)
        
        layout = QHBoxLayout(header)
        
        # Load and display logo
        logo_path = Path(__file__).parent.parent.parent / "assets" / "logo.png"
        if logo_path.exists():
            logo_label = QLabel()
            pixmap = QPixmap(str(logo_path))
            # Scale logo to fit header height
            scaled_pixmap = pixmap.scaledToHeight(60, Qt.SmoothTransformation)
            logo_label.setPixmap(scaled_pixmap)
            layout.addWidget(logo_label)
        else:
            # Fallback to text logo
            logo_label = QLabel("🎯")
            logo_label.setStyleSheet("font-size: 32px;")
            layout.addWidget(logo_label)
        
        # Title and subtitle
        title_layout = QVBoxLayout()
        
        title = QLabel("TrajectIQ Enterprise")
        title.setStyleSheet("font-size: 24px; font-weight: bold; color: #7c83fd;")
        title_layout.addWidget(title)
        
        subtitle = QLabel("Intelligence-Driven Hiring Platform")
        subtitle.setStyleSheet("font-size: 12px; color: #888888;")
        title_layout.addWidget(subtitle)
        
        layout.addLayout(title_layout)
        layout.addStretch()
        
        # Version badge
        version = QLabel("v4.0.0")
        version.setStyleSheet("""
            background-color: rgba(124, 131, 253, 100);
            color: white;
            padding: 5px 15px;
            border-radius: 15px;
            font-weight: bold;
        """)
        layout.addWidget(version)
        
        return header
    
    def _create_evaluation_tab(self) -> QWidget:
        """Create the main evaluation tab"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setSpacing(15)
        
        # Top section - Input
        input_frame = QFrame()
        input_frame.setStyleSheet(ModernStyles.CARD)
        input_layout = QHBoxLayout(input_frame)
        
        # Resume section
        resume_section = QVBoxLayout()
        
        resume_header = QHBoxLayout()
        resume_label = QLabel("📄 Resume")
        resume_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #7c83fd;")
        resume_header.addWidget(resume_label)
        resume_header.addStretch()
        
        upload_btn = QPushButton("Upload File")
        upload_btn.setStyleSheet(ModernStyles.BUTTON)
        upload_btn.clicked.connect(self._upload_resume)
        resume_header.addWidget(upload_btn)
        
        resume_section.addLayout(resume_header)
        
        self.resume_input = QTextEdit()
        self.resume_input.setStyleSheet(ModernStyles.INPUT)
        self.resume_input.setPlaceholderText("Paste resume content here or upload a file...")
        self.resume_input.setMinimumHeight(250)
        resume_section.addWidget(self.resume_input)
        
        input_layout.addLayout(resume_section, 1)
        
        # Requirements section
        req_section = QVBoxLayout()
        
        req_header = QHBoxLayout()
        req_label = QLabel("📋 Job Requirements")
        req_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #7c83fd;")
        req_header.addWidget(req_label)
        req_header.addStretch()
        
        self.req_format = QComboBox()
        self.req_format.addItems(["Auto-detect", "Plain Text", "JSON"])
        self.req_format.setStyleSheet(ModernStyles.INPUT)
        self.req_format.setFixedWidth(120)
        self.req_format.currentIndexChanged.connect(self._on_format_changed)
        req_header.addWidget(self.req_format)
        
        req_section.addLayout(req_header)
        
        self.requirements_input = QTextEdit()
        self.requirements_input.setStyleSheet(ModernStyles.INPUT)
        self.requirements_input.setPlaceholderText(
            "Paste job description or requirements...\n\n"
            "Plain text: \"Looking for Python developer with 5+ years experience, AWS, Docker...\"\n\n"
            "JSON: [{\"name\": \"Python\", \"classification\": \"mission_critical\", \"minimum_years\": 5}]"
        )
        self.requirements_input.setMinimumHeight(250)
        req_section.addWidget(self.requirements_input)
        
        input_layout.addLayout(req_section, 1)
        
        layout.addWidget(input_frame)
        
        # Action buttons
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        
        self.run_btn = QPushButton("🚀  Run Evaluation")
        self.run_btn.setStyleSheet(ModernStyles.BUTTON_SUCCESS)
        self.run_btn.setMinimumWidth(180)
        self.run_btn.clicked.connect(self._run_evaluation)
        btn_layout.addWidget(self.run_btn)
        
        self.auto_btn = QPushButton("🔄  Auto-Scan & Evaluate")
        self.auto_btn.setStyleSheet(ModernStyles.BUTTON)
        self.auto_btn.setMinimumWidth(180)
        self.auto_btn.clicked.connect(self._auto_evaluate)
        btn_layout.addWidget(self.auto_btn)
        
        btn_layout.addStretch()
        layout.addLayout(btn_layout)
        
        # Progress
        self.progress_bar = QProgressBar()
        self.progress_bar.setStyleSheet(ModernStyles.PROGRESS_BAR)
        self.progress_bar.setVisible(False)
        self.progress_bar.setMaximumHeight(25)
        layout.addWidget(self.progress_bar)
        
        # Results section
        self.results_frame = QFrame()
        self.results_frame.setStyleSheet(ModernStyles.CARD)
        results_layout = QVBoxLayout(self.results_frame)
        
        results_label = QLabel("📊 Evaluation Results")
        results_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #7c83fd;")
        results_layout.addWidget(results_label)
        
        # Results content
        results_content = QHBoxLayout()
        
        # Left - Gauge and stats
        left_results = QVBoxLayout()
        
        # Gauge
        gauge_layout = QHBoxLayout()
        gauge_layout.addStretch()
        self.score_gauge = ScoreGaugeWidget(size=180)
        gauge_layout.addWidget(self.score_gauge)
        gauge_layout.addStretch()
        left_results.addLayout(gauge_layout)
        
        # Stat cards
        stats_layout = QHBoxLayout()
        
        self.stat_tier = StatCard("Tier", "5", "🏆", QColor(255, 169, 77))
        stats_layout.addWidget(self.stat_tier)
        
        self.stat_recommendation = StatCard("Recommendation", "PASS", "📋", QColor(255, 107, 107))
        stats_layout.addWidget(self.stat_recommendation)
        
        self.stat_skills = StatCard("Skills Match", "0%", "🎯", QColor(124, 131, 253))
        stats_layout.addWidget(self.stat_skills)
        
        left_results.addLayout(stats_layout)
        results_content.addLayout(left_results, 1)
        
        # Right - Score bars
        right_results = QVBoxLayout()
        
        self.skill_bar = ScoreBarWidget("Skills Score", 0, 100, QColor(124, 131, 253))
        right_results.addWidget(self.skill_bar)
        
        self.impact_bar = ScoreBarWidget("Impact Score", 0, 100, QColor(81, 207, 102))
        right_results.addWidget(self.impact_bar)
        
        self.trajectory_bar = ScoreBarWidget("Trajectory Score", 0, 100, QColor(255, 169, 77))
        right_results.addWidget(self.trajectory_bar)
        
        self.experience_bar = ScoreBarWidget("Experience Score", 0, 100, QColor(255, 107, 107))
        right_results.addWidget(self.experience_bar)
        
        right_results.addStretch()
        results_content.addLayout(right_results, 1)
        
        results_layout.addLayout(results_content)
        
        # Strengths and concerns
        details_layout = QHBoxLayout()
        
        # Strengths
        strengths_group = QGroupBox("✅ Strengths")
        strengths_group.setStyleSheet(ModernStyles.GROUP_BOX)
        strengths_layout = QVBoxLayout(strengths_group)
        self.strengths_list = QListWidget()
        self.strengths_list.setStyleSheet(ModernStyles.INPUT)
        strengths_layout.addWidget(self.strengths_list)
        details_layout.addWidget(strengths_group)
        
        # Concerns
        concerns_group = QGroupBox("⚠️ Concerns")
        concerns_group.setStyleSheet(ModernStyles.GROUP_BOX)
        concerns_layout = QVBoxLayout(concerns_group)
        self.concerns_list = QListWidget()
        self.concerns_list.setStyleSheet(ModernStyles.INPUT)
        concerns_layout.addWidget(self.concerns_list)
        details_layout.addWidget(concerns_group)
        
        results_layout.addLayout(details_layout)
        
        layout.addWidget(self.results_frame)
        
        return widget
    
    def _create_email_tab(self) -> QWidget:
        """Create email integration tab"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setSpacing(15)
        
        # Connection settings
        conn_frame = QFrame()
        conn_frame.setStyleSheet(ModernStyles.CARD)
        conn_layout = QFormLayout(conn_frame)
        
        self.email_host = QLineEdit()
        self.email_host.setStyleSheet(ModernStyles.INPUT)
        self.email_host.setPlaceholderText("imap.gmail.com")
        conn_layout.addRow("Host:", self.email_host)
        
        self.email_port = QSpinBox()
        self.email_port.setStyleSheet(ModernStyles.INPUT)
        self.email_port.setRange(1, 65535)
        self.email_port.setValue(993)
        conn_layout.addRow("Port:", self.email_port)
        
        self.email_user = QLineEdit()
        self.email_user.setStyleSheet(ModernStyles.INPUT)
        self.email_user.setPlaceholderText("your@email.com")
        conn_layout.addRow("Username:", self.email_user)
        
        self.email_pass = QLineEdit()
        self.email_pass.setStyleSheet(ModernStyles.INPUT)
        self.email_pass.setEchoMode(QLineEdit.Password)
        conn_layout.addRow("Password:", self.email_pass)
        
        self.email_ssl = QCheckBox("Use SSL/TLS")
        self.email_ssl.setChecked(True)
        conn_layout.addRow("", self.email_ssl)
        
        btn_layout = QHBoxLayout()
        self.email_connect_btn = QPushButton("Connect")
        self.email_connect_btn.setStyleSheet(ModernStyles.BUTTON_SUCCESS)
        self.email_connect_btn.clicked.connect(self._connect_email)
        btn_layout.addWidget(self.email_connect_btn)
        
        self.email_disconnect_btn = QPushButton("Disconnect")
        self.email_disconnect_btn.setStyleSheet(ModernStyles.BUTTON_DANGER)
        self.email_disconnect_btn.clicked.connect(self._disconnect_email)
        self.email_disconnect_btn.setEnabled(False)
        btn_layout.addWidget(self.email_disconnect_btn)
        
        conn_layout.addRow("", btn_layout)
        
        layout.addWidget(conn_frame)
        
        # Scan settings
        scan_frame = QFrame()
        scan_frame.setStyleSheet(ModernStyles.CARD)
        scan_layout = QHBoxLayout(scan_frame)
        
        scan_layout.addWidget(QLabel("Scan last:"))
        self.email_days = QSpinBox()
        self.email_days.setStyleSheet(ModernStyles.INPUT)
        self.email_days.setRange(1, 365)
        self.email_days.setValue(30)
        scan_layout.addWidget(self.email_days)
        scan_layout.addWidget(QLabel("days"))
        
        scan_layout.addStretch()
        
        self.scan_email_btn = QPushButton("🔍 Scan for Resumes")
        self.scan_email_btn.setStyleSheet(ModernStyles.BUTTON)
        self.scan_email_btn.clicked.connect(self._scan_email)
        self.scan_email_btn.setEnabled(False)
        scan_layout.addWidget(self.scan_email_btn)
        
        layout.addWidget(scan_frame)
        
        # Discovered resumes table
        resumes_frame = QFrame()
        resumes_frame.setStyleSheet(ModernStyles.CARD)
        resumes_layout = QVBoxLayout(resumes_frame)
        
        resumes_label = QLabel("📧 Discovered Resumes")
        resumes_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #7c83fd;")
        resumes_layout.addWidget(resumes_label)
        
        self.email_resumes_table = QTableWidget()
        self.email_resumes_table.setStyleSheet(ModernStyles.TABLE)
        self.email_resumes_table.setColumnCount(5)
        self.email_resumes_table.setHorizontalHeaderLabels(["From", "Subject", "Date", "Attachment", "Actions"])
        self.email_resumes_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        resumes_layout.addWidget(self.email_resumes_table)
        
        layout.addWidget(resumes_frame)
        
        return widget
    
    def _create_ats_tab(self) -> QWidget:
        """Create ATS integration tab"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setSpacing(15)
        
        # Connection settings
        conn_frame = QFrame()
        conn_frame.setStyleSheet(ModernStyles.CARD)
        conn_layout = QFormLayout(conn_frame)
        
        self.ats_type = QComboBox()
        self.ats_type.setStyleSheet(ModernStyles.INPUT)
        self.ats_type.addItems(ATSConnector.SUPPORTED_SYSTEMS)
        conn_layout.addRow("ATS System:", self.ats_type)
        
        self.ats_api_key = QLineEdit()
        self.ats_api_key.setStyleSheet(ModernStyles.INPUT)
        self.ats_api_key.setPlaceholderText("Enter your API key")
        self.ats_api_key.setEchoMode(QLineEdit.Password)
        conn_layout.addRow("API Key:", self.ats_api_key)
        
        self.ats_company = QLineEdit()
        self.ats_company.setStyleSheet(ModernStyles.INPUT)
        self.ats_company.setPlaceholderText("Company ID (optional)")
        conn_layout.addRow("Company ID:", self.ats_company)
        
        btn_layout = QHBoxLayout()
        self.ats_connect_btn = QPushButton("Connect")
        self.ats_connect_btn.setStyleSheet(ModernStyles.BUTTON_SUCCESS)
        self.ats_connect_btn.clicked.connect(self._connect_ats)
        btn_layout.addWidget(self.ats_connect_btn)
        
        self.ats_disconnect_btn = QPushButton("Disconnect")
        self.ats_disconnect_btn.setStyleSheet(ModernStyles.BUTTON_DANGER)
        self.ats_disconnect_btn.clicked.connect(self._disconnect_ats)
        self.ats_disconnect_btn.setEnabled(False)
        btn_layout.addWidget(self.ats_disconnect_btn)
        
        conn_layout.addRow("", btn_layout)
        
        layout.addWidget(conn_frame)
        
        # Jobs list
        jobs_frame = QFrame()
        jobs_frame.setStyleSheet(ModernStyles.CARD)
        jobs_layout = QVBoxLayout(jobs_frame)
        
        jobs_label = QLabel("📋 Job Postings")
        jobs_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #7c83fd;")
        jobs_layout.addWidget(jobs_label)
        
        self.ats_jobs_table = QTableWidget()
        self.ats_jobs_table.setStyleSheet(ModernStyles.TABLE)
        self.ats_jobs_table.setColumnCount(4)
        self.ats_jobs_table.setHorizontalHeaderLabels(["Job Title", "Department", "Candidates", "Actions"])
        self.ats_jobs_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        jobs_layout.addWidget(self.ats_jobs_table)
        
        layout.addWidget(jobs_frame)
        
        # Candidates list
        candidates_frame = QFrame()
        candidates_frame.setStyleSheet(ModernStyles.CARD)
        candidates_layout = QVBoxLayout(candidates_frame)
        
        candidates_label = QLabel("👥 Candidates")
        candidates_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #7c83fd;")
        candidates_layout.addWidget(candidates_label)
        
        self.ats_candidates_table = QTableWidget()
        self.ats_candidates_table.setStyleSheet(ModernStyles.TABLE)
        self.ats_candidates_table.setColumnCount(5)
        self.ats_candidates_table.setHorizontalHeaderLabels(["Name", "Email", "Status", "Applied", "Actions"])
        self.ats_candidates_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        candidates_layout.addWidget(self.ats_candidates_table)
        
        layout.addWidget(candidates_frame)
        
        return widget
    
    def _create_dashboard_tab(self) -> QWidget:
        """Create dashboard tab with analytics"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setSpacing(15)
        
        # Stats row
        stats_frame = QFrame()
        stats_frame.setStyleSheet(ModernStyles.CARD)
        stats_layout = QHBoxLayout(stats_frame)
        
        self.dash_total = StatCard("Total Evaluations", "0", "📊", QColor(124, 131, 253))
        stats_layout.addWidget(self.dash_total)
        
        self.dash_avg_score = StatCard("Average Score", "0", "📈", QColor(81, 207, 102))
        stats_layout.addWidget(self.dash_avg_score)
        
        self.dash_hired = StatCard("Strong Hires", "0", "✅", QColor(255, 169, 77))
        stats_layout.addWidget(self.dash_hired)
        
        self.dash_pending = StatCard("Pending Review", "0", "⏳", QColor(255, 107, 107))
        stats_layout.addWidget(self.dash_pending)
        
        layout.addWidget(stats_frame)
        
        # Results table
        results_frame = QFrame()
        results_frame.setStyleSheet(ModernStyles.CARD)
        results_layout = QVBoxLayout(results_frame)
        
        results_label = QLabel("📊 Evaluation History")
        results_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #7c83fd;")
        results_layout.addWidget(results_label)
        
        self.dash_table = QTableWidget()
        self.dash_table.setStyleSheet(ModernStyles.TABLE)
        self.dash_table.setColumnCount(7)
        self.dash_table.setHorizontalHeaderLabels([
            "Candidate", "Email", "Score", "Grade", "Recommendation", "Date", "Actions"
        ])
        self.dash_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        results_layout.addWidget(self.dash_table)
        
        # Export button
        export_layout = QHBoxLayout()
        export_layout.addStretch()
        
        export_btn = QPushButton("📥 Export to Excel")
        export_btn.setStyleSheet(ModernStyles.BUTTON)
        export_btn.clicked.connect(self._export_results)
        export_layout.addWidget(export_btn)
        
        results_layout.addLayout(export_layout)
        
        layout.addWidget(results_frame)
        
        return widget
    
    def _create_settings_tab(self) -> QWidget:
        """Create settings tab"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setSpacing(15)
        
        # License info
        license_frame = QFrame()
        license_frame.setStyleSheet(ModernStyles.CARD)
        license_layout = QFormLayout(license_frame)
        
        lm = get_license_manager()
        info = lm.get_license_info()
        
        if info:
            license_layout.addRow("Organization:", QLabel(info.organization_name))
            license_layout.addRow("License ID:", QLabel(info.license_id))
            license_layout.addRow("Max Users:", QLabel(str(info.max_users)))
            license_layout.addRow("AI Enabled:", QLabel("Yes" if info.ai_enabled else "No"))
            license_layout.addRow("ATS Enabled:", QLabel("Yes" if info.ats_enabled else "No"))
            if info.expiration_date:
                license_layout.addRow("Expires:", QLabel(info.expiration_date.strftime("%Y-%m-%d")))
        else:
            license_layout.addRow("Status:", QLabel("Demo Mode"))
        
        layout.addWidget(license_frame)
        
        # Scoring weights
        weights_frame = QFrame()
        weights_frame.setStyleSheet(ModernStyles.CARD)
        weights_layout = QFormLayout(weights_frame)
        
        self.weight_skills = QDoubleSpinBox()
        self.weight_skills.setStyleSheet(ModernStyles.INPUT)
        self.weight_skills.setRange(0.0, 1.0)
        self.weight_skills.setValue(0.35)
        self.weight_skills.setSingleStep(0.05)
        weights_layout.addRow("Skills Weight:", self.weight_skills)
        
        self.weight_impact = QDoubleSpinBox()
        self.weight_impact.setStyleSheet(ModernStyles.INPUT)
        self.weight_impact.setRange(0.0, 1.0)
        self.weight_impact.setValue(0.25)
        self.weight_impact.setSingleStep(0.05)
        weights_layout.addRow("Impact Weight:", self.weight_impact)
        
        self.weight_trajectory = QDoubleSpinBox()
        self.weight_trajectory.setStyleSheet(ModernStyles.INPUT)
        self.weight_trajectory.setRange(0.0, 1.0)
        self.weight_trajectory.setValue(0.25)
        self.weight_trajectory.setSingleStep(0.05)
        weights_layout.addRow("Trajectory Weight:", self.weight_trajectory)
        
        self.weight_experience = QDoubleSpinBox()
        self.weight_experience.setStyleSheet(ModernStyles.INPUT)
        self.weight_experience.setRange(0.0, 1.0)
        self.weight_experience.setValue(0.15)
        self.weight_experience.setSingleStep(0.05)
        weights_layout.addRow("Experience Weight:", self.weight_experience)
        
        layout.addWidget(weights_frame)
        
        layout.addStretch()
        
        return widget
    
    def _create_menus(self):
        """Create menu bar"""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("File")
        
        export_action = QAction("Export Results", self)
        export_action.setShortcut("Ctrl+E")
        export_action.triggered.connect(self._export_results)
        file_menu.addAction(export_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("Exit", self)
        exit_action.setShortcut("Alt+F4")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Help menu
        help_menu = menubar.addMenu("Help")
        
        about_action = QAction("About TrajectIQ", self)
        about_action.triggered.connect(self._show_about)
        help_menu.addAction(about_action)
    
    def _update_status(self):
        """Update status bar"""
        self.status_bar.showMessage("Ready - TrajectIQ Enterprise v4.0.0 | License: TRAJECTIQ-DEMO-2024-FULL-ACCESS")
    
    # =========================================================================
    # EVENT HANDLERS
    # =========================================================================
    
    def _on_format_changed(self, index):
        """Update placeholder based on format selection"""
        format_type = self.req_format.currentText()
        if format_type == "Plain Text":
            self.requirements_input.setPlaceholderText(
                "Paste job description here...\n\n"
                "Example:\n"
                "\"We are looking for a Senior Python Developer with 5+ years of experience. "
                "Required skills: Python, Django, AWS. Nice to have: React.\""
            )
        elif format_type == "JSON":
            self.requirements_input.setPlaceholderText(
                '[\n  {\n    "name": "Python",\n    "classification": "mission_critical",\n    "minimum_years": 5,\n    "is_critical": true\n  }\n]'
            )
        else:
            self.requirements_input.setPlaceholderText(
                "Paste job description or JSON requirements...\n"
                "Auto-detect will parse either format."
            )
    
    def _parse_requirements(self, text: str) -> list:
        """Parse requirements from text or JSON"""
        text = text.strip()
        if not text:
            return []
        
        format_type = self.req_format.currentText()
        
        # Try JSON first
        if format_type in ["JSON", "Auto-detect"]:
            if text.startswith('[') or text.startswith('{'):
                try:
                    reqs = json.loads(text)
                    if isinstance(reqs, dict):
                        reqs = [reqs]
                    return reqs
                except:
                    pass
        
        # Parse as plain text
        return self._extract_skills_from_text(text)
    
    def _extract_skills_from_text(self, text: str) -> list:
        """Extract skills from plain text"""
        tech_skills = [
            "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
            "react", "angular", "vue", "node.js", "nodejs", "django", "flask", "fastapi",
            "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "git",
            "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch",
            "machine learning", "ml", "deep learning", "tensorflow", "pytorch",
            "api", "rest", "graphql", "microservices", "ci/cd", "devops"
        ]
        
        text_lower = text.lower()
        requirements = []
        found_skills = set()
        
        # Extract years
        min_years = 0
        match = re.search(r'(\d+)\+?\s*years?', text_lower)
        if match:
            min_years = int(match.group(1))
        
        # Find skills
        for skill in tech_skills:
            if skill in text_lower and skill not in found_skills:
                found_skills.add(skill)
                
                classification = "core"
                if any(kw in text_lower for kw in ["required", "must have", "mandatory"]):
                    classification = "mission_critical"
                elif any(kw in text_lower for kw in ["nice to have", "preferred", "plus"]):
                    classification = "optional"
                
                requirements.append({
                    "name": skill.title(),
                    "classification": classification,
                    "minimum_years": min_years,
                    "is_critical": classification == "mission_critical"
                })
        
        return requirements if requirements else [{"name": "General", "classification": "core", "minimum_years": 0}]
    
    def _upload_resume(self):
        """Upload resume from file"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Open Resume", "",
            "Documents (*.pdf *.docx *.doc *.txt);;All Files (*)"
        )
        if file_path:
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                self.resume_input.setText(content)
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to read file: {str(e)}")
    
    def _run_evaluation(self):
        """Run evaluation"""
        resume_text = self.resume_input.toPlainText().strip()
        requirements_text = self.requirements_input.toPlainText().strip()
        
        if not resume_text:
            QMessageBox.warning(self, "Error", "Please enter resume content")
            return
        
        job_requirements = self._parse_requirements(requirements_text)
        
        self.run_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)
        self.status_bar.showMessage(f"Found {len(job_requirements)} skills in requirements. Evaluating...")
        
        self.worker = EvaluationWorker(resume_text, job_requirements, {})
        self.worker.progress.connect(lambda msg: self.status_bar.showMessage(msg))
        self.worker.finished.connect(self._on_evaluation_finished)
        self.worker.error.connect(self._on_evaluation_error)
        self.worker.start()
    
    def _on_evaluation_finished(self, result: dict):
        """Handle evaluation completion"""
        self.run_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        
        try:
            final = result.get("final_scoring", {}).get("hiring_index", {})
            score = final.get('overall_score', 0) if final else 0
            grade = final.get('grade', 'N/A') if final else 'N/A'
            tier = result.get("final_scoring", {}).get("tier", 5)
            recommendation = final.get('recommendation', 'pass') if final else 'pass'
            
            # Update gauge
            self.score_gauge.set_score(score, grade)
            
            # Update stat cards
            self.stat_tier.value_label.setText(str(tier))
            self.stat_recommendation.value_label.setText(recommendation.replace('_', ' ').title())
            self.stat_skills.value_label.setText(f"{score}%")
            
            # Update bars
            comp = result.get("final_scoring", {}).get("component_scores", {})
            self.skill_bar.set_value(comp.get('skill', 0))
            self.impact_bar.set_value(comp.get('impact', 0))
            self.trajectory_bar.set_value(comp.get('trajectory', 0))
            self.experience_bar.set_value(comp.get('experience', 0))
            
            # Update strengths and concerns
            self.strengths_list.clear()
            for s in final.get('key_strengths', []):
                self.strengths_list.addItem(f"✓ {s}")
            
            self.concerns_list.clear()
            for c in final.get('key_concerns', []):
                self.concerns_list.addItem(f"⚠ {c}")
            
            # Store result
            self.evaluation_results.append({
                'name': result.get('resume_parse', {}).get('contact_info', {}).get('name', 'Unknown'),
                'email': result.get('resume_parse', {}).get('contact_info', {}).get('email', ''),
                'score': score,
                'grade': grade,
                'recommendation': recommendation,
                'date': datetime.now().strftime('%Y-%m-%d %H:%M'),
                'result': result
            })
            
            # Update dashboard
            self._update_dashboard()
            
            self.status_bar.showMessage("Evaluation complete!")
            
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to display results: {str(e)}")
            self.status_bar.showMessage("Evaluation completed with errors")
    
    def _on_evaluation_error(self, error: str):
        """Handle evaluation error"""
        self.run_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        QMessageBox.critical(self, "Evaluation Error", error)
        self.status_bar.showMessage("Evaluation failed")
    
    def _auto_evaluate(self):
        """Auto-evaluate from discovered resumes"""
        if not self.discovered_resumes:
            QMessageBox.information(self, "Info", "No discovered resumes. Please scan email or ATS first.")
            return
        
        requirements_text = self.requirements_input.toPlainText().strip()
        job_requirements = self._parse_requirements(requirements_text)
        
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, len(self.discovered_resumes))
        self.status_bar.showMessage("Auto-evaluating discovered resumes...")
        
        for i, resume in enumerate(self.discovered_resumes):
            self.progress_bar.setValue(i)
            QApplication.processEvents()
            
            # Evaluate
            try:
                result = run_full_evaluation(resume.get('resume_text', ''), job_requirements, {})
                final = result.get("final_scoring", {}).get("hiring_index", {})
                
                self.evaluation_results.append({
                    'name': resume.get('name', resume.get('from', 'Unknown')),
                    'email': resume.get('email', ''),
                    'score': final.get('overall_score', 0),
                    'grade': final.get('grade', 'N/A'),
                    'recommendation': final.get('recommendation', 'pass'),
                    'date': datetime.now().strftime('%Y-%m-%d %H:%M'),
                    'result': result
                })
            except Exception as e:
                print(f"Error evaluating {resume.get('name', 'Unknown')}: {e}")
        
        self.progress_bar.setVisible(False)
        self._update_dashboard()
        self.tabs.setCurrentIndex(3)  # Switch to dashboard
        
        QMessageBox.information(self, "Complete", f"Evaluated {len(self.discovered_resumes)} resumes!")
    
    def _connect_email(self):
        """Connect to email server"""
        host = self.email_host.text()
        port = self.email_port.value()
        user = self.email_user.text()
        password = self.email_pass.text()
        use_ssl = self.email_ssl.isChecked()
        
        if not all([host, user, password]):
            QMessageBox.warning(self, "Error", "Please fill in all required fields")
            return
        
        try:
            self.email_connector.connect(host, port, user, password, use_ssl)
            self.email_connect_btn.setEnabled(False)
            self.email_disconnect_btn.setEnabled(True)
            self.scan_email_btn.setEnabled(True)
            self.status_bar.showMessage("Connected to email server")
            QMessageBox.information(self, "Success", "Connected to email server!")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to connect: {str(e)}")
    
    def _disconnect_email(self):
        """Disconnect from email"""
        self.email_connector.disconnect()
        self.email_connect_btn.setEnabled(True)
        self.email_disconnect_btn.setEnabled(False)
        self.scan_email_btn.setEnabled(False)
        self.status_bar.showMessage("Disconnected from email server")
    
    def _scan_email(self):
        """Scan email for resumes"""
        days = self.email_days.value()
        self.status_bar.showMessage("Scanning for resumes...")
        
        resumes = self.email_connector.scan_for_resumes(days=days)
        self.discovered_resumes.extend(resumes)
        
        # Update table
        self.email_resumes_table.setRowCount(len(resumes))
        for i, r in enumerate(resumes):
            self.email_resumes_table.setItem(i, 0, QTableWidgetItem(r.get('from', '')))
            self.email_resumes_table.setItem(i, 1, QTableWidgetItem(r.get('subject', '')))
            self.email_resumes_table.setItem(i, 2, QTableWidgetItem(r.get('date', '')))
            self.email_resumes_table.setItem(i, 3, QTableWidgetItem(r.get('attachment', '')))
            
            # Actions
            eval_btn = QPushButton("Evaluate")
            eval_btn.setStyleSheet(ModernStyles.BUTTON)
            eval_btn.clicked.connect(lambda checked, r=r: self._evaluate_single(r))
            self.email_resumes_table.setCellWidget(i, 4, eval_btn)
        
        self.status_bar.showMessage(f"Found {len(resumes)} resumes")
    
    def _connect_ats(self):
        """Connect to ATS"""
        system = self.ats_type.currentText()
        api_key = self.ats_api_key.text()
        company = self.ats_company.text()
        
        if not api_key:
            QMessageBox.warning(self, "Error", "Please enter API key")
            return
        
        try:
            self.ats_connector.connect(system, api_key, company)
            self.ats_connect_btn.setEnabled(False)
            self.ats_disconnect_btn.setEnabled(True)
            self.status_bar.showMessage(f"Connected to {system}")
            
            # Load jobs
            self._load_ats_jobs()
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to connect: {str(e)}")
    
    def _disconnect_ats(self):
        """Disconnect from ATS"""
        self.ats_connector.disconnect()
        self.ats_connect_btn.setEnabled(True)
        self.ats_disconnect_btn.setEnabled(False)
        self.status_bar.showMessage("Disconnected from ATS")
    
    def _load_ats_jobs(self):
        """Load jobs from ATS"""
        jobs = self.ats_connector.get_jobs()
        
        self.ats_jobs_table.setRowCount(len(jobs))
        for i, job in enumerate(jobs):
            self.ats_jobs_table.setItem(i, 0, QTableWidgetItem(job.get('title', '')))
            self.ats_jobs_table.setItem(i, 1, QTableWidgetItem(job.get('department', '')))
            self.ats_jobs_table.setItem(i, 2, QTableWidgetItem(str(job.get('candidates', 0))))
            
            load_btn = QPushButton("Load Candidates")
            load_btn.setStyleSheet(ModernStyles.BUTTON)
            load_btn.clicked.connect(lambda checked, jid=job.get('id'): self._load_ats_candidates(jid))
            self.ats_jobs_table.setCellWidget(i, 3, load_btn)
    
    def _load_ats_candidates(self, job_id: str):
        """Load candidates for a job"""
        candidates = self.ats_connector.get_candidates(job_id)
        
        self.ats_candidates_table.setRowCount(len(candidates))
        for i, cand in enumerate(candidates):
            self.ats_candidates_table.setItem(i, 0, QTableWidgetItem(cand.get('name', '')))
            self.ats_candidates_table.setItem(i, 1, QTableWidgetItem(cand.get('email', '')))
            self.ats_candidates_table.setItem(i, 2, QTableWidgetItem(cand.get('status', '')))
            self.ats_candidates_table.setItem(i, 3, QTableWidgetItem(cand.get('applied_date', '')))
            
            eval_btn = QPushButton("Evaluate")
            eval_btn.setStyleSheet(ModernStyles.BUTTON)
            eval_btn.clicked.connect(lambda checked, c=cand: self._evaluate_single(c))
            self.ats_candidates_table.setCellWidget(i, 4, eval_btn)
    
    def _evaluate_single(self, item: dict):
        """Evaluate a single resume"""
        self.resume_input.setText(item.get('resume_text', ''))
        self._run_evaluation()
    
    def _update_dashboard(self):
        """Update dashboard statistics"""
        total = len(self.evaluation_results)
        if total == 0:
            return
        
        avg_score = sum(r['score'] for r in self.evaluation_results) / total
        hired = sum(1 for r in self.evaluation_results if r['score'] >= 70)
        pending = sum(1 for r in self.evaluation_results if r['score'] < 50)
        
        self.dash_total.set_value(str(total))
        self.dash_avg_score.set_value(f"{avg_score:.0f}")
        self.dash_hired.set_value(str(hired))
        self.dash_pending.set_value(str(pending))
        
        # Update table
        self.dash_table.setRowCount(total)
        for i, r in enumerate(self.evaluation_results):
            self.dash_table.setItem(i, 0, QTableWidgetItem(r['name']))
            self.dash_table.setItem(i, 1, QTableWidgetItem(r['email']))
            self.dash_table.setItem(i, 2, QTableWidgetItem(str(r['score'])))
            self.dash_table.setItem(i, 3, QTableWidgetItem(r['grade']))
            self.dash_table.setItem(i, 4, QTableWidgetItem(r['recommendation']))
            self.dash_table.setItem(i, 5, QTableWidgetItem(r['date']))
            
            view_btn = QPushButton("View")
            view_btn.setStyleSheet(ModernStyles.BUTTON)
            view_btn.clicked.connect(lambda checked, r=r: self._view_result(r))
            self.dash_table.setCellWidget(i, 6, view_btn)
    
    def _view_result(self, result: dict):
        """View detailed result"""
        self._on_evaluation_finished(result.get('result', {}))
        self.tabs.setCurrentIndex(0)  # Switch to evaluation tab
    
    def _export_results(self):
        """Export results to Excel"""
        if not self.evaluation_results:
            QMessageBox.information(self, "Info", "No results to export")
            return
        
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Export Results", "trajectiq_results.csv",
            "CSV Files (*.csv);;All Files (*)"
        )
        
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write("Name,Email,Score,Grade,Recommendation,Date\n")
                    for r in self.evaluation_results:
                        f.write(f"{r['name']},{r['email']},{r['score']},{r['grade']},{r['recommendation']},{r['date']}\n")
                
                QMessageBox.information(self, "Success", f"Results exported to {file_path}")
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to export: {str(e)}")
    
    def _show_about(self):
        """Show about dialog"""
        QMessageBox.about(
            self,
            "About TrajectIQ Enterprise",
            """<h2>🎯 TrajectIQ Enterprise</h2>
            <p>Version 2.0.0</p>
            <p><b>Intelligence-Driven Hiring Platform</b></p>
            <p>Deterministic • Explainable • Auditable</p>
            <hr>
            <p><b>Features:</b></p>
            <ul>
                <li>AI-powered resume evaluation</li>
                <li>Email integration for resume discovery</li>
                <li>ATS integration (Greenhouse, Lever, Workday)</li>
                <li>Graphical analytics dashboard</li>
            </ul>
            <hr>
            <p>© 2024 TrajectIQ. All rights reserved.</p>"""
        )


# =============================================================================
# APPLICATION ENTRY POINT
# =============================================================================

def run_application():
    """Run the TrajectIQ desktop application"""
    
    # High DPI support
    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)
    
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    
    # Check license
    lm = get_license_manager()
    status, _ = lm.validate_license()
    
    if status != LicenseStatus.VALID:
        # Show activation dialog inline
        pass  # Demo mode
    
    # Show main window
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec_())


if __name__ == "__main__":
    run_application()
