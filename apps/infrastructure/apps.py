"""
基础设施应用配置
"""
from django.apps import AppConfig


class InfrastructureConfig(AppConfig):
    """基础设施应用配置类"""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.infrastructure'
    verbose_name = '基础设施'
    
    def ready(self) -> None:
        """应用就绪时执行"""
        # 配置 loguru（从 infra.logging 导入）
        from infra.logging.loguru_config import configure_loguru
        configure_loguru()
        # 导入信号处理器
        import apps.infrastructure.signals  # noqa: F401
