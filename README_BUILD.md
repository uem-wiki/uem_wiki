# 应大Wiki 模板系统使用说明

## 简介

本模板系统可以将Markdown文件自动转换为带有完整模板的HTML文件。修改MD文件后，只需运行一个脚本即可自动更新对应的HTML文件。

## 安装

无需安装额外依赖，Python标准库即可运行。

## 使用方法

### 1. 构建所有文件

```bash
python build_wiki.py
```

### 2. 强制重新构建所有文件

```bash
python build_wiki.py --force
```

### 3. 构建单个文件

```bash
python build_wiki.py docs/校园生活/恋爱.md
```

### 4. 监听文件变化（自动构建）

```bash
python build_wiki.py --watch
```

## 文件结构

```
uem_wiki/
├── templates/
│   └── base.html          # HTML模板文件
├── assets/
│   ├── theme.css          # 全站唯一配色变量
│   ├── site.css           # 全站公共样式
│   ├── site.js            # 导航、搜索、目录、评论与客户端路由
│   ├── search-index.json  # 自动生成的搜索索引
│   ├── recent-updates.json # 自动生成的 GitHub Deployments
│   └── vendor/            # 本地托管的 Twikoo 客户端
├── docs/
│   ├── 校园生活/
│   │   ├── 恋爱.md        # Markdown源文件
│   │   └── 恋爱.html      # 生成的HTML文件
│   └── ...
├── build_wiki.py          # 构建脚本
├── navigation.json        # 统一侧边栏配置
└── .build_cache.json      # 构建缓存（自动生成）
```

## 模板变量

基础模板中使用以下变量：

- `{{title}}` - 页面标题
- `{{content}}` - 文章内容（HTML格式）
- `{{page_style}}` - 页面专属样式
- `{{page_scripts}}` - 页面专属脚本

## 添加新文章

1. 在 `docs/` 目录下创建新的 `.md` 文件
2. 运行 `python build_wiki.py` 或 `python build_wiki.py 新文件.md`
3. 对应的 `.html` 文件会自动生成

## 侧边栏管理

侧边栏统一维护在根目录的 `navigation.json` 中。构建器负责校验配置中的
目标页面，浏览器加载 `assets/site.js` 后再从该文件渲染侧边栏。因此生成
HTML 不重复包含几十条导航路径，切换页面时侧边栏也不会重新加载。

## 搜索功能

搜索数据由 `build_wiki.py` 中的 `build_search_entries()` 生成，并写入
`assets/search-index.json`。新增需要被搜索的页面时，将页面加入该列表。

## 客户端导航

`assets/site.js` 会在页面加载时注入主页同款顶部导航，并读取
`navigation.json` 生成左侧侧边栏。两套导航都只保留空容器，不写入生成
HTML；切换页面时它们不会重新创建。`site.js` 会拦截站内页面链接，仅替换
`#page-content`，同时更新标题、
侧边栏高亮、目录和评论区。路由会维护父级历史，使浏览器后退回到目录
父级；同一目录下的文章切换使用 `replaceState`，不会反复堆积历史记录。

## 路径规范

Markdown 和 HTML 源文件可以继续使用相对路径。构建器会为每个页面计算
最终位置，并将正文里的本地 `href`、`src` 转换为 `/docs/...` 或 `/...`
根路径，因此生成 HTML 不包含 `../`，也不需要运行页面主动计算目录深度。

## 最近更新

首页的“最近更新”从 `assets/recent-updates.json` 渲染。`update_recent.py`
会读取当前 Git 仓库的 GitHub Deployments、部署状态和对应提交信息，再写入
该 JSON。最近更新文件在 10 分钟内视为有效，不会重复请求 GitHub。
`serve.py` 的刷新在后台进行，不会阻塞服务器启动；网络不可用时保留现有文件。

手动刷新：

```bash
python update_recent.py
```

离线构建时可跳过网络请求：

```bash
python build_wiki.py --skip-recent
```

忽略缓存并立即刷新：

```bash
python build_wiki.py --update-recent
```

默认仓库为 `uem_wiki/uem_wiki`。本地同时存在 `upstream` 远程时会优先使用
`upstream`，否则依次读取 GitHub Actions 仓库环境变量和 `origin`。也可以
显式指定：

```bash
python update_recent.py --repo owner/repository
```

GitHub Token 可通过 `GITHUB_TOKEN` 或 `GH_TOKEN` 提供，无令牌时仍可读取
公开仓库的部署记录。

## 评论

评论区使用本地 `assets/vendor/twikoo.min.js` 和 `twikoo.css`，当前版本为 `1.7.15`，
与线上 Twikoo 云函数版本保持一致。评论数据由外部 Twikoo 云函数和数据库
保存，不存放在本仓库；更换环境或数据库后，历史评论需要在 Twikoo 后台恢复。

评论资源会在评论区接近视口时才加载，并缓存同一版本的 CSS 与脚本，避免
首屏下载约 1 MB 的 Twikoo 资源。

Twikoo 的评论键沿用旧站规则：板块首页会将 `/index.html` 去掉，使用
百分号编码后的目录路径，例如 `/docs/%E5%86%99%E5%9C%A8%E5%89%8D%E9%9D%A2/`；
普通文章仍使用对应的 `.html` 路径。

## 配色规范

所有颜色、阴影、遮罩和浅色背景统一定义在 `assets/theme.css`。
页面 CSS、专属样式和内联样式只能使用 `var(--color-*)` 或旧变量别名，
不得直接写十六进制、RGB 或颜色名称。

## 增量构建

构建脚本支持增量构建，Markdown 和无同名源的 HTML 页面都会记录哈希。
只有源文件、模板、导航或构建脚本发生变化时才重新构建。构建缓存保存在
`.build_cache.json` 文件中。

## 示例

### 创建新文章

```bash
# 创建MD文件
echo "# 我的新文章

这是文章内容。

## 第一节

这是第一节内容。

## 第二节

这是第二节内容。
" > docs/校园生活/新文章.md

# 构建HTML文件
python build_wiki.py docs/校园生活/新文章.md
```

### 批量构建

```bash
# 构建所有文件
python build_wiki.py --force

# 或者只构建变化的文件
python build_wiki.py
```

## 注意事项

1. 确保Python 3.7+已安装
2. 模板文件位于 `templates/base.html`
3. 侧边栏结构统一维护在 `navigation.json`
4. 搜索数据列表需要同步更新

## 故障排除

### 问题：构建失败

检查MD文件格式是否正确，确保没有语法错误。

### 问题：HTML文件没有更新

使用 `--force` 参数强制重新构建所有文件。

### 问题：侧边栏不正确

检查 `navigation.json` 中的路径是否正确，以及目标页面或 Markdown 源是否存在。
