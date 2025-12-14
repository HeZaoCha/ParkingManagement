# 贡献指南

感谢您对停车场管理系统的关注！本文档将指导您如何参与项目开发。

## 行为准则

请在参与项目时遵守以下原则：
- 尊重他人，保持友善
- 专注于技术讨论
- 接受建设性批评

## 如何贡献

### 报告问题

1. 检查 [Issues](../../issues) 确认问题未被报告
2. 创建新 Issue，包含：
   - 清晰的标题
   - 详细的问题描述
   - 复现步骤
   - 期望行为
   - 实际行为
   - 环境信息（OS、Python版本等）

### 提交功能建议

1. 创建 Issue，标记为 `enhancement`
2. 描述功能需求和使用场景
3. 等待讨论和确认

### 提交代码

1. **Fork 仓库**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ParkingManagement.git
   ```

2. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **编写代码**
   - 遵循代码规范
   - 添加必要的测试
   - 更新相关文档

4. **运行测试**
   ```bash
   uv run pytest parking/tests/ -v
   ```

5. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   ```

6. **推送并创建 PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 代码规范

### Python

- 遵循 PEP 8
- 使用类型提示
- 编写文档字符串

```python
def calculate_fee(duration: int, rate: Decimal) -> Decimal:
    """
    计算停车费用
    
    Args:
        duration: 停车时长（分钟）
        rate: 每小时费率
        
    Returns:
        计算后的费用
    """
    pass
```

### 提交信息

遵循 Conventional Commits：

```
<type>(<scope>): <subject>
```

类型：
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

示例：
```
feat(parking): 添加VIP免费停车功能
fix(api): 修复车牌验证正则表达式
docs(readme): 更新安装说明
```

## Pull Request 要求

- PR 标题清晰描述变更内容
- 关联相关 Issue
- 所有测试通过
- 代码已经过审查
- 更新了相关文档

## 开发环境

```bash
# 安装依赖（包括开发依赖）
uv sync

# 运行测试
uv run pytest parking/tests/ -v

# 运行开发服务器
uv run python manage.py runserver
```

## 项目结构

```
parking/           # 核心业务模块
├── models.py      # 数据模型
├── views.py       # 视图
├── services.py    # 业务逻辑
├── forms.py       # 表单验证
├── api_views.py   # API接口
└── tests/         # 测试用例
```

## 联系方式

- 创建 Issue 讨论
- 邮件：zaochahe@qq.com

感谢您的贡献！

