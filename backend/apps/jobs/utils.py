import math


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
