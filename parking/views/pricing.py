"""
费率管理视图

提供费率模板的创建、编辑、删除等功能。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.1.0
"""
import json

from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_http_methods
from django.views.decorators.vary import vary_on_headers
from loguru import logger

from parking.decorators import staff_member_required
from parking.pricing_models import ParkingLotPricing, PricingRule, PricingTemplate


@staff_member_required
@require_http_methods(['GET'])
@cache_page(60 * 2)  # 缓存2分钟
@vary_on_headers('Cookie')
def pricing_template_list(request):
    """费率模板列表"""
    templates = PricingTemplate.objects.all().prefetch_related('rules').order_by('-created_at')
    
    context = {
        'templates': templates,
    }
    return render(request, 'admin/pricing/template_list.html', context)


@staff_member_required
@require_http_methods(['GET', 'POST'])
def pricing_template_edit(request, template_id=None):
    """创建/编辑费率模板"""
    template = None
    if template_id:
        template = get_object_or_404(PricingTemplate, id=template_id)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
            
            if template:
                template.name = data.get('name', template.name)
                template.description = data.get('description', '')
                template.free_minutes = int(data.get('free_minutes', 15))
                template.daily_max_fee = data.get('daily_max_fee') or None
            else:
                template = PricingTemplate.objects.create(
                    name=data.get('name'),
                    description=data.get('description', ''),
                    free_minutes=int(data.get('free_minutes', 15)),
                    daily_max_fee=data.get('daily_max_fee') or None
                )
            
            # 更新费率规则
            rules_data = data.get('rules', [])
            if isinstance(rules_data, str):
                rules_data = json.loads(rules_data)
            
            # 删除旧规则
            if template_id:
                template.rules.all().delete()
            
            # 创建新规则
            for idx, rule_data in enumerate(rules_data):
                PricingRule.objects.create(
                    template=template,
                    start_minutes=int(rule_data.get('start_minutes', 0)),
                    end_minutes=int(rule_data.get('end_minutes', 0)) if rule_data.get('end_minutes') else None,
                    rate_per_hour=rule_data.get('rate_per_hour'),
                    order=idx
                )
            
            template.save()
            
            return JsonResponse({
                'success': True,
                'message': '模板保存成功',
                'template_id': template.id
            })
            
        except Exception as e:
            logger.exception('保存费率模板失败')
            return JsonResponse({
                'success': False,
                'message': f'保存失败: {str(e)}'
            }, status=500)
    
    # GET请求：显示编辑页面
    # 优化：使用prefetch_related预加载规则
    if template:
        template = PricingTemplate.objects.prefetch_related('rules').get(id=template.id)
        rules = list(template.rules.all().order_by('order', 'start_minutes'))
    else:
        rules = []
    
    context = {
        'template': template,
        'rules': rules,
    }
    return render(request, 'admin/pricing/template_edit.html', context)


@staff_member_required
@require_http_methods(['POST'])
def pricing_template_delete(request, template_id):
    """删除费率模板"""
    template = get_object_or_404(PricingTemplate, id=template_id)
    
    # 检查是否被使用
    if template.parking_lots.exists():
        return JsonResponse({
            'success': False,
            'message': '该模板正在被使用，无法删除'
        }, status=400)
    
    template.delete()
    
    return JsonResponse({
        'success': True,
        'message': '模板删除成功'
    })


@staff_member_required
@require_http_methods(['GET', 'POST'])
def parking_lot_pricing_edit(request, lot_id):
    """停车场费率配置"""
    from parking.models import ParkingLot
    
    parking_lot = get_object_or_404(ParkingLot, id=lot_id)
    pricing_config, created = ParkingLotPricing.objects.get_or_create(
        parking_lot=parking_lot
    )
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
            
            pricing_config.charge_type = data.get('charge_type', 'fixed')
            template_id = data.get('template_id')
            
            if template_id:
                template = PricingTemplate.objects.get(id=template_id)
                pricing_config.template = template
            else:
                pricing_config.template = None
            
            # 使用match/case优化（Python 3.10+特性）
            match pricing_config.charge_type:
                case 'fixed':
                    pricing_config.hourly_rate = data.get('hourly_rate')
                    pricing_config.free_minutes = None
                    pricing_config.daily_max_fee = None
                    pricing_config.custom_rules = []
                case 'tiered':
                    pricing_config.hourly_rate = None
                    pricing_config.free_minutes = int(data.get('free_minutes', 15))
                    pricing_config.daily_max_fee = data.get('daily_max_fee') or None
                    # 自定义规则（仅在无模板时使用）
                    if not pricing_config.template:
                        custom_rules = data.get('custom_rules', [])
                        if isinstance(custom_rules, str):
                            custom_rules = json.loads(custom_rules)
                        pricing_config.custom_rules = custom_rules
                case _:
                    pass  # 保持原值
            
            pricing_config.save()
            
            return JsonResponse({
                'success': True,
                'message': '费率配置保存成功'
            })
            
        except Exception as e:
            logger.exception('保存费率配置失败')
            return JsonResponse({
                'success': False,
                'message': f'保存失败: {str(e)}'
            }, status=500)
    
    # GET请求：显示配置页面
    # 优化：使用prefetch_related预加载模板规则
    templates = PricingTemplate.objects.filter(is_active=True).prefetch_related('rules')
    
    # 优化：如果pricing_config有template，预加载其规则
    if pricing_config.template_id:
        pricing_config = ParkingLotPricing.objects.select_related('template').prefetch_related('template__rules').get(id=pricing_config.id)
    
    context = {
        'parking_lot': parking_lot,
        'pricing_config': pricing_config,
        'templates': templates,
    }
    return render(request, 'admin/parking_lot/pricing_edit.html', context)


@staff_member_required
@require_http_methods(['POST'])
def pricing_preview(request):
    """费率预览API"""
    try:
        data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
        
        duration_minutes = int(data.get('duration_minutes', 0))
        charge_type = data.get('charge_type', 'fixed')
        lot_id = data.get('lot_id')
        
        if not lot_id:
            return JsonResponse({
                'success': False,
                'message': '请提供停车场ID'
            }, status=400)
        
        from parking.models import ParkingLot, ParkingRecord, ParkingSpace, Vehicle
        from datetime import timedelta
        from django.utils import timezone
        
        parking_lot = get_object_or_404(ParkingLot, id=lot_id)
        
        try:
            pricing_config = parking_lot.pricing_config
        except AttributeError:
            pricing_config = None
        
        if duration_minutes <= 0:
            return JsonResponse({
                'success': True,
                'fee': '0.00',
                'breakdown': []
            })
        
        # 计算费用（使用match/case优化）
        match charge_type:
            case 'fixed':
                hourly_rate = float(data.get('hourly_rate', parking_lot.hourly_rate))
                free_minutes = 15
                
                if duration_minutes <= free_minutes:
                    fee = 0.00
                    breakdown = [f'前{free_minutes}分钟免费']
                else:
                    billable_minutes = duration_minutes - free_minutes
                    hours = (billable_minutes + 59) // 60  # 向上取整
                    fee = hours * hourly_rate
                    breakdown = [
                        f'前{free_minutes}分钟免费',
                        f'计费时长：{billable_minutes}分钟（按{hours}小时计费）',
                        f'费率：¥{hourly_rate:.2f}/小时',
                        f'费用：{hours} × ¥{hourly_rate:.2f} = ¥{fee:.2f}'
                    ]
            case 'tiered':
                # 阶梯收费
                # 检查是否有配置或模板
                template_id = data.get('template_id')
                if template_id:
                    template = PricingTemplate.objects.get(id=template_id)
                    free_minutes = template.free_minutes
                elif pricing_config and pricing_config.charge_type == 'tiered':
                    free_minutes = pricing_config.get_free_minutes()
                else:
                    free_minutes = int(data.get('free_minutes', 15))
                
                daily_max_fee = float(data.get('daily_max_fee', 0)) or None
                
                if duration_minutes <= free_minutes:
                    fee = 0.00
                    breakdown = [f'前{free_minutes}分钟免费']
                else:
                    # 创建临时记录来计算费用
                    temp_vehicle, _ = Vehicle.objects.get_or_create(
                        license_plate='TEMP_PREVIEW',
                        defaults={'vehicle_type': 'car'}
                    )
                    temp_space = ParkingSpace.objects.filter(
                        parking_lot=parking_lot,
                        is_occupied=False
                    ).first()
                    
                    if temp_space:
                        # 临时创建费率配置（如果不存在）
                        if not pricing_config:
                            from parking.pricing_models import ParkingLotPricing
                            pricing_config, _ = ParkingLotPricing.objects.get_or_create(
                                parking_lot=parking_lot,
                                defaults={'charge_type': 'tiered'}
                            )
                        
                        if template_id:
                            pricing_config.template_id = template_id
                        pricing_config.charge_type = 'tiered'
                        pricing_config.free_minutes = free_minutes
                        pricing_config.daily_max_fee = daily_max_fee
                        pricing_config.save()
                        
                        temp_record = ParkingRecord.objects.create(
                            vehicle=temp_vehicle,
                            parking_space=temp_space,
                            entry_time=timezone.now() - timedelta(minutes=duration_minutes),
                            exit_time=timezone.now()
                        )
                        fee = float(temp_record.calculate_fee())
                        temp_record.delete()
                        
                        breakdown = [f'前{free_minutes}分钟免费']
                        breakdown.append(f'计费时长：{duration_minutes - free_minutes}分钟')
                        
                        # 获取规则详情
                        effective_rules = pricing_config.get_effective_rules()
                        if effective_rules:
                            breakdown.append('阶梯规则：')
                            for rule in effective_rules:
                                start = rule.get('start_minutes', 0)
                                end = rule.get('end_minutes', '∞')
                                rate = rule.get('rate_per_hour', 0)
                                breakdown.append(f'  {start}-{end}分钟：¥{rate:.2f}/小时')
                        
                        if daily_max_fee and fee > daily_max_fee:
                            breakdown.append(f'超过每日上限¥{daily_max_fee:.2f}，按上限计费')
                            fee = daily_max_fee
                    else:
                        fee = 0.00
                        breakdown = ['无法计算：停车场无可用车位']
        
        return JsonResponse({
            'success': True,
            'fee': f'{fee:.2f}',
            'breakdown': breakdown
        })
        
    except Exception as e:
        logger.exception('费率预览计算失败')
        return JsonResponse({
            'success': False,
            'message': f'计算失败: {str(e)}'
        }, status=500)

