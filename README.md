# Life-OS 在线插件市场

本仓库是 Life-OS（人生系统）的**在线插件数据源**。客户端从本仓库拉取插件清单与插件文件，实现「插件市场」的在线安装 / 更新 / 卸载。

## 目录结构

```
plugins/
  index.json          # 市场清单（所有可上架插件）
  <pluginKey>/        # 每个插件一个目录
    manifest.json     # 插件清单（与 index.json 中条目一致，安装时校验）
    plugin.js         # 插件前端代码（原生 JS，IIFE）
    README.md         # 插件介绍
```

## 上架一个新插件

1. 在 `plugins/` 下新建目录 `<pluginKey>/`
2. 编写 `manifest.json`、`plugin.js`、`README.md`
3. 在 `plugins/index.json` 的 `plugins` 数组中追加条目
4. 提交推送即可（客户端缓存 10 分钟，稍后自动可见）

## manifest.json 规范

```json
{
  "pluginKey": "reading-notes",
  "name": "读书笔记",
  "description": "记录读书心得、摘抄与书评",
  "version": "1.0.0",
  "category": "lifestyle",
  "cardIcon": "book-open",
  "routePath": "/reading-notes",
  "gradientFrom": "#a855f7",
  "gradientTo": "#ec4899",
  "entry": "plugin.js",
  "files": ["plugin.js", "README.md"],
  "aiMethods": [
    {
      "id": "addNote",
      "name": "添加读书笔记",
      "description": "在读书笔记插件中添加一条笔记",
      "kind": "add",
      "collection": "notes",
      "params": [
        { "name": "title", "type": "string", "required": true, "description": "书名或笔记标题" }
      ]
    }
  ]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `pluginKey` | ✅ | 插件唯一标识，目录名必须一致 |
| `name` / `description` | ✅ | 展示名称 / 简介 |
| `version` | ✅ | 版本号（更新时对比） |
| `category` | ✅ | 分类：core / education / productivity / finance / lifestyle / health |
| `cardIcon` | ✅ | 菜单图标名（lucide 图标名或 emoji） |
| `routePath` | ✅ | 前端路由，如 `/reading-notes` |
| `gradientFrom` / `gradientTo` | ✅ | 卡片渐变配色 |
| `entry` | ✅ | 入口 JS 文件名（默认 `plugin.js`） |
| `files` | ✅ | 需要下载的文件列表（含 entry） |
| `aiMethods` | ⭕ | 暴露给 AI 聊天的方法（kind: add / list / update / delete，collection 为数据集合名） |

## plugin.js 开发规范

- 使用**原生 JS**（IIFE），不依赖 React，无需构建
- 全局注册：`window.__lifePluginRegister({ key, mount, unmount })`
- `mount(el, ctx)`：el 为页面容器 DOM，ctx.api(path) 返回后端 API 路径（同源）
- 数据读写：插件数据通过通用数据 API `GET/POST /api/market/data/<pluginKey>/<collection>`
  - `GET`：返回 `{ items, total }`
  - `POST` body：`{ op: 'add'|'update'|'delete', data: {...} }`（update/delete 需 `id`）
- 页面样式建议深色（与 Life-OS 一致）：背景 `#18181b` 系、边框 `rgba(255,255,255,0.1)`、强调 `#818cf8`

## AI 方法

`aiMethods` 中声明的方法会自动注册到 AI 助手，用户在聊天中即可调用（如「在读书笔记中添加一条笔记《活着》」）。执行时按 `kind` 对 `collection` 做增 / 查 / 改 / 删，无需编写后端代码。

## 安全

- 插件包仅包含前端 JS，**不执行后端代码**（沙箱化运行）
- 插件数据隔离在 `user-data/plugins-data/<pluginKey>/`，与主业务数据分离
- 卸载插件仅删除插件文件，**保留数据**，重新安装即可恢复
