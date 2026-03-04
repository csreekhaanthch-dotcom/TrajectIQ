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
    """


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
            "For trial use, enter: TRAJECTIQ-DEMO-2024-FULL-ACCESS"
        )
        info.setAlignment(Qt.AlignCenter)
        info.setStyleSheet("color: #aaaaaa; margin-bottom: 15px;")
        layout.addWidget(info)
        
        # License key input
        form_group = QGroupBox("License Key")
        form_layout = QVBoxLayout(form_group)
        
        self.license_input = QTextEdit()
        self.license_input.setPlaceholderText("Paste your license key here...\n\nFor trial: TRAJECTIQ-DEMO-2024-FULL-ACCESS")
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
    
    def _activate(self):
        license_key = self.license_input.toPlainText().strip()
        
        if not license_key:
            self.status_label.setText("Please enter a license key")
            self.status_label.setStyleSheet("color: #ff6b6b;")
            return
        
        from security.license import get_license_manager, LicenseStatus
        
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
            from modules.scoring_engine import run_full_evaluation
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


class MainWindow(QMainWindow):
    """Main application window"""
    
    def __init__(self):
        super().__init__()
        
        self.setWindowTitle("TrajectIQ Enterprise - Intelligence-Driven Hiring")
        self.setMinimumSize(1200, 800)
        
        self._setup_ui()
        self._create_menus()
        self._update_status()
    
    def _setup_ui(self):
        self.setStyleSheet(Styles.DARK_THEME)
        
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        
        self.tabs = QTabWidget()
        layout.addWidget(self.tabs)
        
        self.tabs.addTab(self._create_evaluation_tab(), "📊 Evaluation")
        self.tabs.addTab(self._create_candidates_tab(), "👥 Candidates")
        self.tabs.addTab(self._create_analytics_tab(), "📈 Analytics")
        
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
    
    def _create_evaluation_tab(self) -> QWidget:
        widget = QWidget()
        layout = QHBoxLayout(widget)
        
        # Left panel
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
        req_group = QGroupBox("Job Requirements")
        req_layout = QVBoxLayout(req_group)
        
        # Add format selector
        format_layout = QHBoxLayout()
        format_layout.addWidget(QLabel("Format:"))
        self.req_format = QComboBox()
        self.req_format.addItems(["Auto-detect", "Plain Text", "JSON"])
        self.req_format.currentIndexChanged.connect(self._on_format_changed)
        format_layout.addWidget(self.req_format)
        format_layout.addStretch()
        req_layout.addLayout(format_layout)
        
        self.requirements_input = QTextEdit()
        self.requirements_input.setPlaceholderText(
            "Paste your job requirements or job description here.\n\n"
            "Examples:\n"
            "• Plain text: \"Looking for Python developer with 5+ years experience, AWS, React...\"\n"
            "• JSON: [{\"name\": \"Python\", \"classification\": \"mission_critical\", \"minimum_years\": 5}]\n\n"
            "The app will automatically extract skills from plain text."
        )
        self.requirements_input.setMaximumHeight(150)
        req_layout.addWidget(self.requirements_input)
        
        left_layout.addWidget(req_group)
        
        # Run button
        self.run_btn = QPushButton("🚀 Run Evaluation")
        self.run_btn.setMinimumHeight(40)
        self.run_btn.clicked.connect(self._run_evaluation)
        left_layout.addWidget(self.run_btn)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        left_layout.addWidget(self.progress_bar)
        
        layout.addWidget(left_panel, 1)
        
        # Right panel
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
        
        self.candidates_table = QTableWidget()
        self.candidates_table.setColumnCount(6)
        self.candidates_table.setHorizontalHeaderLabels([
            "ID", "Name", "Job", "Score", "Grade", "Date"
        ])
        self.candidates_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        layout.addWidget(self.candidates_table)
        
        # Add sample data
        self.candidates_table.setRowCount(3)
        data = [
            ("CAND-001", "John Smith", "Sr. Engineer", "85", "A-", "2024-01-15"),
            ("CAND-002", "Jane Doe", "Data Scientist", "72", "B-", "2024-01-15"),
            ("CAND-003", "Bob Johnson", "Sr. Engineer", "91", "A", "2024-01-14"),
        ]
        for row, item in enumerate(data):
            for col, value in enumerate(item):
                self.candidates_table.setItem(row, col, QTableWidgetItem(value))
        
        return widget
    
    def _create_analytics_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Stats
        stats_layout = QHBoxLayout()
        
        for title, value, color in [("Resumes Processed", "156", "#7c83fd"), ("Avg. Score", "78", "#51cf66"), ("Active Users", "5", "#339af0")]:
            card = QFrame()
            card.setStyleSheet(f"QFrame {{ background-color: #16213e; border-radius: 8px; padding: 15px; }}")
            card_layout = QVBoxLayout(card)
            
            title_label = QLabel(title)
            title_label.setStyleSheet("font-size: 12px; color: #888888;")
            card_layout.addWidget(title_label)
            
            value_label = QLabel(value)
            value_label.setStyleSheet(f"font-size: 24px; font-weight: bold; color: {color};")
            card_layout.addWidget(value_label)
            
            stats_layout.addWidget(card)
        
        layout.addLayout(stats_layout)
        layout.addStretch()
        
        return widget
    
    def _create_menus(self):
        menubar = self.menuBar()
        
        file_menu = menubar.addMenu("File")
        
        exit_action = QAction("Exit", self)
        exit_action.setShortcut("Alt+F4")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        help_menu = menubar.addMenu("Help")
        
        about_action = QAction("About TrajectIQ", self)
        about_action.triggered.connect(self._show_about)
        help_menu.addAction(about_action)
    
    def _update_status(self):
        self.status_bar.showMessage("Ready - TrajectIQ Enterprise v1.0.8")
    
    def _on_format_changed(self, index):
        """Update placeholder text based on format selection"""
        format_type = self.req_format.currentText()
        if format_type == "Plain Text":
            self.requirements_input.setPlaceholderText(
                "Paste the job description here.\n\n"
                "Example:\n"
                "\"We are looking for a Senior Python Developer with 5+ years of experience. "
                "Required skills: Python, Django, AWS, PostgreSQL, Docker. "
                "Experience with React is a plus.\""
            )
        elif format_type == "JSON":
            self.requirements_input.setPlaceholderText(
                '[\n  {\n    "name": "Python",\n    "classification": "mission_critical",\n    "minimum_years": 5,\n    "is_critical": true\n  },\n  {\n    "name": "AWS",\n    "classification": "core",\n    "minimum_years": 3\n  }\n]'
            )
        else:  # Auto-detect
            self.requirements_input.setPlaceholderText(
                "Paste your job requirements or job description here.\n\n"
                "Examples:\n"
                "• Plain text: \"Looking for Python developer with 5+ years experience, AWS, React...\"\n"
                "• JSON: [{\"name\": \"Python\", \"classification\": \"mission_critical\", \"minimum_years\": 5}]\n\n"
                "The app will automatically extract skills from plain text."
            )
    
    def _parse_requirements(self, text: str) -> list:
        """Parse job requirements from text or JSON"""
        text = text.strip()
        if not text:
            return []
        
        format_type = self.req_format.currentText()
        
        # Try JSON first if format is JSON or Auto-detect
        if format_type in ["JSON", "Auto-detect"]:
            if text.startswith('[') or text.startswith('{'):
                try:
                    import json
                    reqs = json.loads(text)
                    if isinstance(reqs, dict):
                        reqs = [reqs]
                    return reqs
                except:
                    pass
        
        # Parse as plain text
        if format_type in ["Plain Text", "Auto-detect"]:
            return self._extract_skills_from_text(text)
        
        return []
    
    def _extract_skills_from_text(self, text: str) -> list:
        """Extract skills from plain text job description"""
        
        # Common technical skills to look for
        tech_skills = [
            # Programming languages
            "python", "java", "javascript", "typescript", "c++", "c#", "go", "golang", "rust",
            "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "perl", "lua",
            # Frontend
            "react", "angular", "vue", "vue.js", "html", "css", "sass", "less", "tailwind",
            "next.js", "nextjs", "svelte", "jquery",
            # Backend
            "node.js", "nodejs", "django", "flask", "fastapi", "spring", "spring boot",
            "express", "express.js", "rails", "ruby on rails", "graphql", "rest", "rest api",
            # Database
            "sql", "mysql", "postgresql", "postgres", "mongodb", "mongo", "redis",
            "elasticsearch", "dynamodb", "cassandra", "oracle", "sqlite", "mariadb",
            # Cloud
            "aws", "amazon web services", "azure", "gcp", "google cloud", "heroku",
            "digitalocean", "cloudflare", "firebase",
            # DevOps
            "docker", "kubernetes", "k8s", "jenkins", "git", "ci/cd", "cicd", "terraform",
            "ansible", "puppet", "chef", "prometheus", "grafana", "nginx", "apache",
            # Data Science/ML
            "machine learning", "ml", "deep learning", "tensorflow", "pytorch", "keras",
            "pandas", "numpy", "scikit-learn", "sklearn", "spark", "hadoop", "kafka",
            "data science", "nlp", "computer vision",
            # Mobile
            "android", "ios", "react native", "flutter", "xamarin", "mobile development",
            # Other common
            "api", "microservices", "agile", "scrum", "linux", "unix", "bash", "shell",
            "security", "testing", "unit testing", "tdd", "devops", "sre"
        ]
        
        text_lower = text.lower()
        requirements = []
        found_skills = set()
        
        # Extract years of experience patterns
        import re
        years_patterns = [
            (r'(\d+)\+?\s*years?\s*(?:of\s+)?experience', 'general'),
            (r'(\d+)\+?\s*years?\s*(?:in\s+)?(?:programming|coding|development)', 'general'),
        ]
        
        min_years = 0
        for pattern, _ in years_patterns:
            match = re.search(pattern, text_lower)
            if match:
                min_years = max(min_years, int(match.group(1)))
        
        # Find skills mentioned in text
        for skill in tech_skills:
            if skill in text_lower and skill not in found_skills:
                found_skills.add(skill)
                
                # Determine classification based on keywords
                classification = "core"
                if any(kw in text_lower for kw in ["required", "must have", "mandatory", "essential"]):
                    # Check if this skill is near these keywords
                    skill_pos = text_lower.find(skill)
                    for kw in ["required", "must have", "mandatory", "essential"]:
                        kw_pos = text_lower.find(kw)
                        if kw_pos != -1 and abs(skill_pos - kw_pos) < 200:
                            classification = "mission_critical"
                            break
                elif any(kw in text_lower for kw in ["nice to have", "preferred", "plus", "bonus", "optional"]):
                    skill_pos = text_lower.find(skill)
                    for kw in ["nice to have", "preferred", "plus", "bonus", "optional"]:
                        kw_pos = text_lower.find(kw)
                        if kw_pos != -1 and abs(skill_pos - kw_pos) < 200:
                            classification = "optional"
                            break
                
                # Check for years requirement for this specific skill
                skill_years_pattern = rf'(\d+)\+?\s*years?\s*(?:of\s+)?(?:experience\s+(?:with|in|using)\s+)?' + re.escape(skill)
                match = re.search(skill_years_pattern, text_lower)
                skill_min_years = int(match.group(1)) if match else min_years
                
                requirements.append({
                    "name": skill.title(),
                    "classification": classification,
                    "minimum_years": skill_min_years,
                    "is_critical": classification == "mission_critical"
                })
        
        # If no skills found, create a general requirement
        if not requirements:
            requirements.append({
                "name": "General Experience",
                "classification": "core",
                "minimum_years": min_years,
                "is_critical": False
            })
        
        return requirements
    
    def _run_evaluation(self):
        resume_text = self.resume_input.toPlainText().strip()
        requirements_text = self.requirements_input.toPlainText().strip()
        
        if not resume_text:
            QMessageBox.warning(self, "Error", "Please enter resume content")
            return
        
        # Parse requirements (supports both plain text and JSON)
        job_requirements = self._parse_requirements(requirements_text)
        
        self.run_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)
        self.status_bar.showMessage(f"Found {len(job_requirements)} skills in job requirements...")
        
        self.worker = EvaluationWorker(resume_text, job_requirements, {})
        self.worker.progress.connect(lambda msg: self.status_bar.showMessage(msg))
        self.worker.finished.connect(self._on_evaluation_finished)
        self.worker.error.connect(self._on_evaluation_error)
        self.worker.start()
    
    def _on_evaluation_finished(self, result: dict):
        self.run_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        
        try:
            final = result.get("final_scoring", {}).get("hiring_index", {})
            
            # Safely extract values with defaults
            overall_score = final.get('overall_score', 0) if final else 0
            grade = final.get('grade', 'N/A') if final else 'N/A'
            tier = result.get("final_scoring", {}).get("tier", "N/A")
            recommendation = final.get('recommendation', 'N/A') if final else 'N/A'
            
            output = f"""
╔══════════════════════════════════════════════════════════════╗
║                 EVALUATION COMPLETE                          ║
╠══════════════════════════════════════════════════════════════╣
║  HIRING INDEX: {overall_score:>3}/100
║  GRADE: {grade}
║  TIER: {tier}
║  RECOMMENDATION: {recommendation}
╚══════════════════════════════════════════════════════════════╝
"""
            
            self.results_output.setText(output)
            self.status_bar.showMessage("Evaluation complete")
        except Exception as e:
            self.results_output.setText(f"Error displaying results: {str(e)}")
            self.status_bar.showMessage("Evaluation completed with display error")
    
    def _on_evaluation_error(self, error: str):
        self.run_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        QMessageBox.critical(self, "Error", f"Evaluation failed: {error}")
        self.status_bar.showMessage("Evaluation failed")
    
    def _show_about(self):
        QMessageBox.about(
            self,
            "About TrajectIQ Enterprise",
            """<h2>TrajectIQ Enterprise</h2>
            <p>Version 1.0.3</p>
            <p><b>Intelligence-Driven Hiring Platform</b></p>
            <p>Deterministic • Explainable • Auditable</p>
            <hr>
            <p>© 2024 TrajectIQ. All rights reserved.</p>"""
        )


def run_application():
    """Run the TrajectIQ desktop application"""
    
    # High DPI support
    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)
    
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    
    # Check license first
    from security.license import get_license_manager, LicenseStatus
    
    lm = get_license_manager()
    status, info = lm.validate_license()
    
    if status != LicenseStatus.VALID:
        # Show activation dialog
        dialog = ActivationDialog()
        if dialog.exec_() != QDialog.Accepted:
            sys.exit(0)
    
    # Skip login for demo mode - go directly to main window
    # Show main window
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec_())


if __name__ == "__main__":
    run_application()
