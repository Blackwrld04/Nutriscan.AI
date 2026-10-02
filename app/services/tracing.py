from contextlib import contextmanager
import logging
import time
from typing import Any, Dict, Optional

import sentry_sdk
from app.config import settings

logger = logging.getLogger(__name__)


def init_tracing():
    if settings.SENTRY_DSN and len(settings.SENTRY_DSN.strip()) > 5:
        try:
            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
                send_default_pii=True,
                enable_logs=True,
                environment=settings.ENVIRONMENT,
                release="opencal-ai@1.0.0",
            )
            logger.info("Sentry Agent Tracing initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Sentry: {e}")
    else:
        logger.info("Sentry DSN not provided. Tracing telemetry running in local logger mode.")


@contextmanager
def trace_span(op: str, description: str, data: Optional[Dict[str, Any]] = None):
    """Context manager for instrumenting AI agent execution spans with Sentry."""
    start_time = time.time()
    span = None

    try:
        if sentry_sdk.is_initialized():
            span = sentry_sdk.start_span(op=op, name=description)
            if data:
                for k, v in data.items():
                    span.set_data(k, v)
            span.__enter__()
    except Exception:
        pass

    try:
        yield span
    finally:
        elapsed = (time.time() - start_time) * 1000
        logger.debug(f"[Sentry Span] {op} - {description}: {elapsed:.2f}ms")
        if span:
            try:
                span.set_data("duration_ms", elapsed)
                span.__exit__(None, None, None)
            except Exception:
                pass
