"""
TrajectIQ Enterprise Desktop UI
===============================
Professional PyQt5 desktop interface.
"""

import sys
import os
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QTextEdit, QComboBox, QTabWidget,
    QTableWidget, QTableWidgetItem, QHeaderView, QGroupBox, QFormLayout,
    QSpinBox, QDoubleSpinBox, QCheckBox, QMessageBox, QProgressBar,
    QStatusBar, QToolBar, QAction, QMenu, QMenuBar, QSplitter,
    QTreeWidget, QTreeWidgetItem, QFrame, QScrollArea, QDialog,
    QDialogButtonBox, QDateEdit, QLabel, QStackedWidget
)
from PyQt5.QtCore import Qt, QTimer, QThread, pyqtSignal, QDate
from PyQt5.QtGui import QFont, QIcon, QColor, QPalette, QStandardItemModel, QStandardItem

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from security.rbac import get_rbac, Role, RBACManager
from security.license import get_license_manager, LicenseStatus
from modules.scoring_engine import run_full_evaluation


class Styles:
    """Application stylesheets"""
    
    DARK_THEME = """
    QMainWindow {
        background-color: #1a1a2e;
    }
    QWidget {
        background-color: #1a1a2e;
        color: #eaeaea;
        font-family: 'Segoe UI', Arial, sans-serif;
    }
    QGroupBox {
        border: 1px solid #4a4a6a;
        border-radius: 5px;
        margin-top: 10px;
        padding-top: 10px;
        font-weight: bold;
    }
    QGroupBox::title {
        subcontrol-origin: margin;
        left: 10px;
        padding: 0 5px;
        color: #7c83fd;
    }
    QLineEdit, QTextEdit, QComboBox, QSpinBox, QDoubleSpinBox {
        background-color: #16213e;
        border: 1px solid #4a4a6a;
        border-radius: 4px;
        padding: 5px;
        color: #eaeaea;
    }
    QLineEdit:focus, QTextEdit:focus {
        border: 1px solid #7c83fd;
    }
    QPushButton {
        background-color: #7c83fd;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        font-weight: bold;
    }
    QPushButton:hover {
        background-color: #5c63fd;
    }
    QPushButton:pressed {
        background-color: #4c53fd;
    }
    QPushButton:disabled {
        background-color: #4a4a6a;
        color: #888888;
    }
    QTabWidget::pane {
        border: 1px solid #4a4a6a;
        border-radius: 5px;
        background-color: #1a1a2e;
    }
    QTabBar::tab {
        background-color: #16213e;
        color: #eaeaea;
        padding: 8px 16px;
        border: 1px solid #4a4a6a;
        border-bottom: none;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
    }
    QTabBar::tab:selected {
        background-color: #7c83fd;
        color: white;
    }
    QTabBar::tab:hover:!selected {
        background-color: #2a2a4e;
    }
    QTableWidget {
        background-color: #16213e;
        border: 1px solid #4a4a6a;
        gridline-color: #4a4a6a;
    }
    QTableWidget::item {
        padding: 5px;
    }
    QTableWidget::item:selected {
        background-color: #7c83fd;
    }
    QHeaderView::section {
        background-color: #2a2a4e;
        color: #eaeaea;
        padding: 5px;
        border: 1px solid #4a4a6a;
        font-weight: bold;
    }
    QScrollBar:vertical {
        background-color: #16213e;
        width: 12px;
        border-radius: 6px;
    }
    QScrollBar::handle:vertical {
        background-color: #4a4a6a;
        border-radius: 6px;
        min-height: 20px;
    }
    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
        height: 0px;
    }
    QStatusBar {
        background-color: #16213e;
        color: #eaeaea;
    }
    QMenuBar {
        background-color: #16213e;
        color: #eaeaea;
    }
    QMenuBar::item:selected {
        background-color: #7c83fd;
    }
    QMenu {
        background-color: #16213e;
        color: #eaeaea;
        border: 1px solid #4a4a6a;
    }
    QMenu::item:selected {
        background-color: #7c83fd;
    }
    QProgressBar {
        background-color: #16213e;
        border: 1px solid #4a4a6a;
        border-radius: 4px;
        text-align: center;
    }
    QProgressBar::chunk {
        background-color: #7c83fd;
        border-radius: 3px;
    }
    QLabel {
        color: #eaeaea;
    }
    QDateEdit {
        background-color: #16213e;
        border: 1px solid #4a4a6a;
        border-radius: 4px;
        padding: 5px;
        color: #eaeaea;
    }
    """


class LoginDialog(QDialog):
    """Login dialog"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("TrajectIQ Enterprise - Login")
        self.setMinimumSize(400, 300)
        self.setStyleSheet(Styles.DARK_THEME)
        
        self.logged_in = False
        self._setup_ui()
    
    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        
        # Logo/Header
        header = QLabel("🔐 TrajectIQ Enterprise")
        header.setFont(QFont("Segoe UI", 18, QFont.Bold))
        header.setAlignment(Qt.AlignCenter)
        header.setStyleSheet("color: #7c83fd; margin-bottom: 20px;")
        layout.addWidget(header)
        
        # Login form
        form_group = QGroupBox("Sign In")
        form_layout = QFormLayout(form_group)
        
        self.username_input = QLineEdit()
        self.username_input.setPlaceholderText("Enter username")
        form_layout.addRow("Username:", self.username_input)
        
        self.password_input = QLineEdit()
        self.password_input.setEchoMode(QLineEdit.Password)
        self.password_input.setPlaceholderText("Enter password")
        self.password_input.returnPressed.connect(self._login)
        form_layout.addRow("Password:", self.password_input)
        
        layout.addWidget(form_group)
        
        # Error label
        self.error_label = QLabel("")
        self.error_label.setStyleSheet("color: #ff6b6b;")
        self.error_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.error_label)
        
        # Buttons
        button_layout = QHBoxLayout()
        
        self.login_btn = QPushButton("Sign In")
        self.login_btn.clicked.connect(self._login)
        button_layout.addWidget(self.login_btn)
        
        layout.addLayout(button_layout)
        
        # License info
        license_info = self._get_license_info()
        license_label = QLabel(license_info)
        license_label.setStyleSheet("color: #888888; font-size: 10px;")
        license_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(license_label)
    
    def _get_license_info(self) -> str:
        lm = get_license_manager()
        info = lm.get_license_info()
        if info:
            return f"Licensed to: {info.organization_name}"
        return "Not licensed - Activation required"
    
    def _login(self):
        username = self.username_input.text().strip()
        password = self.password_input.text()
        
        if not username or not password:
            self.error_label.setText("Please enter username and password")
            return
        
        try:
            rbac = get_rbac()
            user, session = rbac.authenticate(username, password)
            self.logged_in = True
            self.accept()
        except Exception as e:
            self.error_label.setText(str(e))


class ActivationDialog(QDialog):
    """License activation dialog"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("TrajectIQ Enterprise - License Activation")
        self.setMinimumSize(500, 400)
        self.setStyleSheet(Styles.DARK_THEME)
        
        self._setup_ui()
    
    def _setup_ui(self):
        layout = QVBoxLayout(self)
        
        # Header
        header = QLabel("📋 License Activation")
        header.setFont(QFont("Segoe UI", 16, QFont.Bold))
        header.setAlignment(Qt.AlignCenter)
        header.setStyleSheet("color: #7c83fd; margin-bottom: 15px;")
        layout.addWidget(header)
        
        # Info
        info = QLabel(
            "Enter your license key to activate TrajectIQ Enterprise.\n"
            "Contact support@trajectiq.com to obtain a license key."
        )
        info.setAlignment(Qt.AlignCenter)
        info.setStyleSheet("color: #aaaaaa; margin-bottom: 15px;")
        layout.addWidget(info)
        
        # License key input
        form_group = QGroupBox("License Key")
        form_layout = QVBoxLayout(form_group)
        
        self.license_input = QTextEdit()
        self.license_input.setPlaceholderText("Paste your license key here...")
        self.license_input.setMaximumHeight(120)
        form_layout.addWidget(self.license_input)
        
        layout.addWidget(form_group)
        
        # Status
        self.status_label = QLabel("")
        self.status_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.status_label)
        
        # Buttons
        button_layout = QHBoxLayout()
        
        activate_btn = QPushButton("Activate License")
        activate_btn.clicked.connect(self._activate)
        button_layout.addWidget(activate_btn)
        
        layout.addLayout(button_layout)
        
        # Machine fingerprint
        from security.license import MachineFingerprint
        fp = MachineFingerprint.generate()
        fp_label = QLabel(f"Machine ID: {fp}")
        fp_label.setStyleSheet("color: #666666; font-size: 9px;")
        fp_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(fp_label)
    
    def _activate(self):
        license_key = self.license_input.toPlainText().strip()
        
        if not license_key:
            self.status_label.setText("Please enter a license key")
            self.status_label.setStyleSheet("color: #ff6b6b;")
            return
        
        lm = get_license_manager()
        status, info = lm.activate_license(license_key)
        
        if status == LicenseStatus.VALID:
            self.status_label.setText("✓ License activated successfully!")
            self.status_label.setStyleSheet("color: #51cf66;")
            QMessageBox.information(self, "Success", "License activated successfully!")
            self.accept()
        elif status == LicenseStatus.EXPIRED:
            self.status_label.setText("License has expired")
            self.status_label.setStyleSheet("color: #ff6b6b;")
        elif status == LicenseStatus.MACHINE_MISMATCH:
            self.status_label.setText("License is bound to another machine")
            self.status_label.setStyleSheet("color: #ff6b6b;")
        else:
            self.status_label.setText("Invalid license key")
            self.status_label.setStyleSheet("color: #ff6b6b;")


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
            self.error.emit(str(e))


class MainWindow(QMainWindow):
    """Main application window"""
    
    def __init__(self):
        super().__init__()
        
        self.setWindowTitle("TrajectIQ Enterprise - Intelligence-Driven Hiring")
        self.setMinimumSize(1200, 800)
        
        self._check_license()
        self._setup_ui()
        self._create_menus()
        self._update_status()
    
    def _check_license(self):
        lm = get_license_manager()
        status, _ = lm.validate_license()
        
        if status != LicenseStatus.VALID:
            # Show activation dialog
            dialog = ActivationDialog(self)
            if dialog.exec_() != QDialog.Accepted:
                sys.exit(0)
    
    def _setup_ui(self):
        # Apply stylesheet
        self.setStyleSheet(Styles.DARK_THEME)
        
        # Central widget with tabs
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        
        # Tab widget
        self.tabs = QTabWidget()
        layout.addWidget(self.tabs)
        
        # Add tabs
        self.tabs.addTab(self._create_evaluation_tab(), "📊 Evaluation")
        self.tabs.addTab(self._create_candidates_tab(), "👥 Candidates")
        self.tabs.addTab(self._create_analytics_tab(), "📈 Analytics")
        self.tabs.addTab(self._create_bias_tab(), "⚖️ Bias Monitor")
        self.tabs.addTab(self._create_settings_tab(), "⚙️ Settings")
        
        # Status bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
    
    def _create_evaluation_tab(self) -> QWidget:
        widget = QWidget()
        layout = QHBoxLayout(widget)
        
        # Left panel - Input
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        
        # Resume input
        resume_group = QGroupBox("Resume Content")
        resume_layout = QVBoxLayout(resume_group)
        
        self.resume_input = QTextEdit()
        self.resume_input.setPlaceholderText("Paste resume content here...")
        resume_layout.addWidget(self.resume_input)
        
        left_layout.addWidget(resume_group)
        
        # Job requirements
        req_group = QGroupBox("Job Requirements (JSON)")
        req_layout = QVBoxLayout(req_group)
        
        self.requirements_input = QTextEdit()
        self.requirements_input.setPlaceholderText('[\n  {\n    "name": "Python",\n    "classification": "mission_critical",\n    "minimum_years": 5,\n    "is_critical": true\n  }\n]')
        self.requirements_input.setMaximumHeight(200)
        req_layout.addWidget(self.requirements_input)
        
        left_layout.addWidget(req_group)
        
        # Weights
        weights_group = QGroupBox("Scoring Weights")
        weights_layout = QFormLayout(weights_group)
        
        self.skills_weight = QDoubleSpinBox()
        self.skills_weight.setRange(0.0, 1.0)
        self.skills_weight.setValue(0.35)
        self.skills_weight.setSingleStep(0.05)
        weights_layout.addRow("Skills:", self.skills_weight)
        
        self.impact_weight = QDoubleSpinBox()
        self.impact_weight.setRange(0.0, 1.0)
        self.impact_weight.setValue(0.25)
        self.impact_weight.setSingleStep(0.05)
        weights_layout.addRow("Impact:", self.impact_weight)
        
        self.trajectory_weight = QDoubleSpinBox()
        self.trajectory_weight.setRange(0.0, 1.0)
        self.trajectory_weight.setValue(0.25)
        self.trajectory_weight.setSingleStep(0.05)
        weights_layout.addRow("Trajectory:", self.trajectory_weight)
        
        self.experience_weight = QDoubleSpinBox()
        self.experience_weight.setRange(0.0, 1.0)
        self.experience_weight.setValue(0.15)
        self.experience_weight.setSingleStep(0.05)
        weights_layout.addRow("Experience:", self.experience_weight)
        
        left_layout.addWidget(weights_group)
        
        # Run button
        self.run_btn = QPushButton("🚀 Run Evaluation")
        self.run_btn.setMinimumHeight(40)
        self.run_btn.clicked.connect(self._run_evaluation)
        left_layout.addWidget(self.run_btn)
        
        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        left_layout.addWidget(self.progress_bar)
        
        layout.addWidget(left_panel, 1)
        
        # Right panel - Results
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        
        results_group = QGroupBox("Evaluation Results")
        results_layout = QVBoxLayout(results_group)
        
        self.results_output = QTextEdit()
        self.results_output.setReadOnly(True)
        self.results_output.setPlaceholderText("Results will appear here...")
        results_layout.addWidget(self.results_output)
        
        right_layout.addWidget(results_group)
        
        layout.addWidget(right_panel, 1)
        
        return widget
    
    def _create_candidates_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Search/filter bar
        filter_layout = QHBoxLayout()
        
        filter_layout.addWidget(QLabel("Search:"))
        self.candidate_search = QLineEdit()
        self.candidate_search.setPlaceholderText("Search candidates...")
        filter_layout.addWidget(self.candidate_search)
        
        filter_layout.addWidget(QLabel("Status:"))
        self.status_filter = QComboBox()
        self.status_filter.addItems(["All", "Pending", "Processed", "Reviewed"])
        filter_layout.addWidget(self.status_filter)
        
        refresh_btn = QPushButton("Refresh")
        refresh_btn.clicked.connect(self._refresh_candidates)
        filter_layout.addWidget(refresh_btn)
        
        filter_layout.addStretch()
        layout.addLayout(filter_layout)
        
        # Candidates table
        self.candidates_table = QTableWidget()
        self.candidates_table.setColumnCount(8)
        self.candidates_table.setHorizontalHeaderLabels([
            "ID", "Name", "Email", "Job", "Score", "Grade", "Status", "Date"
        ])
        self.candidates_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        layout.addWidget(self.candidates_table)
        
        return widget
    
    def _create_analytics_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Stats cards
        cards_layout = QHBoxLayout()
        
        self._add_stat_card(cards_layout, "Resumes Processed", "0", "#7c83fd")
        self._add_stat_card(cards_layout, "Avg. Score", "0", "#51cf66")
        self._add_stat_card(cards_layout, "AI Usage", "0%", "#ffa94d")
        self._add_stat_card(cards_layout, "Active Users", "0", "#339af0")
        
        layout.addLayout(cards_layout)
        
        # Score distribution
        dist_group = QGroupBox("Score Distribution")
        dist_layout = QVBoxLayout(dist_group)
        
        self.score_dist_table = QTableWidget()
        self.score_dist_table.setColumnCount(2)
        self.score_dist_table.setHorizontalHeaderLabels(["Grade", "Count"])
        self.score_dist_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        dist_layout.addWidget(self.score_dist_table)
        
        layout.addWidget(dist_group)
        
        # Activity log
        activity_group = QGroupBox("Recent Activity")
        activity_layout = QVBoxLayout(activity_group)
        
        self.activity_table = QTableWidget()
        self.activity_table.setColumnCount(4)
        self.activity_table.setHorizontalHeaderLabels(["Time", "User", "Action", "Details"])
        self.activity_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        activity_layout.addWidget(self.activity_table)
        
        layout.addWidget(activity_group)
        
        # Refresh button
        refresh_btn = QPushButton("Refresh Analytics")
        refresh_btn.clicked.connect(self._refresh_analytics)
        layout.addWidget(refresh_btn)
        
        return widget
    
    def _add_stat_card(self, layout: QHBoxLayout, title: str, value: str, color: str):
        card = QFrame()
        card.setStyleSheet(f"""
            QFrame {{
                background-color: #16213e;
                border-radius: 8px;
                padding: 15px;
            }}
            QLabel {{
                color: {color};
            }}
        """)
        card_layout = QVBoxLayout(card)
        
        title_label = QLabel(title)
        title_label.setStyleSheet("font-size: 12px; color: #888888;")
        card_layout.addWidget(title_label)
        
        value_label = QLabel(value)
        value_label.setStyleSheet(f"font-size: 24px; font-weight: bold; color: {color};")
        value_label.setObjectName(f"stat_{title.lower().replace(' ', '_')}")
        card_layout.addWidget(value_label)
        
        layout.addWidget(card)
    
    def _create_bias_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Fairness score
        score_group = QGroupBox("Fairness Score")
        score_layout = QVBoxLayout(score_group)
        
        self.fairness_label = QLabel("--")
        self.fairness_label.setStyleSheet("font-size: 48px; font-weight: bold; color: #51cf66;")
        self.fairness_label.setAlignment(Qt.AlignCenter)
        score_layout.addWidget(self.fairness_label)
        
        layout.addWidget(score_group)
        
        # Bias indicators
        indicators_group = QGroupBox("Potential Bias Indicators")
        indicators_layout = QVBoxLayout(indicators_group)
        
        self.bias_table = QTableWidget()
        self.bias_table.setColumnCount(4)
        self.bias_table.setHorizontalHeaderLabels(["Type", "Description", "Severity", "Recommendation"])
        self.bias_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        indicators_layout.addWidget(self.bias_table)
        
        layout.addWidget(indicators_group)
        
        # Compliance notes
        compliance_group = QGroupBox("Compliance Notes")
        compliance_layout = QVBoxLayout(compliance_group)
        
        self.compliance_text = QTextEdit()
        self.compliance_text.setReadOnly(True)
        compliance_layout.addWidget(self.compliance_text)
        
        layout.addWidget(compliance_group)
        
        # Run analysis button
        analyze_btn = QPushButton("Run Bias Analysis")
        analyze_btn.clicked.connect(self._run_bias_analysis)
        layout.addWidget(analyze_btn)
        
        return widget
    
    def _create_settings_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # License info
        license_group = QGroupBox("License Information")
        license_layout = QFormLayout(license_group)
        
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
            license_layout.addRow("Status:", QLabel("Not licensed"))
        
        layout.addWidget(license_group)
        
        # User management (admin only)
        rbac = get_rbac()
        current_user = rbac.get_current_user()
        
        if current_user and current_user.role == Role.SUPER_ADMIN:
            users_group = QGroupBox("User Management")
            users_layout = QVBoxLayout(users_group)
            
            self.users_table = QTableWidget()
            self.users_table.setColumnCount(5)
            self.users_table.setHorizontalHeaderLabels(["Username", "Name", "Role", "Status", "Actions"])
            self.users_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
            users_layout.addWidget(self.users_table)
            
            add_user_btn = QPushButton("Add User")
            users_layout.addWidget(add_user_btn)
            
            layout.addWidget(users_group)
        
        # AI Settings
        ai_group = QGroupBox("AI Enhancement Settings")
        ai_layout = QFormLayout(ai_group)
        
        self.ai_mode_combo = QComboBox()
        self.ai_mode_combo.addItems(["Off", "Local", "API"])
        ai_layout.addRow("AI Mode:", self.ai_mode_combo)
        
        layout.addWidget(ai_group)
        
        layout.addStretch()
        
        return widget
    
    def _create_menus(self):
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("File")
        
        export_action = QAction("Export Report", self)
        export_action.setShortcut("Ctrl+E")
        file_menu.addAction(export_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("Exit", self)
        exit_action.setShortcut("Alt+F4")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # View menu
        view_menu = menubar.addMenu("View")
        
        refresh_action = QAction("Refresh", self)
        refresh_action.setShortcut("F5")
        view_menu.addAction(refresh_action)
        
        # Help menu
        help_menu = menubar.addMenu("Help")
        
        about_action = QAction("About TrajectIQ", self)
        about_action.triggered.connect(self._show_about)
        help_menu.addAction(about_action)
        
        docs_action = QAction("Documentation", self)
        help_menu.addAction(docs_action)
    
    def _update_status(self):
        rbac = get_rbac()
        user = rbac.get_current_user()
        
        if user:
            self.status_bar.showMessage(f"Logged in as: {user.username} ({user.role.value})")
    
    def _run_evaluation(self):
        resume_text = self.resume_input.toPlainText().strip()
        requirements_text = self.requirements_input.toPlainText().strip()
        
        if not resume_text:
            QMessageBox.warning(self, "Error", "Please enter resume content")
            return
        
        try:
            job_requirements = eval(requirements_text) if requirements_text else []
        except:
            QMessageBox.warning(self, "Error", "Invalid job requirements JSON")
            return
        
        weights = {
            "skills": self.skills_weight.value(),
            "impact": self.impact_weight.value(),
            "trajectory": self.trajectory_weight.value(),
            "experience": self.experience_weight.value()
        }
        
        # Validate weights
        total = sum(weights.values())
        if abs(total - 1.0) > 0.001:
            QMessageBox.warning(self, "Error", f"Weights must sum to 1.0 (current: {total:.2f})")
            return
        
        # Run in background
        self.run_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)  # Indeterminate
        
        self.worker = EvaluationWorker(resume_text, job_requirements, weights)
        self.worker.progress.connect(lambda msg: self.status_bar.showMessage(msg))
        self.worker.finished.connect(self._on_evaluation_finished)
        self.worker.error.connect(self._on_evaluation_error)
        self.worker.start()
    
    def _on_evaluation_finished(self, result: dict):
        self.run_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        
        # Format results
        final = result.get("final_scoring", {}).get("hiring_index", {})
        
        output = f"""
╔══════════════════════════════════════════════════════════════╗
║                 EVALUATION COMPLETE                          ║
╠══════════════════════════════════════════════════════════════╣
║  HIRING INDEX: {final.get('overall_score', 0):>3}/100                                   
║  GRADE: {final.get('grade', 'N/A'):>3}                                             
║  TIER: {final.get('tier', 'N/A')}                                              
║  RECOMMENDATION: {final.get('recommendation', 'N/A'):>15}                        
╠══════════════════════════════════════════════════════════════╣
║  COMPONENT SCORES:                                           ║
║  • Skills:      {final.get('skill_score', 0):>3}/100                                   
║  • Impact:      {final.get('impact_score', 0):>3}/100                                   
║  • Trajectory:  {final.get('trajectory_score', 0):>3}/100                                   
║  • Experience:  {final.get('experience_score', 0):>3}/100                                   
║  • AI Signal:   {final.get('ai_signal', 0):>3}/100 (advisory)                            
╠══════════════════════════════════════════════════════════════╣
║  KEY STRENGTHS:                                              ║
"""
        
        for strength in final.get("key_strengths", []):
            output += f"║  ✓ {strength[:50]:<50}║\n"
        
        output += "╠══════════════════════════════════════════════════════════════╣\n"
        output += "║  KEY CONCERNS:\n"
        
        for concern in final.get("key_concerns", []):
            output += f"║  ⚠ {concern[:50]:<50}║\n"
        
        output += "╚══════════════════════════════════════════════════════════════╝\n"
        output += f"\nEvaluation ID: {result.get('evaluation_id', 'N/A')}\n"
        output += f"Timestamp: {result.get('timestamp', 'N/A')}\n"
        
        self.results_output.setText(output)
        self.status_bar.showMessage("Evaluation complete")
    
    def _on_evaluation_error(self, error: str):
        self.run_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        QMessageBox.critical(self, "Error", f"Evaluation failed: {error}")
        self.status_bar.showMessage("Evaluation failed")
    
    def _refresh_candidates(self):
        # Mock data for now
        self.candidates_table.setRowCount(3)
        
        data = [
            ("CAND-001", "John Smith", "john@example.com", "Sr. Engineer", "85", "A-", "Processed", "2024-01-15"),
            ("CAND-002", "Jane Doe", "jane@example.com", "Data Scientist", "72", "B-", "Pending", "2024-01-15"),
            ("CAND-003", "Bob Johnson", "bob@example.com", "Sr. Engineer", "91", "A", "Processed", "2024-01-14"),
        ]
        
        for row, item in enumerate(data):
            for col, value in enumerate(item):
                self.candidates_table.setItem(row, col, QTableWidgetItem(value))
    
    def _refresh_analytics(self):
        from modules.bias_detection import get_analytics
        
        analytics = get_analytics()
        stats = analytics.get_dashboard_stats(30)
        
        # Update stat cards
        for card in self.findChildren(QLabel):
            name = card.objectName()
            if name == "stat_resumes_processed":
                card.setText(str(stats.get("resumes_processed", 0)))
            elif name == "stat_avg._score":
                card.setText(str(stats.get("average_hiring_index", 0)))
            elif name == "stat_ai_usage":
                card.setText(f"{stats.get('ai_usage_rate', 0)}%")
            elif name == "stat_active_users":
                card.setText(str(stats.get("active_users", 0)))
        
        # Update score distribution
        dist = stats.get("score_distribution", {})
        self.score_dist_table.setRowCount(len(dist))
        
        for row, (grade, count) in enumerate(dist.items()):
            self.score_dist_table.setItem(row, 0, QTableWidgetItem(grade))
            self.score_dist_table.setItem(row, 1, QTableWidgetItem(str(count)))
    
    def _run_bias_analysis(self):
        from modules.bias_detection import get_bias_detector
        
        detector = get_bias_detector()
        report = detector.analyze_daily()
        
        # Update fairness score
        self.fairness_label.setText(f"{report.fairness_score:.0f}")
        
        if report.fairness_score >= 85:
            self.fairness_label.setStyleSheet("font-size: 48px; font-weight: bold; color: #51cf66;")
        elif report.fairness_score >= 70:
            self.fairness_label.setStyleSheet("font-size: 48px; font-weight: bold; color: #ffa94d;")
        else:
            self.fairness_label.setStyleSheet("font-size: 48px; font-weight: bold; color: #ff6b6b;")
        
        # Update indicators table
        self.bias_table.setRowCount(len(report.potential_bias_indicators))
        
        for row, indicator in enumerate(report.potential_bias_indicators):
            self.bias_table.setItem(row, 0, QTableWidgetItem(indicator.indicator_type))
            self.bias_table.setItem(row, 1, QTableWidgetItem(indicator.description))
            self.bias_table.setItem(row, 2, QTableWidgetItem(indicator.severity))
            self.bias_table.setItem(row, 3, QTableWidgetItem(indicator.recommendation))
        
        # Update compliance notes
        self.compliance_text.setText("\n".join(report.compliance_notes))
    
    def _show_about(self):
        QMessageBox.about(
            self,
            "About TrajectIQ Enterprise",
            """<h2>TrajectIQ Enterprise</h2>
            <p>Version 1.0.0</p>
            <p><b>Intelligence-Driven Hiring Platform</b></p>
            <p>Deterministic • Explainable • Auditable</p>
            <hr>
            <p>© 2024 TrajectIQ. All rights reserved.</p>
            <p>For support: support@trajectiq.com</p>"""
        )


def run_application():
    """Run the TrajectIQ desktop application"""
    
    # High DPI support
    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)
    
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    
    # Check license first
    from security.license import get_license_manager
    lm = get_license_manager()
    status, _ = lm.validate_license()
    
    if status != LicenseStatus.VALID:
        # Show activation dialog
        dialog = ActivationDialog()
        if dialog.exec_() != QDialog.Accepted:
            sys.exit(0)
    
    # Show login
    login = LoginDialog()
    if login.exec_() != QDialog.Accepted:
        sys.exit(0)
    
    # Show main window
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec_())


if __name__ == "__main__":
    run_application()
