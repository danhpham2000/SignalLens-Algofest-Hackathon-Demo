from pathlib import Path
from typing import Tuple
import base64
import re
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from core.constants import ALLOWED_EXTENSIONS


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def normalize_filename(file_name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(file_name).name)
    return cleaned or "upload"


def get_extension(file_name: str) -> str:
    return Path(file_name).suffix.lower().lstrip(".")


def detect_file_type(file_name: str) -> str:
    extension = get_extension(file_name)
    if extension == "pdf":
        return "pdf"
    return "image"


def validate_upload(file_name: str) -> None:
    extension = get_extension(file_name)
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Use PDF, PNG, JPG, JPEG, or WEBP.",
        )


async def save_upload_file(upload_file: UploadFile, destination_dir: Path) -> Tuple[Path, int]:
    ensure_directory(destination_dir)
    normalized_name = normalize_filename(upload_file.filename or "upload")
    target_path = destination_dir / "{prefix}-{name}".format(prefix=uuid4().hex, name=normalized_name)

    size = 0
    with target_path.open("wb") as output_file:
        while True:
            chunk = await upload_file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            output_file.write(chunk)

    await upload_file.close()
    return target_path, size


def file_to_base64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("utf-8")
