"""
停车场管理系统核心模块

注意：模型已迁移到 models/ 目录
为了向后兼容，这里不进行导入，直接使用新路径即可
"""

# 不在__init__.py中导入，避免Django应用初始化时的循环导入问题
# 使用新路径：from parking.models import ParkingLot, Vehicle, ParkingRecord
# 旧路径仍然可用（通过models/__init__.py重新导出）

__all__ = []
