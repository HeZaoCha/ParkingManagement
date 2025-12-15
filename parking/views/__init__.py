"""
停车场管理系统视图模块

从 parking.views 和各个views文件迁移
"""

# 从auth.py导入认证相关视图
from parking.views.auth import (
    login_view,
    logout_view,
    home_view,
)

# 从dashboard.py导入仪表盘视图
from parking.views.dashboard import (
    dashboard_view,
)

# 从其他views文件导入（保持向后兼容）
# 注意：不在__init__.py中导入模块，避免循环导入问题
# 使用新路径：from parking.views import admin, api, etc.

__all__ = [
    "login_view",
    "logout_view",
    "home_view",
    "dashboard_view",
]
