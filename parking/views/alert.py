"""
车辆通缉警报功能视图

管理通缉车辆信息，并在车辆入场时发送警报。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.2.0
"""
import json
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from loguru import logger

from parking.decorators import staff_member_required
from parking.license_plate_models import VehicleAlertLog, WantedVehicle

PAGE_SIZE = 20


@staff_member_required
def wanted_vehicle_list(request: HttpRequest) -> HttpResponse:
    """通缉车辆列表"""
    status = request.GET.get('status', 'active')
    search = request.GET.get('search', '').strip()
    
    # 优化：使用select_related预加载创建人信息
    queryset = WantedVehicle.objects.select_related('created_by').all()
    
    if status:
        queryset = queryset.filter(status=status)
    
    if search:
        queryset = queryset.filter(
            Q(license_plate__icontains=search) |
            Q(description__icontains=search) |
            Q(case_number__icontains=search)
        )
    
    queryset = queryset.order_by('-priority', '-created_at')
    
    paginator = Paginator(queryset, PAGE_SIZE)
    page = request.GET.get('page', 1)
    
    try:
        vehicles = paginator.page(page)
    except Exception:
        vehicles = paginator.page(1)
    
    context = {
        'vehicles': vehicles,
        'status': status,
        'search': search,
    }
    
    return render(request, 'admin/alert/wanted_list.html', context)


@staff_member_required
@require_GET
def wanted_vehicle_detail(request: HttpRequest, pk: int) -> HttpResponse:
    """通缉车辆详情"""
    vehicle = get_object_or_404(WantedVehicle, pk=pk)
    
    # 获取相关警报日志
    alert_logs = VehicleAlertLog.objects.filter(
        wanted_vehicle=vehicle
    ).select_related(
        'parking_record',
        'parking_record__parking_space__parking_lot'
    ).order_by('-alert_time')[:20]
    
    context = {
        'vehicle': vehicle,
        'alert_logs': alert_logs,
    }
    
    return render(request, 'admin/alert/wanted_detail.html', context)


@staff_member_required
@require_http_methods(['GET', 'POST'])
def wanted_vehicle_edit(request: HttpRequest, pk: int = None) -> HttpResponse:
    """新增/编辑通缉车辆"""
    if pk:
        vehicle = get_object_or_404(WantedVehicle, pk=pk)
    else:
        vehicle = None
    
    if request.method == 'POST':
        data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
        
        if vehicle:
            # 更新
            vehicle.license_plate = data.get('license_plate', '').strip().upper()
            vehicle.vehicle_type = data.get('vehicle_type', '')
            vehicle.description = data.get('description', '')
            vehicle.case_number = data.get('case_number', '')
            vehicle.contact_police = data.get('contact_police', '')
            vehicle.contact_phone = data.get('contact_phone', '')
            vehicle.priority = int(data.get('priority', 1))
            vehicle.status = data.get('status', 'active')
            vehicle.save()
        else:
            # 创建
            vehicle = WantedVehicle.objects.create(
                license_plate=data.get('license_plate', '').strip().upper(),
                vehicle_type=data.get('vehicle_type', ''),
                description=data.get('description', ''),
                case_number=data.get('case_number', ''),
                contact_police=data.get('contact_police', ''),
                contact_phone=data.get('contact_phone', ''),
                priority=int(data.get('priority', 1)),
                status=data.get('status', 'active'),
                created_by=request.user,
            )
        
        if request.content_type == 'application/json':
            return JsonResponse({
                'success': True,
                'message': '保存成功',
                'data': {'id': vehicle.id}
            })
        return redirect('parking:admin_wanted_vehicle_list')
    
    context = {
        'vehicle': vehicle,
    }
    
    return render(request, 'admin/alert/wanted_edit.html', context)


@staff_member_required
@require_POST
def wanted_vehicle_delete(request: HttpRequest, pk: int) -> JsonResponse:
    """删除通缉车辆"""
    vehicle = get_object_or_404(WantedVehicle, pk=pk)
    vehicle.delete()
    
    return JsonResponse({
        'success': True,
        'message': '删除成功'
    })


@staff_member_required
@require_POST
def wanted_vehicle_cancel(request: HttpRequest, pk: int) -> JsonResponse:
    """取消通缉"""
    vehicle = get_object_or_404(WantedVehicle, pk=pk)
    vehicle.cancel(user=request.user)
    
    return JsonResponse({
        'success': True,
        'message': '已取消通缉'
    })


@staff_member_required
def alert_log_list(request: HttpRequest) -> HttpResponse:
    """警报日志列表"""
    is_handled = request.GET.get('handled', '')
    search = request.GET.get('search', '').strip()
    
    queryset = VehicleAlertLog.objects.select_related(
        'wanted_vehicle',
        'parking_record',
        'parking_record__parking_space__parking_lot',
        'handled_by'
    ).order_by('-alert_time')
    
    if is_handled == 'true':
        queryset = queryset.filter(is_handled=True)
    elif is_handled == 'false':
        queryset = queryset.filter(is_handled=False)
    
    if search:
        queryset = queryset.filter(
            Q(wanted_vehicle__license_plate__icontains=search) |
            Q(wanted_vehicle__description__icontains=search)
        )
    
    paginator = Paginator(queryset, PAGE_SIZE)
    page = request.GET.get('page', 1)
    
    try:
        logs = paginator.page(page)
    except Exception:
        logs = paginator.page(1)
    
    context = {
        'logs': logs,
        'is_handled': is_handled,
        'search': search,
    }
    
    return render(request, 'admin/alert/alert_log_list.html', context)


@staff_member_required
@require_POST
def alert_log_handle(request: HttpRequest, pk: int) -> JsonResponse:
    """处理警报"""
    log = get_object_or_404(VehicleAlertLog, pk=pk)
    data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
    
    log.is_handled = True
    log.handled_by = request.user
    log.handled_at = timezone.now()
    log.notes = data.get('notes', '')
    log.save()
    
    # 通知相关用户
    log.notified_users.add(request.user)
    
    return JsonResponse({
        'success': True,
        'message': '已处理'
    })

