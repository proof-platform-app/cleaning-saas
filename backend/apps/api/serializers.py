from rest_framework import serializers


class JobCheckInSerializer(serializers.Serializer):
    """
    Сериализатор для check-in клинера.
    Принимаем только координаты.
    """
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
