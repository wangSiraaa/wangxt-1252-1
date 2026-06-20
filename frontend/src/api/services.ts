import api from './index'
import {
  Show, Seat, EquipmentInspection, Order, Refund, SeatZoneConfig,
} from '../types'

export interface LoginResponse {
  access: string
  refresh: string
}

export const login = (username: string, password: string): Promise<LoginResponse> => {
  return api.post('/token/', { username, password }).then((res) => res.data)
}

export interface ShowListParams {
  status?: string
  search?: string
}

export const getShows = (params?: ShowListParams): Promise<Show[]> => {
  return api.get('/shows/', { params }).then((res) => res.data.results || res.data)
}

export const getShow = (id: number): Promise<Show> => {
  return api.get(`/shows/${id}/`).then((res) => res.data)
}

export const createShow = (data: Partial<Show>): Promise<Show> => {
  return api.post('/shows/', data).then((res) => res.data)
}

export const updateShow = (id: number, data: Partial<Show>): Promise<Show> => {
  return api.put(`/shows/${id}/`, data).then((res) => res.data)
}

export const deleteShow = (id: number): Promise<void> => {
  return api.delete(`/shows/${id}/`)
}

export const publishShow = (id: number): Promise<Show> => {
  return api.post(`/shows/${id}/publish/`).then((res) => res.data)
}

export const startSaleShow = (id: number): Promise<Show> => {
  return api.post(`/shows/${id}/start_sale/`).then((res) => res.data)
}

export const stopSaleShow = (id: number): Promise<Show> => {
  return api.post(`/shows/${id}/stop_sale/`).then((res) => res.data)
}

export const postponeShow = (id: number): Promise<Show> => {
  return api.post(`/shows/${id}/postpone/`).then((res) => res.data)
}

export const generateSeats = (id: number, zones: SeatZoneConfig[]): Promise<Seat[]> => {
  return api.post(`/shows/${id}/generate_seats/`, { zones }).then((res) => res.data)
}

export const getSeats = (showId?: number, status?: string): Promise<Seat[]> => {
  const params: Record<string, any> = {}
  if (showId) params.show_id = showId
  if (status) params.status = status
  return api.get('/seats/', { params }).then((res) => res.data.results || res.data)
}

export const getInspections = (showId?: number, type?: string): Promise<EquipmentInspection[]> => {
  const params: Record<string, any> = {}
  if (showId) params.show_id = showId
  if (type) params.type = type
  return api.get('/inspections/', { params }).then((res) => res.data.results || res.data)
}

export const updateInspection = (id: number, data: Partial<EquipmentInspection>): Promise<EquipmentInspection> => {
  return api.put(`/inspections/${id}/`, data).then((res) => res.data)
}

export interface OrderListParams {
  show_id?: number
  status?: string
  search?: string
}

export const getOrders = (params?: OrderListParams): Promise<Order[]> => {
  return api.get('/orders/', { params }).then((res) => res.data.results || res.data)
}

export const getOrder = (id: number): Promise<Order> => {
  return api.get(`/orders/${id}/`).then((res) => res.data)
}

export interface CreateOrderParams {
  show_id: number
  customer_name: string
  customer_phone: string
  seat_ids: number[]
  remark?: string
}

export const createOrder = (data: CreateOrderParams): Promise<Order> => {
  return api.post('/orders/create_order/', data).then((res) => res.data)
}

export interface RefundListParams {
  show_id?: number
  order_id?: number
  status?: string
}

export const getRefunds = (params?: RefundListParams): Promise<Refund[]> => {
  return api.get('/refunds/', { params }).then((res) => res.data.results || res.data)
}

export interface CreateRefundParams {
  order_id: number
  refund_reason?: string
  is_postponed_refund?: boolean
}

export const createRefund = (data: CreateRefundParams): Promise<Refund> => {
  return api.post('/refunds/create_refund/', data).then((res) => res.data)
}

export const approveRefund = (id: number): Promise<Refund> => {
  return api.post(`/refunds/${id}/approve/`).then((res) => res.data)
}

export const rejectRefund = (id: number): Promise<Refund> => {
  return api.post(`/refunds/${id}/reject/`).then((res) => res.data)
}
