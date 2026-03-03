# Contributing to TrajectIQ

Thank you for your interest in contributing to TrajectIQ! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher (for dashboard)
- Ollama (for LLM features)
- Git

### Development Setup

1. **Fork and Clone the Repository**
   ```bash
   git clone https://github.com/your-username/TrajectIQ.git
   cd TrajectIQ
   ```

2. **Set Up Python Environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # Development dependencies
   ```

3. **Set Up Frontend (Optional)**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start Ollama**
   ```bash
   ollama serve &
   ollama pull llama3.2
   ```

## Development Guidelines

### Code Style

- Follow PEP 8 for Python code
- Use type hints for function parameters and return types
- Write docstrings for all public functions and classes
- Keep functions focused and under 50 lines when possible
- Use meaningful variable names

### Example Code Style

```python
from typing import Dict, Any, Optional

def evaluate_candidate(
    resume_path: str,
    job_requirements: Dict[str, Any],
    candidate_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluate a candidate's resume against job requirements.
    
    Args:
        resume_path: Path to the resume file (PDF or DOCX)
        job_requirements: Dictionary containing job requirements
        candidate_id: Optional unique identifier for the candidate
        
    Returns:
        Dictionary containing evaluation results
        
    Raises:
        FileNotFoundError: If resume file does not exist
        ValueError: If job_requirements is missing required fields
    """
    # Implementation here
    pass
```

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)
footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

Example:
```
feat(scoring): add weighted factor scoring

Implement multi-factor scoring with configurable weights.
Closes #42
```

### Branch Naming

- `feature/description`: New features
- `fix/description`: Bug fixes
- `docs/description`: Documentation updates
- `refactor/description`: Code refactoring

## Testing

### Running Tests

```bash
# Run all tests
pytest backend/tests/

# Run with coverage
pytest --cov=backend backend/tests/

# Run specific test file
pytest backend/tests/test_skill_evaluator.py
```

### Writing Tests

- Write unit tests for all new functionality
- Use descriptive test names
- Include edge cases and error conditions
- Maintain at least 80% code coverage

Example test:
```python
import pytest
from modules.skill_evaluator import SkillEvaluator

def test_skill_evaluator_exact_match():
    """Test skill evaluation with exact skill match."""
    evaluator = SkillEvaluator()
    
    result = evaluator.execute({
        "candidate_id": "TEST-001",
        "candidate_skills": {
            "technical": [{"name": "Python", "proficiency": "expert", "years_experience": 8}]
        },
        "job_requirements": {
            "required_skills": [{"name": "Python", "minimum_years": 5, "minimum_proficiency": "advanced"}]
        }
    })
    
    assert result["skill_matches"][0]["match_status"] == "exact_match"
    assert result["skill_matches"][0]["match_score"] >= 0.8
```

## Adding New Modules

1. Create module file in `backend/modules/`
2. Extend `BaseModule` class
3. Register with `@ModuleRegistry.register` decorator
4. Create corresponding schema in `backend/schemas/`
5. Add tests in `backend/tests/`
6. Update documentation

## Documentation

- Update README.md for user-facing changes
- Add docstrings to all new functions and classes
- Update API documentation for endpoint changes
- Add examples for new features

## Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make Your Changes**
   - Follow code style guidelines
   - Add tests for new functionality
   - Update documentation

3. **Run Tests and Linting**
   ```bash
   pytest backend/tests/
   flake8 backend/
   black --check backend/
   mypy backend/
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature
   ```
   Then create a Pull Request on GitHub

6. **PR Checklist**
   - [ ] Tests pass
   - [ ] Code is linted
   - [ ] Documentation is updated
   - [ ] PR description explains changes
   - [ ] Linked to relevant issues

## Module Development

### Creating a New Evaluation Module

```python
from core.base_module import BaseModule, ModuleRegistry

@ModuleRegistry.register
class MyNewModule(BaseModule):
    """Description of what this module does."""
    
    module_name = "my_new_module"
    version = "1.0.0"
    
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """Validate input against schema."""
        # Implementation
        return True
    
    def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process input and return results."""
        # Implementation
        return {}
```

### Adding New Connectors

```python
from connectors.base_connector import BaseConnector

class MyATSConnector(BaseConnector):
    """Connector for MyATS system."""
    
    def __init__(self, api_key: str):
        super().__init__(api_key, "https://api.myats.com")
    
    def get_candidates(self) -> List[Dict[str, Any]]:
        """Fetch candidates from MyATS."""
        # Implementation
        pass
```

## Questions and Support

- Open a GitHub Issue for bugs or feature requests
- Join discussions in GitHub Discussions
- Contact maintainers for security issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to TrajectIQ!
