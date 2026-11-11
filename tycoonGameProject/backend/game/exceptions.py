from rest_framework import status
from rest_framework.exceptions import APIException


class InsufficientFunds(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Not enough credits"
    default_code = "insufficient_credits"