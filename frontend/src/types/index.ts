export enum ShowStatus {
  DRAFT = 'DRAFT',
  PENDING_INSPECTION = 'PENDING',
  INSPECTION_FAILED = 'FAILED',
  READY = 'READY',
  ON_SALE = 'ON_SALE',
  POSTPONED = 'POSTPONED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export const ShowStatusLabels: Record<ShowStatus, string> = {
  [ShowStatus.DRAFT]: '草稿',
  [ShowStatus.PENDING_INSPECTION]: '待检查',
  [ShowStatus.INSPECTION_FAILED]: '检查未通过',
  [ShowStatus.READY]: '可开售',
  [ShowStatus.ON_SALE]: '销售中',
  [ShowStatus.POSTPONED]: '已延期',
  [ShowStatus.CANCELLED]: '已取消',
  [ShowStatus.COMPLETED]: '已结束',
}

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  LOCKED = 'LOCKED',
  SOLD = 'SOLD',
  REFUNDED = 'REFUNDED',
}

export const SeatStatusLabels: Record<SeatStatus, string> = {
  [SeatStatus.AVAILABLE]: '可用',
  [SeatStatus.LOCKED]: '锁定',
  [SeatStatus.SOLD]: '已售',
  [SeatStatus.REFUNDED]: '已退票',
}

export enum InspectionType {
  RIGGING = 'RIGGING',
  LIGHTING = 'LIGHTING',
  FIRE = 'FIRE',
}

export const InspectionTypeLabels: Record<InspectionType, string> = {
  [InspectionType.RIGGING]: '吊杆',
  [InspectionType.LIGHTING]: '灯光',
  [InspectionType.FIRE]: '消防',
}

export enum InspectionStatus {
  PENDING = 'PENDING',
  PASS = 'PASS',
  FAIL = 'FAIL',
}

export const InspectionStatusLabels: Record<InspectionStatus, string> = {
  [InspectionStatus.PENDING]: '待检查',
  [InspectionStatus.PASS]: '通过',
  [InspectionStatus.FAIL]: '未通过',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDING = 'REFUNDING',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export const OrderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '待支付',
  [OrderStatus.PAID]: '已支付',
  [OrderStatus.REFUNDING]: '退票中',
  [OrderStatus.REFUNDED]: '已退票',
  [OrderStatus.CANCELLED]: '已取消',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

export const RefundStatusLabels: Record<RefundStatus, string> = {
  [RefundStatus.PENDING]: '待处理',
  [RefundStatus.APPROVED]: '已批准',
  [RefundStatus.REJECTED]: '已拒绝',
  [RefundStatus.COMPLETED]: '已完成',
}

export interface Show {
  id: number
  title: string
  description?: string
  venue: string
  total_capacity: number
  show_time: string
  status: ShowStatus
  status_display?: string
  ticket_price: string
  service_fee_rate: string
  created_by: number
  created_by_name?: string
  created_at: string
  updated_at: string
  sold_seats_count?: number
  available_seats_count?: number
  is_fire_inspection_passed?: boolean
  has_all_inspections_passed?: boolean
}

export interface Seat {
  id: number
  show: number
  show_title?: string
  seat_number: string
  seat_zone: string
  status: SeatStatus
  status_display?: string
  price: string
  locked_at?: string
  created_at: string
  updated_at: string
}

export interface EquipmentInspection {
  id: number
  show: number
  show_title?: string
  inspection_type: InspectionType
  inspection_type_display?: string
  status: InspectionStatus
  status_display?: string
  inspector: number
  inspector_name?: string
  inspection_time?: string
  remark?: string
  issues_found?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: number
  seat: number
  seat_number?: string
  seat_zone?: string
  price: string
}

export interface Order {
  id: number
  order_no: string
  show: number
  show_title?: string
  customer_name: string
  customer_phone: string
  total_amount: string
  service_fee: string
  status: OrderStatus
  status_display?: string
  original_show?: number | null
  original_show_title?: string
  is_postponed_refund: boolean
  remark?: string
  created_by: number
  created_by_name?: string
  created_at: string
  updated_at: string
  paid_at?: string
  items?: OrderItem[]
  seat_count?: number
}

export interface Refund {
  id: number
  refund_no: string
  order: number
  order_no?: string
  show: number
  show_title?: string
  refund_amount: string
  service_fee_deducted: string
  status: RefundStatus
  status_display?: string
  refund_reason?: string
  is_postponed_refund: boolean
  original_order_kept: boolean
  handled_by: number
  handled_by_name?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface SeatZoneConfig {
  zone: string
  prefix: string
  count: number
  price: string
}
