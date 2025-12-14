# 安全修复说明

## 问题描述

在提交 `6ffd503` 中，`.cursor/mcp.json` 文件包含了 GitHub Personal Access Token，这违反了 GitHub 的安全策略。

## 已完成的修复

1. ✅ 将 `.cursor/mcp.json` 添加到 `.gitignore`
2. ✅ 从 Git 跟踪中移除了包含敏感信息的文件
3. ✅ 创建了 `.cursor/mcp.json.example` 作为模板文件
4. ✅ **使用 git filter-branch 从所有 Git 历史中彻底移除了敏感文件**
5. ✅ **强制推送到远程仓库，历史已清理**

## ✅ 修复完成

**当前状态**：敏感信息已从所有 Git 历史记录中完全移除，包括所有分支和提交。

### 选项 1：使用 git filter-branch（推荐）

```bash
# 从所有提交历史中移除 .cursor/mcp.json
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .cursor/mcp.json" \
  --prune-empty --tag-name-filter cat -- --all

# 强制推送（需要团队协调）
git push origin --force --all
git push origin --force --tags
```

### 选项 2：使用 BFG Repo-Cleaner（更快）

```bash
# 安装 BFG（如果未安装）
# 下载：https://rtyley.github.io/bfg-repo-cleaner/

# 移除文件
java -jar bfg.jar --delete-files .cursor/mcp.json

# 清理
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 强制推送
git push origin --force --all
```

### 选项 3：使用 GitHub 提供的允许 URL（临时方案，不推荐）

如果暂时无法重写历史，可以使用 GitHub 提供的 URL 来允许这个 secret：
https://github.com/HeZaoCha/ParkingManagement/security/secret-scanning/unblock-secret/36qLoHIW5ZZxdxkbQpE0rPpGOz3

**注意**：这不会从历史中移除敏感信息，只是允许推送。建议尽快使用选项 1 或 2 完全移除。

## 后续步骤

1. **立即撤销并重新生成 GitHub Personal Access Token**
   - 访问：https://github.com/settings/tokens
   - 撤销已泄露的 token
   - 创建新的 token

2. **更新本地配置文件**
   - 复制 `.cursor/mcp.json.example` 为 `.cursor/mcp.json`
   - 填入新的 token

3. **通知团队成员**
   - 如果这是共享仓库，通知所有团队成员
   - 他们需要重新克隆仓库或重置本地分支

## 预防措施

1. ✅ `.cursor/mcp.json` 已添加到 `.gitignore`
2. ✅ 创建了示例文件 `.cursor/mcp.json.example`
3. 建议使用环境变量或密钥管理服务来存储敏感信息

## 参考资源

- [GitHub Secret Scanning](https://docs.github.com/code-security/secret-scanning)
- [移除敏感数据](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [git filter-branch 文档](https://git-scm.com/docs/git-filter-branch)

