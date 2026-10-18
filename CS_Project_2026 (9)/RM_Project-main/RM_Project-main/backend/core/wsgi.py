"""
WSGI config for core project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import logging
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

application = get_wsgi_application()

# -- Eager-load the recommendation model in the master process ---------------
# With gunicorn --preload, this module is imported once in the master process
# BEFORE fork(). Loading RecommenderService here ensures the PyTorch model
# (~89 MB) and graph data (~90 MB) live in master memory; child workers
# inherit them via copy-on-write, avoiding each worker loading its own copy
# (which would multiply memory by the number of workers and cause OOM).
#
# If loading fails (e.g. no trained model yet), we log a warning and let
# requests trigger lazy-load as before — the app still starts normally.
# ---------------------------------------------------------------------------
_logger = logging.getLogger('core.wsgi')

try:
    from rentals.recommender import RecommenderService
    RecommenderService()
    _logger.info("RecommenderService preloaded in master process (startup)")
except Exception as exc:
    _logger.warning(
        "Could not preload RecommenderService at startup (%s). "
        "The model will be loaded lazily on the first request.",
        exc,
    )
finally:
    # CRITICAL: the eager init above reads ModelConfig from Postgres, leaving
    # an open connection in the master. With --preload every forked worker
    # would inherit that same socket and share it -> "SSL connection has been
    # closed unexpectedly" / protocol corruption. Close before gunicorn forks.
    from django.db import connections
    connections.close_all()
