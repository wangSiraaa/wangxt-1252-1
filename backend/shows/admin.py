from django.contrib import admin
from .models import Show, Seat, EquipmentInspection, Order, OrderItem, Refund


@admin.register(Show)
class ShowAdmin(admin.ModelAdmin):
    list_display = ['title', 'venue', 'show_time', 'status', 'total_capacity', 'ticket_price']
    list_filter = ['status']
    search_fields = ['title', 'venue']


@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ['show', 'seat_number', 'seat_zone', 'status', 'price']
    list_filter = ['status', 'seat_zone']
    search_fields = ['seat_number']


@admin.register(EquipmentInspection)
class EquipmentInspectionAdmin(admin.ModelAdmin):
    list_display = ['show', 'inspection_type', 'status', 'inspector', 'inspection_time']
    list_filter = ['inspection_type', 'status']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_no', 'show', 'customer_name', 'customer_phone', 'total_amount', 'status']
    list_filter = ['status']
    search_fields = ['order_no', 'customer_name', 'customer_phone']


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'seat', 'price']


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ['refund_no', 'order', 'refund_amount', 'status', 'is_postponed_refund', 'created_at']
    list_filter = ['status', 'is_postponed_refund']
    search_fields = ['refund_no']
