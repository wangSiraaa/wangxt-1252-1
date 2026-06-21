from rest_framework import serializers
from django.utils import timezone
from .models import (
    Show, Seat, EquipmentInspection, Order, OrderItem, Refund,
    ShowStatus, SeatStatus, InspectionType, InspectionStatus, OrderStatus, RefundStatus
)


class InspectionSummaryItemSerializer(serializers.Serializer):
    status = serializers.CharField(allow_null=True)
    remark = serializers.CharField()
    issues_found = serializers.CharField()
    inspection_time = serializers.DateTimeField(allow_null=True)
    inspector_name = serializers.CharField()


class ShowListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    sold_seats_count = serializers.IntegerField(read_only=True)
    available_seats_count = serializers.IntegerField(read_only=True)
    is_fire_inspection_passed = serializers.BooleanField(read_only=True)
    has_all_inspections_passed = serializers.BooleanField(read_only=True)
    inspection_summary = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Show
        fields = [
            'id', 'title', 'venue', 'total_capacity', 'show_time', 'status',
            'status_display', 'ticket_price', 'sold_seats_count', 'available_seats_count',
            'is_fire_inspection_passed', 'has_all_inspections_passed', 'inspection_summary',
            'created_by', 'created_by_name', 'created_at'
        ]

    def get_inspection_summary(self, obj):
        return obj.inspection_summary


class ShowDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    sold_seats_count = serializers.IntegerField(read_only=True)
    available_seats_count = serializers.IntegerField(read_only=True)
    is_fire_inspection_passed = serializers.BooleanField(read_only=True)
    has_all_inspections_passed = serializers.BooleanField(read_only=True)
    inspection_summary = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Show
        fields = '__all__'
        read_only_fields = ['created_by', 'status', 'created_at', 'updated_at']

    def get_inspection_summary(self, obj):
        return obj.inspection_summary

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class SeatSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    show_title = serializers.CharField(source='show.title', read_only=True)

    class Meta:
        model = Seat
        fields = '__all__'


class EquipmentInspectionSerializer(serializers.ModelSerializer):
    inspection_type_display = serializers.CharField(source='get_inspection_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    inspector_name = serializers.CharField(source='inspector.username', read_only=True)
    show_title = serializers.CharField(source='show.title', read_only=True)

    class Meta:
        model = EquipmentInspection
        fields = '__all__'
        read_only_fields = ['inspector', 'inspection_time']

    def create(self, validated_data):
        validated_data['inspector'] = self.context['request'].user
        if validated_data.get('status') in [InspectionStatus.PASS, InspectionStatus.FAIL]:
            validated_data['inspection_time'] = timezone.now()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'status' in validated_data and validated_data['status'] in [InspectionStatus.PASS, InspectionStatus.FAIL]:
            validated_data['inspection_time'] = timezone.now()
        return super().update(instance, validated_data)


class OrderItemSerializer(serializers.ModelSerializer):
    seat_number = serializers.CharField(source='seat.seat_number', read_only=True)
    seat_zone = serializers.CharField(source='seat.seat_zone', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'seat', 'seat_number', 'seat_zone', 'price']


class OrderSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    show_title = serializers.CharField(source='show.title', read_only=True)
    original_show_title = serializers.CharField(source='original_show.title', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    seat_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ['order_no', 'created_by', 'total_amount', 'service_fee', 'created_at', 'updated_at', 'paid_at']


class OrderCreateSerializer(serializers.Serializer):
    show_id = serializers.IntegerField()
    customer_name = serializers.CharField(max_length=100)
    customer_phone = serializers.CharField(max_length=20)
    seat_ids = serializers.ListField(child=serializers.IntegerField())
    remark = serializers.CharField(required=False, default='', allow_blank=True)


class RefundSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    handled_by_name = serializers.CharField(source='handled_by.username', read_only=True)
    order_no = serializers.CharField(source='order.order_no', read_only=True)
    show_title = serializers.CharField(source='show.title', read_only=True)

    class Meta:
        model = Refund
        fields = '__all__'
        read_only_fields = ['refund_no', 'handled_by', 'refund_amount', 'service_fee_deducted',
                          'created_at', 'updated_at', 'completed_at']


class RefundCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    refund_reason = serializers.CharField(required=False, default='', allow_blank=True)
    is_postponed_refund = serializers.BooleanField(default=False)
