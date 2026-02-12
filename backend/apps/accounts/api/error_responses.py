# apps/accounts/api/error_responses.py
"""
Standardized error response formats for Settings API v1.1
"""
from rest_framework.response import Response
from rest_framework import status


def validation_error(fields: dict) -> Response:
    """
    400 Validation Error

    Args:
        fields: Dict mapping field names to error messages

    Returns:
        Response with standardized validation error format
    """
    return Response(
        {
            "code": "VALIDATION_ERROR",
            "message": "Validation failed",
            "fields": fields
        },
        status=status.HTTP_400_BAD_REQUEST
    )


def unauthenticated_error() -> Response:
    """
    401 Unauthenticated Error

    Returns:
        Response with standardized authentication error format
    """
    return Response(
        {
            "code": "UNAUTHENTICATED",
            "message": "Authentication required"
        },
        status=status.HTTP_401_UNAUTHORIZED
    )


def forbidden_error(message: str = "Access denied") -> Response:
    """
    403 Forbidden Error

    Args:
        message: Custom error message (default: "Access denied")

    Returns:
        Response with standardized forbidden error format
    """
    return Response(
        {
            "code": "FORBIDDEN",
            "message": message
        },
        status=status.HTTP_403_FORBIDDEN
    )


def not_implemented_error(message: str = "This feature is not available yet") -> Response:
    """
    501 Not Implemented Error

    Args:
        message: Custom error message

    Returns:
        Response with standardized not implemented error format
    """
    return Response(
        {
            "code": "NOT_IMPLEMENTED",
            "message": message
        },
        status=status.HTTP_501_NOT_IMPLEMENTED
    )
