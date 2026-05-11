from contextlib import contextmanager
from typing import Iterator

from fastapi import HTTPException


def api_error_response(
    *,
    status_code: int,
    message: str,
    code: str,
    detail: object | None = None,
) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "status": status_code,
        },
        "detail": detail if detail is not None else message,
    }


@contextmanager
def translate_errors(
    *,
    status_code: int = 500,
    code: str = "upstream_error",
    message: str = "Request failed",
) -> Iterator[None]:
    try:
        yield
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status_code,
            detail={
                "code": code,
                "message": str(exc) or message,
            },
        )
