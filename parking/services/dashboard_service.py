"""
仪表盘服务

从 parking.services 迁移
"""
from typing import Any

from django.core.cache import cache

from parking.services.parking_lot_service import ParkingLotService
from parking.services.parking_record_service import ParkingRecordService
from parking.services.parking_space_service import ParkingSpaceService

# 缓存键和TTL
CACHE_KEY_PREFIX = 'parking:'
CACHE_KEY_DASHBOARD = f'{CACHE_KEY_PREFIX}dashboard:data'
CACHE_TTL_DASHBOARD = 300  # 5分钟


class DashboardService:
    """
    仪表盘服务类
    
    提供仪表盘数据聚合服务。
    使用缓存优化性能，减少数据库查询。
    """
    
    @staticmethod
    def get_dashboard_data(use_cache: bool = True) -> dict[str, Any]:
        """
        获取仪表盘所需的所有数据（带缓存优化）
        
        Args:
            use_cache: 是否使用缓存，默认True
        
        Returns:
            dict[str, Any]: 仪表盘数据字典
        """
        # 尝试从缓存获取
        if use_cache:
            cached_data = cache.get(CACHE_KEY_DASHBOARD)
            if cached_data is not None:
                return cached_data
        
        # 获取活跃停车场（带可用车位信息）
        parking_lots = ParkingLotService.get_active_lots_with_availability()
        lot_ids = [lot['id'] for lot in parking_lots]
        
        # 获取车位统计
        space_stats = ParkingSpaceService.get_space_statistics(lot_ids)
        
        # 获取今日统计
        today_stats = ParkingRecordService.get_today_statistics()
        
        # 获取在场车辆数（优化：直接使用QuerySet的count，避免加载数据）
        active_count = ParkingRecordService.get_active_records().count()
        
        # 获取最近记录（优化：转换为可序列化格式以便缓存）
        recent_records_qs = ParkingRecordService.get_recent_records()
        # 转换为字典列表，便于缓存和API响应
        recent_records = [
            {
                'id': r.id,
                'license_plate': r.vehicle.license_plate,
                'space_number': r.parking_space.space_number,
                'parking_lot': r.parking_space.parking_lot.name,  # 使用parking_lot保持API兼容
                'lot_name': r.parking_space.parking_lot.name,  # 同时保留lot_name
                'entry_time': r.entry_time.isoformat(),
                'exit_time': r.exit_time.isoformat() if r.exit_time else None,
                'fee': str(r.fee) if r.fee else None,
                'is_paid': r.is_paid,
                'is_active': r.exit_time is None,  # 添加is_active字段
            }
            for r in recent_records_qs
        ]
        
        data = {
            'total_lots': len(lot_ids),
            'total_spaces': space_stats.get('total', 0),
            'occupied_spaces': space_stats.get('occupied', 0),
            'available_spaces': space_stats.get('available', 0),
            'today_count': today_stats['count'],
            'today_revenue': today_stats['revenue'],
            'active_count': active_count,
            'recent_records': recent_records,  # 已转换为字典列表，便于缓存
            'parking_lots': parking_lots,
        }
        
        # 缓存结果（5分钟）
        if use_cache:
            cache.set(CACHE_KEY_DASHBOARD, data, CACHE_TTL_DASHBOARD)
        
        return data
    
    @staticmethod
    def invalidate_cache() -> None:
        """
        清除仪表盘缓存
        
        在数据更新时调用，确保缓存一致性。
        """
        cache.delete(CACHE_KEY_DASHBOARD)
