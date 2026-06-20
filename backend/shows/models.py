from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()


class ShowStatus(models.TextChoices):
    DRAFT = 'DRAFT', '草稿'
    PENDING_INSPECTION = 'PENDING', '待检查'
    INSPECTION_FAILED = 'FAILED', '检查未通过'
    READY = 'READY', '可开售'
    ON_SALE = 'ON_SALE', '销售中'
    POSTPONED = 'POSTPONED', '已延期'
    CANCELLED = 'CANCELLED', '已取消'
    COMPLETED = 'COMPLETED', '已结束'


class SeatStatus(models.TextChoices):
    AVAILABLE = 'AVAILABLE', '可用'
    LOCKED = 'LOCKED', '锁定'
    SOLD = 'SOLD', '已售'
    REFUNDED = 'REFUNDED', '已退票'


class InspectionType(models.TextChoices):
    RIGGING = 'RIGGING', '吊杆'
    LIGHTING = 'LIGHTING', '灯光'
    FIRE = 'FIRE', '消防'


class InspectionStatus(models.TextChoices):
    PENDING = 'PENDING', '待检查'
    PASS = 'PASS', '通过'
    FAIL = 'FAIL', '未通过'


class OrderStatus(models.TextChoices):
    PENDING = 'PENDING', '待支付'
    PAID = 'PAID', '已支付'
    REFUNDING = 'REFUNDING', '退票中'
    REFUNDED = 'REFUNDED', '已退票'
    CANCELLED = 'CANCELLED', '已取消'


class RefundStatus(models.TextChoices):
    PENDING = 'PENDING', '待处理'
    APPROVED = 'APPROVED', '已批准'
    REJECTED = 'REJECTED', '已拒绝'
    COMPLETED = 'COMPLETED', '已完成'


class Show(models.Model):
    title = models.CharField('演出名称', max_length=200)
    description = models.TextField('演出描述', blank=True, default='')
    venue = models.CharField('演出场地', max_length=200)
    total_capacity = models.PositiveIntegerField('座位容量')
    show_time = models.DateTimeField('演出时间')
    status = models.CharField('状态', max_length=20, choices=ShowStatus.choices, default=ShowStatus.DRAFT)
    ticket_price = models.DecimalField('票价', max_digits=10, decimal_places=2)
    service_fee_rate = models.DecimalField('手续费率(%)', max_digits=5, decimal_places=2, default='5.00')
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name='演出经理', related_name='created_shows')
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        ordering = ['-show_time']
        verbose_name = '演出场次'
        verbose_name_plural = '演出场次'

    def __str__(self):
        return f'{self.title} - {self.show_time.strftime("%Y-%m-%d %H:%M")}'

    @property
    def is_fire_inspection_passed(self):
        return self.inspections.filter(
            inspection_type=InspectionType.FIRE,
            status=InspectionStatus.PASS
        ).exists()

    @property
    def sold_seats_count(self):
        return self.seats.filter(status=SeatStatus.SOLD).count()

    @property
    def available_seats_count(self):
        return self.seats.filter(status=SeatStatus.AVAILABLE).count()

    @property
    def has_all_inspections_passed(self):
        required_types = {InspectionType.RIGGING, InspectionType.LIGHTING, InspectionType.FIRE}
        passed = set(
            self.inspections.filter(status=InspectionStatus.PASS).values_list('inspection_type', flat=True)
        )
        return required_types.issubset(passed)

    def clean(self):
        if self.total_capacity <= 0:
            raise ValidationError('座位容量必须大于0')
        if self.ticket_price < 0:
            raise ValidationError('票价不能为负数')
        if self.service_fee_rate < 0 or self.service_fee_rate > 100:
            raise ValidationError('手续费率必须在0-100之间')

    def can_start_sale(self):
        if self.status != ShowStatus.READY:
            return False, '演出未处于可开售状态'
        if not self.is_fire_inspection_passed:
            return False, '消防检查未通过，不能开售'
        if not self.has_all_inspections_passed:
            return False, '存在未通过的安全检查'
        if self.available_seats_count == 0:
            return False, '没有可用座位'
        return True, '可以开售'


class Seat(models.Model):
    show = models.ForeignKey(Show, on_delete=models.CASCADE, related_name='seats', verbose_name='演出场次')
    seat_number = models.CharField('座位号', max_length=50)
    seat_zone = models.CharField('座位区域', max_length=100, blank=True, default='')
    status = models.CharField('状态', max_length=20, choices=SeatStatus.choices, default=SeatStatus.AVAILABLE)
    price = models.DecimalField('价格', max_digits=10, decimal_places=2)
    locked_at = models.DateTimeField('锁定时间', null=True, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        ordering = ['seat_zone', 'seat_number']
        unique_together = [['show', 'seat_number']]
        verbose_name = '座位'
        verbose_name_plural = '座位'

    def __str__(self):
        return f'{self.show.title} - {self.seat_number}'

    def clean(self):
        if self.price < 0:
            raise ValidationError('价格不能为负数')


class EquipmentInspection(models.Model):
    show = models.ForeignKey(Show, on_delete=models.CASCADE, related_name='inspections', verbose_name='演出场次')
    inspection_type = models.CharField('检查类型', max_length=20, choices=InspectionType.choices)
    status = models.CharField('检查状态', max_length=20, choices=InspectionStatus.choices, default=InspectionStatus.PENDING)
    inspector = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name='检查人员', related_name='inspections')
    inspection_time = models.DateTimeField('检查时间', null=True, blank=True)
    remark = models.TextField('备注', blank=True, default='')
    issues_found = models.TextField('发现问题', blank=True, default='')
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [['show', 'inspection_type']]
        verbose_name = '设备检查'
        verbose_name_plural = '设备检查'

    def __str__(self):
        return f'{self.show.title} - {self.get_inspection_type_display()}'


class Order(models.Model):
    order_no = models.CharField('订单号', max_length=50, unique=True)
    show = models.ForeignKey(Show, on_delete=models.PROTECT, related_name='orders', verbose_name='演出场次')
    customer_name = models.CharField('客户姓名', max_length=100)
    customer_phone = models.CharField('客户电话', max_length=20)
    total_amount = models.DecimalField('总金额', max_digits=12, decimal_places=2, default=0)
    service_fee = models.DecimalField('手续费', max_digits=10, decimal_places=2, default=0)
    status = models.CharField('订单状态', max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    original_show = models.ForeignKey(
        Show, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='postponed_orders', verbose_name='原演出场次（延期用）'
    )
    is_postponed_refund = models.BooleanField('是否延期场次退票', default=False)
    remark = models.TextField('备注', blank=True, default='')
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name='出票人', related_name='created_orders')
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)
    paid_at = models.DateTimeField('支付时间', null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = '订单'
        verbose_name_plural = '订单'

    def __str__(self):
        return self.order_no

    @property
    def seat_count(self):
        return self.items.count()


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', verbose_name='订单')
    seat = models.ForeignKey(Seat, on_delete=models.PROTECT, related_name='order_items', verbose_name='座位')
    price = models.DecimalField('单价', max_digits=10, decimal_places=2)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = '订单明细'
        verbose_name_plural = '订单明细'

    def __str__(self):
        return f'{self.order.order_no} - {self.seat.seat_number}'


class Refund(models.Model):
    refund_no = models.CharField('退票单号', max_length=50, unique=True)
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name='refunds', verbose_name='原订单')
    show = models.ForeignKey(Show, on_delete=models.PROTECT, related_name='refunds', verbose_name='演出场次')
    refund_amount = models.DecimalField('退票金额', max_digits=12, decimal_places=2)
    service_fee_deducted = models.DecimalField('扣除手续费', max_digits=10, decimal_places=2, default=0)
    status = models.CharField('退票状态', max_length=20, choices=RefundStatus.choices, default=RefundStatus.PENDING)
    refund_reason = models.TextField('退票原因', blank=True, default='')
    is_postponed_refund = models.BooleanField('是否延期场次退票', default=False)
    original_order_kept = models.BooleanField('保留原订单', default=False)
    handled_by = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name='处理人', related_name='handled_refunds')
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)
    completed_at = models.DateTimeField('完成时间', null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = '退票流水'
        verbose_name_plural = '退票流水'

    def __str__(self):
        return self.refund_no
