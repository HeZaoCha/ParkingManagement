"""
报表统计服务

提供数据统计和报表生成服务。
"""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Optional

from django.db.models import Count, Q, Sum
from django.utils import timezone

from parking.models import ParkingLot, ParkingRecord, ParkingSpace


class ReportService:
    """报表统计服务类"""
    
    @staticmethod
    def get_daily_stats(date: Optional[datetime] = None) -> dict[str, Any]:
        """
        获取每日统计数据
        
        Args:
            date: 日期，如果为None则使用今天
            
        Returns:
            dict: 统计数据字典
        """
        if date is None:
            date = timezone.now()
        
        date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        records = ParkingRecord.objects.filter(
            entry_time__gte=date_start,
            entry_time__lte=date_end
        )
        
        total_count = records.count()
        paid_records = records.filter(is_paid=True)
        revenue = paid_records.aggregate(total=Sum('fee'))['total'] or Decimal('0.00')
        paid_count = paid_records.count()
        
        return {
            'date': date.date(),
            'total_count': total_count,
            'paid_count': paid_count,
            'unpaid_count': total_count - paid_count,
            'revenue': revenue,
        }
    
    @staticmethod
    def get_range_stats(start_date: datetime, end_date: datetime) -> dict[str, Any]:
        """
        获取日期范围内的统计数据
        
        Args:
            start_date: 开始日期
            end_date: 结束日期
            
        Returns:
            dict: 统计数据字典
        """
        records = ParkingRecord.objects.filter(
            entry_time__gte=start_date,
            entry_time__lte=end_date
        )
        
        total_count = records.count()
        paid_records = records.filter(is_paid=True)
        revenue = paid_records.aggregate(total=Sum('fee'))['total'] or Decimal('0.00')
        
        # 按停车场统计
        parking_lot_stats = records.values(
            'parking_space__parking_lot__name'
        ).annotate(
            count=Count('id'),
            revenue=Sum('fee', filter=Q(is_paid=True))
        ).order_by('-count')
        
        return {
            'start_date': start_date.date(),
            'end_date': end_date.date(),
            'total_count': total_count,
            'revenue': revenue,
            'parking_lot_stats': list(parking_lot_stats),
        }
    
    @staticmethod
    def get_parking_lot_stats(parking_lot_id: Optional[int] = None) -> dict[str, Any]:
        """
        获取停车场统计数据
        
        Args:
            parking_lot_id: 停车场ID，如果为None则统计所有停车场
            
        Returns:
            dict: 统计数据字典
        """
        if parking_lot_id:
            parking_lots = ParkingLot.objects.filter(id=parking_lot_id)
        else:
            parking_lots = ParkingLot.objects.filter(is_active=True)
        
        result = []
        for lot in parking_lots:
            spaces = ParkingSpace.objects.filter(parking_lot=lot)
            occupied = spaces.filter(is_occupied=True).count()
            available = spaces.filter(is_occupied=False).count()
            
            # 今日统计
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_records = ParkingRecord.objects.filter(
                parking_space__parking_lot=lot,
                entry_time__gte=today_start
            )
            today_count = today_records.count()
            today_revenue = today_records.filter(
                is_paid=True
            ).aggregate(total=Sum('fee'))['total'] or Decimal('0.00')
            
            result.append({
                'id': lot.id,
                'name': lot.name,
                'total_spaces': lot.total_spaces,
                'occupied_spaces': occupied,
                'available_spaces': available,
                'occupancy_rate': round(occupied / lot.total_spaces * 100, 2) if lot.total_spaces > 0 else 0,
                'today_count': today_count,
                'today_revenue': today_revenue,
            })
        
        return {'parking_lots': result}
    
    @staticmethod
    def get_chart_data(days: int = 7) -> dict[str, Any]:
        """
        获取图表数据
        
        Args:
            days: 统计天数，默认7天
            
        Returns:
            dict: 图表数据字典
        """
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # 按日期分组统计
        dates = []
        counts = []
        revenues = []
        
        current_date = start_date.date()
        end_date_only = end_date.date()
        
        while current_date <= end_date_only:
            date_start = timezone.make_aware(
                datetime.combine(current_date, datetime.min.time())
            )
            date_end = timezone.make_aware(
                datetime.combine(current_date, datetime.max.time())
            )
            
            records = ParkingRecord.objects.filter(
                entry_time__gte=date_start,
                entry_time__lte=date_end
            )
            
            count = records.count()
            revenue = records.filter(
                is_paid=True
            ).aggregate(total=Sum('fee'))['total'] or Decimal('0.00')
            
            dates.append(current_date.strftime('%m-%d'))
            counts.append(count)
            revenues.append(float(revenue))
            
            current_date += timedelta(days=1)
        
        return {
            'labels': dates,
            'counts': counts,
            'revenues': revenues,
        }

