# TrajectIQ API Documentation Configuration

project = 'TrajectIQ'
copyright = '2025, TrajectIQ Team'
author = 'TrajectIQ Team'
release = '3.0.2'
version = '3.0.2'

# Extensions
extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.autosummary',
    'sphinx.ext.napoleon',
    'sphinx.ext.viewcode',
    'sphinx.ext.intersphinx',
    'sphinx_autodoc_typehints',
    'myst_parser',
]

# Napoleon settings for Google/NumPy style docstrings
napoleon_google_docstring = True
napoleon_numpy_docstring = True
napoleon_include_init_with_doc = True
napoleon_include_private_with_doc = False

# Theme
html_theme = 'sphinx_rtd_theme'
html_theme_options = {
    'navigation_depth': 4,
    'collapse_navigation': False,
    'titles_only': False,
}

# Paths
templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

# Source files
source_suffix = {
    '.rst': 'restructuredtext',
    '.md': 'markdown',
}

# Master document
master_doc = 'index'

# HTML output
html_static_path = ['_static']
html_logo = '../assets/icon.png'
html_favicon = '../assets/icon.png'

# Intersphinx
intersphinx_mapping = {
    'python': ('https://docs.python.org/3', None),
    'PyQt5': ('https://www.riverbankcomputing.com/static/Docs/PyQt5/', None),
}
