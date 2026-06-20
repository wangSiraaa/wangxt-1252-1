from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ShowViewSet, SeatViewSet, EquipmentInspectionViewSet,
    OrderViewSet, RefundViewSet
)

router = DefaultRouter()
router.register(r'shows', ShowViewSet, basename='show')
router.register(r'seats', SeatViewSet, basename='seat')
router.register(r'inspections', EquipmentInspectionViewSet, basename='inspection')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'refunds', RefundViewSet, basename='refund')

urlpatterns = [
    path('', include(router.urls)),
]
