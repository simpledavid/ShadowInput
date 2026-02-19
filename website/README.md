# ShadowInput 官网部署（Cloudflare）

本目录是静态官网，提供插件下载入口：`/downloads/shadowinput-extension.zip`。

## 1) 生成插件 ZIP

在仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_extension_zip.ps1
```

生成结果：

- `website/downloads/shadowinput-extension.zip`

## 2) 部署到 Cloudflare Pages（项目名：shadowinput）

```powershell
npm install -g wrangler
wrangler login
wrangler pages deploy .\website --project-name shadowinput
```

首次部署如果项目不存在，Cloudflare 会自动创建同名 Pages 项目。

## 3) 后续更新流程

每次发布新版本时，重复以下两步：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_extension_zip.ps1
wrangler pages deploy .\website --project-name shadowinput
```
