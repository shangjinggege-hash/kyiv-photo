# 基辅约拍

面向基辅中文用户的摄影服务预订与价格计算器。项目使用纯 HTML、CSS 和 Vanilla JavaScript，无需后端或构建工具，可直接部署到 GitHub Pages。

## 本地预览

```bash
python3 -m http.server 4173
```

访问 `http://localhost:4173/`。

## 测试

```bash
node --test tests/pricing.test.js
node --check app.js
node --check pricing.js
```

价格配置集中在 `pricing.js` 的 `PRICING` 对象中。

## GitHub Pages

在仓库设置中选择：Settings → Pages → Deploy from a branch → `main` → `/ (root)`。
