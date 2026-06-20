from rest_framework.permissions import BasePermission


class IsShowManager(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.groups.filter(name='演出经理').exists()


class IsEquipmentManager(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.groups.filter(name='设备主管').exists()


class IsTicketStaff(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.groups.filter(name='票务人员').exists()
