from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import (
    Show, Seat, EquipmentInspection, Order, OrderItem, Refund,
    ShowStatus, InspectionType, InspectionStatus
)
from .serializers import (
    ShowListSerializer, ShowDetailSerializer, SeatSerializer,
    EquipmentInspectionSerializer, OrderSerializer, OrderCreateSerializer,
    RefundSerializer, RefundCreateSerializer
)
from .services import ShowService, OrderService, RefundService


class ShowViewSet(viewsets.ModelViewSet):
    queryset = Show.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ShowListSerializer
        return ShowDetailSerializer

    def get_queryset(self):
        queryset = Show.objects.all()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(venue__icontains=search)
            )
        return queryset

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        show = ShowService.publish_show(pk, request.user)
        return Response(ShowDetailSerializer(show).data)

    @action(detail=True, methods=['post'])
    def check_ready(self, request, pk=None):
        show = ShowService.check_and_ready(pk)
        return Response(ShowDetailSerializer(show).data)

    @action(detail=True, methods=['post'])
    def start_sale(self, request, pk=None):
        show = ShowService.start_sale(pk)
        return Response(ShowDetailSerializer(show).data)

    @action(detail=True, methods=['post'])
    def stop_sale(self, request, pk=None):
        show = ShowService.stop_sale(pk)
        return Response(ShowDetailSerializer(show).data)

    @action(detail=True, methods=['post'])
    def postpone(self, request, pk=None):
        show = ShowService.postpone_show(pk, request.user)
        return Response(ShowDetailSerializer(show).data)

    @action(detail=True, methods=['post'])
    def generate_seats(self, request, pk=None):
        zones_config = request.data.get('zones', [])
        seats = ShowService.generate_seats(pk, zones_config)
        return Response(SeatSerializer(seats, many=True).data)

    @action(detail=True, methods=['get'])
    def seats(self, request, pk=None):
        seats = Seat.objects.filter(show_id=pk)
        return Response(SeatSerializer(seats, many=True).data)

    @action(detail=True, methods=['get'])
    def inspections(self, request, pk=None):
        inspections = EquipmentInspection.objects.filter(show_id=pk)
        return Response(EquipmentInspectionSerializer(inspections, many=True).data)


class SeatViewSet(viewsets.ModelViewSet):
    queryset = Seat.objects.all()
    serializer_class = SeatSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Seat.objects.all()
        show_id = self.request.query_params.get('show_id')
        if show_id:
            queryset = queryset.filter(show_id=show_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


class EquipmentInspectionViewSet(viewsets.ModelViewSet):
    queryset = EquipmentInspection.objects.all()
    serializer_class = EquipmentInspectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = EquipmentInspection.objects.all()
        show_id = self.request.query_params.get('show_id')
        if show_id:
            queryset = queryset.filter(show_id=show_id)
        inspection_type = self.request.query_params.get('type')
        if inspection_type:
            queryset = queryset.filter(inspection_type=inspection_type)
        return queryset

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.show.status == ShowStatus.PENDING_INSPECTION:
            try:
                ShowService.check_and_ready(instance.show_id)
            except Exception:
                pass
        return instance


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Order.objects.all()
        show_id = self.request.query_params.get('show_id')
        if show_id:
            queryset = queryset.filter(show_id=show_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(order_no__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(customer_phone__icontains=search)
            )
        return queryset

    @action(detail=False, methods=['post'])
    def create_order(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = OrderService.create_order(
            show_id=serializer.validated_data['show_id'],
            customer_name=serializer.validated_data['customer_name'],
            customer_phone=serializer.validated_data['customer_phone'],
            seat_ids=serializer.validated_data['seat_ids'],
            user=request.user,
            remark=serializer.validated_data.get('remark', '')
        )
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class RefundViewSet(viewsets.ModelViewSet):
    queryset = Refund.objects.all()
    serializer_class = RefundSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Refund.objects.all()
        show_id = self.request.query_params.get('show_id')
        if show_id:
            queryset = queryset.filter(show_id=show_id)
        order_id = self.request.query_params.get('order_id')
        if order_id:
            queryset = queryset.filter(order_id=order_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    @action(detail=False, methods=['post'])
    def create_refund(self, request):
        serializer = RefundCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refund = RefundService.create_refund(
            order_id=serializer.validated_data['order_id'],
            user=request.user,
            refund_reason=serializer.validated_data.get('refund_reason', ''),
            is_postponed_refund=serializer.validated_data.get('is_postponed_refund', False)
        )
        return Response(RefundSerializer(refund).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        refund = RefundService.approve_refund(pk, request.user)
        return Response(RefundSerializer(refund).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        refund = RefundService.reject_refund(pk, request.user)
        return Response(RefundSerializer(refund).data)
