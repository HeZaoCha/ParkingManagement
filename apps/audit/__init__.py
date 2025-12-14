"""
审计日志应用

注意：模型和服务已迁移到 models/ 和 services/ 目录
为了向后兼容，这里不进行导入，直接使用新路径即可
"""

# 不在__init__.py中导入，避免Django应用初始化时的循环导入问题
# 使用新路径：from apps.audit.models import AuditLog
# 使用新路径：from apps.audit.services import AuditService

__all__ = []
