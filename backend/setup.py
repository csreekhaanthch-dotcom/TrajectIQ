"""
TrajectIQ - Intelligence-Driven Hiring Platform
Setup configuration for Python package.
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read README
this_directory = Path(__file__).parent.parent
long_description = (this_directory / "README.md").read_text(encoding="utf-8")

# Read requirements
requirements_path = Path(__file__).parent / "requirements.txt"
requirements = [
    line.strip()
    for line in requirements_path.read_text().split("\n")
    if line.strip() and not line.startswith("#") and not line.startswith("-")
]

setup(
    name="trajectiq",
    version="1.0.0",
    author="TrajectIQ Team",
    author_email="team@trajectiq.io",
    description="Intelligence-Driven Hiring Platform",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/csreekhaanthch-dotcom/TrajectIQ",
    project_urls={
        "Bug Tracker": "https://github.com/csreekhaanthch-dotcom/TrajectIQ/issues",
        "Documentation": "https://github.com/csreekhaanthch-dotcom/TrajectIQ#readme",
        "Source Code": "https://github.com/csreekhaanthch-dotcom/TrajectIQ",
    },
    packages=find_packages(exclude=["tests", "tests.*"]),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: Information Technology",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Office/Business :: Hiring",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Typing :: Typed",
    ],
    python_requires=">=3.9",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.0.0",
            "pre-commit>=3.0.0",
        ],
        "api": [
            "fastapi>=0.100.0",
            "uvicorn>=0.22.0",
            "python-multipart>=0.0.6",
        ],
        "email": [
            "google-auth>=2.20.0",
            "google-auth-oauthlib>=1.0.0",
            "google-auth-httplib2>=0.1.0",
            "google-api-python-client>=2.90.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "trajectiq=main:main",
        ],
    },
    include_package_data=True,
    package_data={
        "": ["*.json", "*.yaml", "*.yml"],
    },
    zip_safe=False,
)
