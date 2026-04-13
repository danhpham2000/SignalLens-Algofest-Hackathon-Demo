from fastapi import APIRouter, File, HTTPException, UploadFile, status

from core.config import get_settings
from models.schemas import UploadResponse
from services.storage_service import storage_service
from utils.file_utils import detect_file_type, save_upload_file, validate_upload


router = APIRouter(tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A file name is required.")

    settings = get_settings()
    validate_upload(file.filename)
    saved_path, file_size = await save_upload_file(file, settings.upload_dir)

    if file_size > settings.max_upload_mb * 1024 * 1024:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds the configured upload limit.",
        )

    document = storage_service.create_document(
        file_name=file.filename,
        file_type=detect_file_type(file.filename),
        storage_path=str(saved_path),
        file_size=file_size,
    )
    document.metadata["content_type"] = file.content_type
    storage_service.update_document(document)
    return UploadResponse(document=document)
