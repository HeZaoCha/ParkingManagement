"""
通用应用

注意：
- 模型已迁移到 models/ 目录
- 工具函数、异常类、装饰器已迁移到 core/ 目录
- 为了向后兼容，这里不进行导入，直接使用新路径即可
"""

# 不在__init__.py中导入，避免Django应用初始化时的循环导入问题
# 使用新路径：from apps.common.models import TimestampMixin, BaseModel

__all__ = []
