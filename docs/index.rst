TrajectIQ Enterprise API Documentation
======================================

Welcome to the TrajectIQ Enterprise API documentation. This guide covers all public APIs for integrating with and extending TrajectIQ.

.. toctree::
   :maxdepth: 2
   :caption: Contents:

   modules/scoring_engine
   modules/bias_detection
   security/license
   security/rbac
   connectors/email_connector
   connectors/ats_connector
   core/database
   core/analytics

Quick Start
-----------

Installation
~~~~~~~~~~~~

.. code-block:: bash

    pip install trajectiq

Basic Usage
~~~~~~~~~~~

.. code-block:: python

    from trajectiq import run_full_evaluation

    # Evaluate a resume against a job description
    result = run_full_evaluation(
        resume_data={
            "skills": ["Python", "Django", "AWS"],
            "experience_years": 5,
            "education_level": "Bachelor"
        },
        job_description={
            "required_skills": ["Python", "AWS"],
            "min_experience_years": 3
        }
    )

    print(f"Overall Score: {result['overall_score']}")
    print(f"SDI: {result['sdi']}")
    print(f"CSIG: {result['csig']}")

API Reference
-------------

Scoring Engine
~~~~~~~~~~~~~~

.. automodule:: modules.scoring_engine
   :members:
   :undoc-members:
   :show-inheritance:

Bias Detection
~~~~~~~~~~~~~~

.. automodule:: modules.bias_detection
   :members:
   :undoc-members:
   :show-inheritance:

License Management
~~~~~~~~~~~~~~~~~~

.. automodule:: security.license
   :members:
   :undoc-members:
   :show-inheritance:

Role-Based Access Control
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. automodule:: security.rbac
   :members:
   :undoc-members:
   :show-inheritance:

Connectors
~~~~~~~~~~

Email Connector
^^^^^^^^^^^^^^^

.. automodule:: connectors.email_connector
   :members:
   :undoc-members:
   :show-inheritance:

ATS Connector
^^^^^^^^^^^^^

.. automodule:: connectors.ats_connector
   :members:
   :undoc-members:
   :show-inheritance:

Core Modules
~~~~~~~~~~~~

Database
^^^^^^^^

.. automodule:: core.database
   :members:
   :undoc-members:
   :show-inheritance:

Analytics
^^^^^^^^^

.. automodule:: core.analytics
   :members:
   :undoc-members:
   :show-inheritance:

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
