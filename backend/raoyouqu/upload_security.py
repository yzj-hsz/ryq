from __future__ import annotations

import io
import mimetypes
import os
import uuid
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename


IMAGE_EXTENSIONS = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

VIDEO_EXTENSIONS = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
}

PILLOW_FORMAT_EXTENSIONS = {
    "jpeg": {".jpg", ".jpeg"},
    "png": {".png"},
    "gif": {".gif"},
    "webp": {".webp"},
}


class UploadValidationError(Exception):
    def __init__(self, error: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.error = error
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class UploadPolicy:
    allow_images: bool
    allow_videos: bool
    max_image_bytes: int
    max_video_bytes: int


USER_UPLOAD_POLICY = UploadPolicy(
    allow_images=True,
    allow_videos=False,
    max_image_bytes=10 * 1024 * 1024,
    max_video_bytes=0,
)

ADMIN_UPLOAD_POLICY = UploadPolicy(
    allow_images=True,
    allow_videos=True,
    max_image_bytes=20 * 1024 * 1024,
    max_video_bytes=100 * 1024 * 1024,
)


def _stream_size(file: FileStorage) -> int:
    stream = file.stream
    current_pos = stream.tell()
    stream.seek(0, os.SEEK_END)
    size = stream.tell()
    stream.seek(current_pos)
    return size


def _detect_kind(extension: str, policy: UploadPolicy) -> str:
    if extension in IMAGE_EXTENSIONS and policy.allow_images:
        return "image"
    if extension in VIDEO_EXTENSIONS and policy.allow_videos:
        return "video"
    raise UploadValidationError("unsupported_file_type", "不支持的文件类型")


def _validate_image_content(data: bytes, extension: str) -> str:
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
        with Image.open(io.BytesIO(data)) as img:
            image_format = (img.format or "").lower()
    except (UnidentifiedImageError, OSError) as exc:
        raise UploadValidationError("invalid_file_content", "文件内容不是有效图片") from exc

    allowed_extensions = PILLOW_FORMAT_EXTENSIONS.get(image_format)
    if not allowed_extensions or extension not in allowed_extensions:
        raise UploadValidationError("mime_extension_mismatch", "图片格式与文件后缀不一致")
    return IMAGE_EXTENSIONS[extension]


def _looks_like_mp4_or_mov(data: bytes) -> bool:
    return len(data) >= 12 and data[4:8] == b"ftyp"


def _looks_like_webm(data: bytes) -> bool:
    return len(data) >= 4 and data[:4] == b"\x1a\x45\xdf\xa3" and b"webm" in data[:64].lower()


def _validate_video_content(data: bytes, extension: str) -> str:
    if extension in {".mp4", ".mov"} and _looks_like_mp4_or_mov(data):
        return VIDEO_EXTENSIONS[extension]
    if extension == ".webm" and _looks_like_webm(data):
        return VIDEO_EXTENSIONS[extension]
    raise UploadValidationError("invalid_file_content", "文件内容不是有效视频")


def store_validated_upload(file: FileStorage, upload_dir: Path, policy: UploadPolicy) -> dict:
    filename = secure_filename(file.filename or "")
    if not filename:
        raise UploadValidationError("empty_filename", "文件名不能为空")

    extension = Path(filename).suffix.lower()
    kind = _detect_kind(extension, policy)
    size = _stream_size(file)
    max_bytes = policy.max_image_bytes if kind == "image" else policy.max_video_bytes
    if size <= 0:
        raise UploadValidationError("empty_file", "文件内容不能为空")
    if size > max_bytes:
        raise UploadValidationError("file_too_large", f"文件大小超过限制 ({max_bytes // 1024 // 1024}MB)")

    file.stream.seek(0)
    data = file.read()
    file.stream.seek(0)
    if not data:
        raise UploadValidationError("empty_file", "文件内容不能为空")

    declared_mime = (file.mimetype or mimetypes.guess_type(filename)[0] or "").lower()
    if kind == "image" and declared_mime and not declared_mime.startswith("image/"):
        raise UploadValidationError("mime_type_invalid", "仅支持图片文件上传")
    if kind == "video" and declared_mime and not declared_mime.startswith("video/"):
        raise UploadValidationError("mime_type_invalid", "仅支持视频文件上传")

    validated_mime = (
        _validate_image_content(data, extension)
        if kind == "image"
        else _validate_video_content(data, extension)
    )

    upload_dir.mkdir(parents=True, exist_ok=True)
    unique_filename = f"{uuid.uuid4().hex}{extension}"
    upload_path = upload_dir / unique_filename
    upload_path.write_bytes(data)

    return {
        "url": f"/static/uploads/{unique_filename}",
        "filename": unique_filename,
        "file_type": kind,
        "mime_type": validated_mime,
        "size_bytes": len(data),
    }
