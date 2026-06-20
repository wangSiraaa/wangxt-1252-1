import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework import serializers

from .models import (
    Show, Seat, EquipmentInspection, Order, OrderItem, Refund,
    ShowStatus, SeatStatus, InspectionType, InspectionStatus, OrderStatus, RefundStatus
)


class ShowService:
    @staticmethod
    def generate_order_no():
        return f'ORD{timezone.now().strftime("%Y%m%d%H%M%S")}{uuid.uuid4().hex[:6].upper()}'

    @staticmethod
    def generate_refund_no():
        return f'REF{timezone.now().strftime("%Y%m%d%H%M%S")}{uuid.uuid4().hex[:6].upper()}'

    @staticmethod
    def publish_show(show_id, user):
        with transaction.atomic():
            show = Show.objects.select_for_update().get(id=show_id)
            if show.created_by_id != user.id:
                raise serializers.ValidationError('只有演出经理可以发布场次')
            if show.status not in [ShowStatus.DRAFT, ShowStatus.INSPECTION_FAILED]:
                raise serializers.ValidationError(f'当前状态({show.get_status_display()})不可发布')

            seat_count = show.seats.count()
            if seat_count == 0:
                raise serializers.ValidationError('请先配置座位信息')
            if seat_count > show.total_capacity:
                raise serializers.ValidationError(
                    f'座位数({seat_count})超过容量上限({show.total_capacity})'
                )

            EquipmentInspection.objects.get_or_create(
                show=show, inspection_type=InspectionType.RIGGING,
                defaults={'inspector': user, 'status': InspectionStatus.PENDING}
            )
            EquipmentInspection.objects.get_or_create(
                show=show, inspection_type=InspectionType.LIGHTING,
                defaults={'inspector': user, 'status': InspectionStatus.PENDING}
            )
            EquipmentInspection.objects.get_or_create(
                show=show, inspection_type=InspectionType.FIRE,
                defaults={'inspector': user, 'status': InspectionStatus.PENDING}
            )

            show.status = ShowStatus.PENDING_INSPECTION
            show.save()
            return show

    @staticmethod
    def check_and_ready(show_id):
        with transaction.atomic():
            show = Show.objects.select_for_update().get(id=show_id)
            if not show.has_all_inspections_passed:
                missing = []
                for itype, name in InspectionType.choices:
                    if not show.inspections.filter(
                        inspection_type=itype, status=InspectionStatus.PASS
                    ).exists():
                        missing.append(name)
                raise serializers.ValidationError(f'以下检查未通过: {", ".join(missing)}')
            if show.status == ShowStatus.PENDING_INSPECTION:
                show.status = ShowStatus.READY
                show.save()
            return show

    @staticmethod
    def start_sale(show_id):
        with transaction.atomic():
            show = Show.objects.select_for_update().get(id=show_id)
            can_sale, message = show.can_start_sale()
            if not can_sale:
                raise serializers.ValidationError(message)
            show.status = ShowStatus.ON_SALE
            show.save()
            return show

    @staticmethod
    def stop_sale(show_id):
        with transaction.atomic():
            show = Show.objects.select_for_update().get(id=show_id)
            if show.status == ShowStatus.ON_SALE:
                show.status = ShowStatus.READY
                show.save()
            return show

    @staticmethod
    def postpone_show(show_id, user):
        with transaction.atomic():
            show = Show.objects.select_for_update().get(id=show_id)
            if show.status in [ShowStatus.COMPLETED, ShowStatus.CANCELLED]:
                raise serializers.ValidationError('已结束或已取消的场次不能延期')
            show.status = ShowStatus.POSTPONED
            show.save()
            return show

    @staticmethod
    def generate_seats(show_id, zones_config):
        show = Show.objects.get(id=show_id)
        created_seats = []
        with transaction.atomic():
            Seat.objects.filter(show=show, status=SeatStatus.AVAILABLE).delete()
            total = 0
            for zone in zones_config:
                zone_name = zone.get('zone', '')
                count = int(zone.get('count', 0))
                price = Decimal(zone.get('price', show.ticket_price))
                prefix = zone.get('prefix', '')
                for i in range(1, count + 1):
                    seat_no = f'{prefix}{i}' if prefix else str(i)
                    seat = Seat.objects.create(
                        show=show,
                        seat_number=seat_no,
                        seat_zone=zone_name,
                        price=price,
                        status=SeatStatus.AVAILABLE
                    )
                    created_seats.append(seat)
                    total += 1
            if total > show.total_capacity:
                raise serializers.ValidationError(
                    f'生成座位数({total})超过容量上限({show.total_capacity})'
                )
        return created_seats


class OrderService:
    @staticmethod
    def create_order(show_id, customer_name, customer_phone, seat_ids, user, remark=''):
        with transaction.atomic():
            show = Show.objects.select_for_update().get(id=show_id)

            if show.status not in [ShowStatus.ON_SALE, ShowStatus.POSTPONED]:
                raise serializers.ValidationError(
                    f'当前状态({show.get_status_display()})不可出票'
                )

            if show.status == ShowStatus.POSTPONED:
                pass

            if not show.is_fire_inspection_passed and show.status == ShowStatus.ON_SALE:
                raise serializers.ValidationError('消防检查未通过，不能出票')

            if not seat_ids:
                raise serializers.ValidationError('请选择座位')

            seats = Seat.objects.select_for_update().filter(
                id__in=seat_ids, show_id=show_id
            )

            if seats.count() != len(seat_ids):
                raise serializers.ValidationError('部分座位不存在或不属于本场次')

            unavailable = []
            for seat in seats:
                if seat.status != SeatStatus.AVAILABLE:
                    unavailable.append(f'{seat.seat_number}({seat.get_status_display()})')
            if unavailable:
                raise serializers.ValidationError(f'以下座位不可用: {", ".join(unavailable)}')

            sold_count = show.seats.filter(status=SeatStatus.SOLD).count()
            if sold_count + len(seats) > show.total_capacity:
                raise serializers.ValidationError(
                    f'超过座位容量上限(剩余{show.total_capacity - sold_count}座)'
                )

            total = sum(seat.price for seat in seats)
            service_fee = total * show.service_fee_rate / Decimal('100')

            order = Order.objects.create(
                order_no=ShowService.generate_order_no(),
                show=show,
                customer_name=customer_name,
                customer_phone=customer_phone,
                total_amount=total,
                service_fee=service_fee,
                status=OrderStatus.PAID,
                remark=remark,
                created_by=user,
                paid_at=timezone.now()
            )

            for seat in seats:
                OrderItem.objects.create(order=order, seat=seat, price=seat.price)
                seat.status = SeatStatus.SOLD
                seat.save()

            return order


class RefundService:
    @staticmethod
    def create_refund(order_id, user, refund_reason='', is_postponed_refund=False):
        with transaction.atomic():
            order = Order.objects.select_for_update().get(id=order_id)

            if order.status not in [OrderStatus.PAID, OrderStatus.REFUNDING]:
                raise serializers.ValidationError(
                    f'订单状态({order.get_status_display()})不可退票'
                )

            show = order.show
            service_fee_rate = show.service_fee_rate

            refund_amount = order.total_amount
            service_fee_deducted = order.service_fee

            if is_postponed_refund or order.is_postponed_refund:
                original_order_kept = True
            else:
                original_order_kept = False

            refund = Refund.objects.create(
                refund_no=ShowService.generate_refund_no(),
                order=order,
                show=show,
                refund_amount=refund_amount,
                service_fee_deducted=service_fee_deducted,
                status=RefundStatus.PENDING,
                refund_reason=refund_reason,
                is_postponed_refund=is_postponed_refund,
                original_order_kept=original_order_kept,
                handled_by=user
            )

            order.status = OrderStatus.REFUNDING
            order.is_postponed_refund = is_postponed_refund
            order.save()

            return refund

    @staticmethod
    def approve_refund(refund_id, user):
        with transaction.atomic():
            refund = Refund.objects.select_for_update().get(id=refund_id)
            if refund.status != RefundStatus.PENDING:
                raise serializers.ValidationError('退票单不处于待处理状态')

            order = refund.order
            if not refund.original_order_kept:
                order.status = OrderStatus.REFUNDED
                order.save()

            for item in order.items.all():
                seat = item.seat
                seat.status = SeatStatus.REFUNDED
                seat.save()

            refund.status = RefundStatus.COMPLETED
            refund.completed_at = timezone.now()
            refund.save()

            return refund

    @staticmethod
    def reject_refund(refund_id, user):
        with transaction.atomic():
            refund = Refund.objects.select_for_update().get(id=refund_id)
            if refund.status != RefundStatus.PENDING:
                raise serializers.ValidationError('退票单不处于待处理状态')

            order = refund.order
            if order.status == OrderStatus.REFUNDING:
                order.status = OrderStatus.PAID
                order.save()

            refund.status = RefundStatus.REJECTED
            refund.save()

            return refund
