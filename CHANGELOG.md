# 变更日志 (CHANGELOG)

## [2026-05-05]

### 新增
- **CLAUDE.md**: 项目开发指南，包含技术栈、架构要点、开发命令等
- **ToolLayout 公共组件** (`components/common/ToolLayout.jsx`): 工具页面统一布局
- **进制转换工具** (`pages/BaseConverter.jsx`): 二进制/八进制/十进制/十六进制互相转换
- **查看当前 IP 工具** (`pages/IpLookup.jsx`): 查询公网 IP 及地理位置信息
- **NewAPI 外链工具**: 跳转至 NewAPI 管理平台 (https://www.xiaoping888.cc.cd/)

### 变更
- `index.html`: 页面标题改为 "Antigravity 的在线工具箱"，语言设为 zh-CN
- `App.jsx`: 新增 BaseConverter 和 IpLookup 路由
- `config/theme.jsx`: TOOLS 数组新增进制转换和查看 IP 两项
- `Home.jsx`: 导航栏标题改为 "Antigravity 的在线工具箱"
- `PROJECT_STRUCTURE.md`: 同步更新目录结构和模块说明

### 文档
- 创建 `CHANGELOG.md` 变更日志
- 更新 `PROJECT_STRUCTURE.md` 项目架构说明