# backend/apps/jobs/utils.py
import math
from datetime import datetime
from typing import Optional, Tuple

from django.utils import timezone


def distance_m(lat1, lon1, lat2, lon2):
    """
    Возвращает расстояние в метрах между двумя точками (lat, lon)
    с использованием формулы хаверсинуса.
    """
    R = 6371000  # радиус Земли в метрах

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)

    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# --- Photos / EXIF helpers ---

def extract_exif_data(uploaded_file) -> tuple[Optional[float], Optional[float], Optional[datetime], bool]:
    """
    Пытается извлечь из картинки:
      - GPS latitude/longitude
      - timestamp (DateTimeOriginal / DateTime)

    Возвращает:
      (lat, lon, photo_dt, exif_missing)

    MVP-логика:
      - если EXIF нет/не распарсился => (None, None, None, True)
      - если частично есть => exif_missing=False, но поля могут быть None
    """
    try:
        from PIL import Image, ExifTags  # type: ignore
    except Exception:
        # Pillow не установлен
        return None, None, None, True

    try:
        # Pillow читает файл, но UploadedFile может быть уже прочитан выше.
        # Поэтому аккуратно: перематываем в начало.
        try:
            uploaded_file.seek(0)
        except Exception:
            pass

        img = Image.open(uploaded_file)
        exif_raw = getattr(img, "_getexif", None)
        if not exif_raw:
            return None, None, None, True

        exif = img._getexif() or {}
        if not exif:
            return None, None, None, True

        # map tag ids -> names
        tag_map = {}
        for k, v in exif.items():
            name = ExifTags.TAGS.get(k, k)
            tag_map[name] = v

        # timestamp
        photo_dt = _parse_exif_datetime(tag_map.get("DateTimeOriginal") or tag_map.get("DateTime"))

        # gps
        gps_info = tag_map.get("GPSInfo")
        lat, lon = _parse_gps_info(gps_info)

        exif_missing = False
        return lat, lon, photo_dt, exif_missing

    except Exception:
        # Любая ошибка чтения EXIF = считаем, что EXIF отсутствует
        return None, None, None, True


def _parse_exif_datetime(value) -> Optional[datetime]:
    """
    EXIF datetime обычно строка: 'YYYY:MM:DD HH:MM:SS'
    Возвращаем timezone-aware datetime в текущей TZ проекта.
    """
    if not value:
        return None

    if isinstance(value, bytes):
        try:
            value = value.decode("utf-8", errors="ignore")
        except Exception:
            return None

    if not isinstance(value, str):
        return None

    value = value.strip()
    if not value:
        return None

    # EXIF format
    try:
        dt = datetime.strptime(value, "%Y:%m:%d %H:%M:%S")
        # делаем aware (в TZ проекта)
        return timezone.make_aware(dt, timezone.get_current_timezone())
    except Exception:
        return None


def _parse_gps_info(gps_info) -> tuple[Optional[float], Optional[float]]:
    """
    GPSInfo может быть dict с ключами как int-теги.
    Пример: {1:'N',2:((25,1),(12,1),(1234,100)),3:'E',4:...}
    """
    if not gps_info:
        return None, None

    # gps keys mapping
    try:
        from PIL import ExifTags  # type: ignore
        gps_tag_map = {}
        for k, v in gps_info.items():
            name = ExifTags.GPSTAGS.get(k, k)
            gps_tag_map[name] = v
    except Exception:
        return None, None

    lat = _gps_to_decimal(gps_tag_map.get("GPSLatitude"), gps_tag_map.get("GPSLatitudeRef"))
    lon = _gps_to_decimal(gps_tag_map.get("GPSLongitude"), gps_tag_map.get("GPSLongitudeRef"))

    return lat, lon


def _gps_to_decimal(coord, ref) -> Optional[float]:
    """
    coord обычно вида ((deg_num,deg_den),(min_num,min_den),(sec_num,sec_den))
    ref: 'N'/'S'/'E'/'W'
    """
    if not coord or not ref:
        return None

    try:
        deg = _ratio_to_float(coord[0])
        minutes = _ratio_to_float(coord[1])
        seconds = _ratio_to_float(coord[2])

        dec = deg + (minutes / 60.0) + (seconds / 3600.0)
        if ref in ["S", "W"]:
            dec = -dec
        return float(dec)
    except Exception:
        return None


def _ratio_to_float(r) -> float:
    """
    r может быть tuple (num, den) или объект типа IFDRational.
    """
    try:
        # IFDRational ведёт себя как число
        return float(r)
    except Exception:
        pass

    num, den = r
    return float(num) / float(den)
