# 北京单场数据中心

实时展示北京单场7种玩法的SP值数据，支持查看详情和SP历史变化趋势。

## 功能特性

- ⚽ **7种玩法支持** - 胜平负、上下盘、总进球、半全场、单场比分、下半场比分、胜负过关
- 📊 **实时数据** - 每60秒自动更新
- 📈 **历史趋势** - SP值变化折线图
- 📱 **响应式设计** - 完美适配手机和桌面
- 🎨 **现代UI** - 渐变、毛玻璃、动画效果

## 部署方式

### Cloudflare Pages（推荐）

1. Fork 本仓库
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 Pages → Create a project → Connect to Git
4. 选择本仓库，设置：
   - Build command: 留空
   - Build output directory: `/` (根目录)
5. 部署完成后会得到一个 `*.pages.dev` 域名

### Cloudflare Workers（API代理）

如果遇到CORS问题，可以部署Worker作为API代理：

```bash
# 安装 wrangler
npm install -g wrangler

# 登录
wrangler login

# 部署
wrangler deploy
```

### 本地开发

直接用浏览器打开 `index.html`，或使用本地服务器：

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```

## 配置说明

编辑 `app.js` 中的 `CONFIG.API_BASE` 修改API地址：

```javascript
const CONFIG = {
    API_BASE: 'http://你的服务器IP:8899',
    // ...
};
```

## 数据来源

数据来自北京体彩官方网站 (www.bjlot.com.cn)，仅供参考。

## 技术栈

- 原生 HTML/CSS/JavaScript
- Chart.js - 图表库
- Cloudflare Pages - 部署
- Cloudflare Workers - API代理

## 许可

MIT License
