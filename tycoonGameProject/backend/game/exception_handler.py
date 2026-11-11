import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:  # not a DRF/Http404/PermissionDenied error
        logger.error("Unhandled API error", exc_info=exc)
        return Response({"detail": "Internal server error."}, status=500)
    return response