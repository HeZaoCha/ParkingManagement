#!/usr/bin/env python3
"""
提取模板文件中的内联 JavaScript 和 CSS 到独立文件
按照模板路径组织静态文件目录结构
"""

import re
from pathlib import Path
from typing import List, Tuple, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "parking" / "static"


def extract_style_blocks(content: str) -> List[str]:
    """提取 <style> 标签内容"""
    pattern = r"<style[^>]*>(.*?)</style>"
    matches = re.findall(pattern, content, re.DOTALL)
    return [match.strip() for match in matches if match.strip()]


def extract_script_blocks(content: str) -> List[str]:
    """提取内联 <script> 标签内容（排除有 src 属性的）"""
    # 匹配没有 src 属性的 script 标签
    pattern = r"<script(?![^>]*\ssrc=)[^>]*>(.*?)</script>"
    matches = re.findall(pattern, content, re.DOTALL)
    return [match.strip() for match in matches if match.strip()]


def get_template_relative_path(template_path: Path) -> str:
    """获取模板相对于 templates 目录的路径"""
    try:
        return str(template_path.relative_to(TEMPLATES_DIR))
    except ValueError:
        return str(template_path)


def create_static_path(template_path: Path, file_type: str) -> Path:
    """根据模板路径创建静态文件路径"""
    rel_path = get_template_relative_path(template_path)
    # 移除 .html 扩展名
    rel_path = rel_path.replace(".html", "")
    # 创建目录路径：parking/static/{path}/css 或 js
    static_path = STATIC_DIR / rel_path / file_type
    return static_path


def extract_and_save_assets(template_path: Path) -> Tuple[Optional[str], Optional[str]]:
    """提取模板中的 CSS 和 JS，保存到静态文件目录"""
    with open(template_path, "r", encoding="utf-8") as f:
        content = f.read()

    styles = extract_style_blocks(content)
    scripts = extract_script_blocks(content)

    css_path = None
    js_path = None

    # 保存 CSS
    if styles:
        css_dir = create_static_path(template_path, "css")
        css_dir.mkdir(parents=True, exist_ok=True)
        css_path = css_dir / "style.css"

        # 合并所有样式块
        css_content = "\n\n/* ====== 样式块分隔 ====== */\n\n".join(styles)
        with open(css_path, "w", encoding="utf-8") as f:
            f.write(css_content)
        print(f"  ✓ 提取 CSS: {css_path.relative_to(BASE_DIR)}")

    # 保存 JS
    if scripts:
        js_dir = create_static_path(template_path, "js")
        js_dir.mkdir(parents=True, exist_ok=True)
        js_path = js_dir / "script.js"

        # 合并所有脚本块
        js_content = "\n\n// ====== 脚本块分隔 ======\n\n".join(scripts)
        with open(js_path, "w", encoding="utf-8") as f:
            f.write(js_content)
        print(f"  ✓ 提取 JS: {js_path.relative_to(BASE_DIR)}")

    return css_path, js_path


def update_template_file(
    template_path: Path, css_path: Optional[Path], js_path: Optional[Path]
) -> bool:
    """更新模板文件，替换内联代码为静态文件引用"""
    with open(template_path, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content
    rel_path = get_template_relative_path(template_path)
    rel_path_no_ext = rel_path.replace(".html", "")

    # 确保有 {% load static %}
    has_load_static = "{% load static %}" in content

    # 替换 <style> 标签
    if css_path:
        static_url = f"{{% static '{rel_path_no_ext}/css/style.css' %}}"
        # 移除所有 style 标签
        content = re.sub(r"<style[^>]*>.*?</style>", "", content, flags=re.DOTALL)

        # 在合适的位置添加 link 标签
        if "{% block content %}" in content:
            # 在 content block 开始后添加
            content = re.sub(
                r"({% block content %})",
                f'\\1\n<link rel="stylesheet" href="{static_url}">',
                content,
                count=1,
            )
        elif "{% block extra_css %}" in content:
            # 如果有 extra_css block，使用它
            content = re.sub(
                r"({% block extra_css %})",
                f'\\1\n<link rel="stylesheet" href="{static_url}">',
                content,
                count=1,
            )
        elif "<head>" in content:
            # 在 head 标签内添加
            content = re.sub(
                r"(<head[^>]*>)",
                f'\\1\n    <link rel="stylesheet" href="{static_url}">',
                content,
                count=1,
            )
        else:
            # 在文件开头添加
            if not has_load_static:
                content = f"{{% load static %}}\n{content}"
            content = f'<link rel="stylesheet" href="{static_url}">\n{content}'

    # 替换 <script> 标签（内联的）
    if js_path:
        static_url = f"{{% static '{rel_path_no_ext}/js/script.js' %}}"
        # 移除内联 script 标签（没有 src 的）
        content = re.sub(r"<script(?![^>]*\ssrc=)[^>]*>.*?</script>", "", content, flags=re.DOTALL)

        # 在合适的位置添加 script 标签
        if "{% endblock %}" in content:
            # 在最后一个 endblock 之前添加
            # 找到最后一个 endblock
            parts = content.rsplit("{% endblock %}", 1)
            if len(parts) == 2:
                content = (
                    f'{parts[0]}<script src="{static_url}"></script>\n{{% endblock %}}{parts[1]}'
                )
            else:
                content = f'{content}\n<script src="{static_url}"></script>'
        elif "{% block extra_js %}" in content:
            # 如果有 extra_js block，使用它
            content = re.sub(
                r"({% block extra_js %})",
                f'\\1\n<script src="{static_url}"></script>',
                content,
                count=1,
            )
        elif "</body>" in content:
            # 在 </body> 之前添加
            content = content.replace("</body>", f'<script src="{static_url}"></script>\n</body>')
        else:
            # 在文件末尾添加
            content = f'{content}\n<script src="{static_url}"></script>'

    # 确保有 {% load static %}
    if not has_load_static and (css_path or js_path):
        # 在文件开头添加（在 extends 之后）
        if "{% extends" in content:
            content = re.sub(r"({% extends[^%]+%})", "\\1\n{% load static %}", content, count=1)
        else:
            content = f"{{% load static %}}\n{content}"

    if content != original_content:
        with open(template_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def process_all_templates():
    """处理所有模板文件"""
    template_files = list(TEMPLATES_DIR.rglob("*.html"))
    processed = 0

    print(f"找到 {len(template_files)} 个模板文件\n")

    for template_path in template_files:
        # 跳过 base.html 等基础模板（这些可能包含全局样式）
        if template_path.name in ["base.html", "404.html", "500.html"]:
            continue

        styles = extract_style_blocks(template_path.read_text(encoding="utf-8"))
        scripts = extract_script_blocks(template_path.read_text(encoding="utf-8"))

        if not styles and not scripts:
            continue

        print(f"处理: {template_path.relative_to(BASE_DIR)}")

        css_path, js_path = extract_and_save_assets(template_path)

        if css_path or js_path:
            if update_template_file(template_path, css_path, js_path):
                print("  ✓ 更新模板文件")
                processed += 1

        print()

    print(f"\n完成！处理了 {processed} 个模板文件")


if __name__ == "__main__":
    process_all_templates()
