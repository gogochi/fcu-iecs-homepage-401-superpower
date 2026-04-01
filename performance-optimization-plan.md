# Performance 修正計畫

> **專案**：逢甲大學資訊工程學系首頁 (`http://127.0.0.1:5500/index.html`)
> **報告日期**：2026-03-18
> **Lighthouse 版本**：13.0.2
> **目前 Performance 分數**：97 → **目標**：99-100

---

## 當前指標總覽

| 指標 | 數值 | 分數 | 狀態 |
|------|------|------|------|
| FCP (First Contentful Paint) | 0.5s | 1.0 | ✅ |
| **LCP (Largest Contentful Paint)** | **1.2s** | **0.89** | **⚠️ 主要扣分項** |
| TBT (Total Blocking Time) | 0ms | 1.0 | ✅ |
| CLS (Cumulative Layout Shift) | 0.002 | 1.0 | ✅ |
| SI (Speed Index) | 0.5s | 1.0 | ✅ |
| TTI (Time to Interactive) | 1.3s | 1.0 | ✅ |

---

## 🔴 優先級 1：圖片優化（影響最大，LCP 可省 350ms）

**問題**：圖片過大、未使用現代格式，是拖慢 LCP 的最大原因

| 圖片 | 原始尺寸 | 顯示尺寸 | 可節省 |
|------|----------|----------|--------|
| `912908.jpg` | 1336x470 | 410x144 | 169 KiB |
| `957454_6FzlON4.jpg` | 1336x470 | 410x144 | 141 KiB |
| `2026年申請轉入.png` | 1336x470 | 630x222 | 118 KiB |
| `video/2.jpg` | 1516x769 | 360x203 | 107 KiB |
| `IMG_20240519_205715.jpg` | 1336x470 | 630x222 | 97 KiB |

### 1a. LCP 圖片加上 `fetchpriority="high"`

LCP 元素是 carousel 第一張圖片（`index.html:245`），缺少優先載入提示。

```html
<!-- 修改前 (index.html:245) -->
<img src="./media/img/news/banner/..." class="d-block w-100" alt="...">

<!-- 修改後 -->
<img src="./media/img/news/banner/..." class="d-block w-100" alt="..."
     fetchpriority="high" decoding="sync">
```

### 1b. 將圖片轉換為 WebP/AVIF 格式

所有 banner 圖片（1336x470）在實際顯示時遠小於原始尺寸，且仍為 JPG 格式。

```bash
# 使用 cwebp 批次轉換，同時縮小到實際需要的尺寸
# carousel 圖片：實際顯示 1290x454
cwebp -q 80 -resize 1290 454 input.jpg -o output.webp

# 卡片圖片：實際顯示 410x144 或 630x222
cwebp -q 80 -resize 630 222 input.jpg -o output.webp
```

### 1c. 使用 `<picture>` 提供多種格式

```html
<picture>
  <source type="image/webp" srcset="./media/img/news/banner/912908.webp">
  <img src="./media/img/news/banner/912908.jpg" class="d-block w-100"
       width="1336" height="470" alt="描述文字">
</picture>
```

### 1d. 為所有 `<img>` 加上 `width` 和 `height`

目前所有 card 圖片和 carousel 圖片都缺少明確的寬高屬性（`index.html:245-450` 區域）。

```html
<img src="..." class="d-block w-100" alt="..." width="1336" height="470">
```

### 1e. 非首屏圖片加上 `loading="lazy"`

Carousel 第一張以外的所有圖片、影片縮圖、新聞卡片圖片：

```html
<img src="..." loading="lazy" decoding="async" width="1336" height="470" alt="...">
```

**預估效果**：LCP 改善 350ms，總流量減少 817 KiB

---

## 🔴 優先級 2：消除 Render-Blocking 資源（FCP 可省 200ms）

**問題**：3 個 CSS 檔案阻擋了首次渲染（`index.html:23-28`）

| 資源 | 大小 | 阻擋時間 |
|------|------|----------|
| `bootstrap@5.3.2/dist/css/bootstrap.min.css` | 28 KiB | 271ms |
| `swiper@11/swiper-bundle.min.css` | 5.6 KiB | - |
| `web_style.06c823a0884b.css` | 19.8 KiB | - |

### 2a. 內嵌關鍵 CSS（Critical CSS）

將首屏必要的 CSS 直接內嵌到 `<head>` 中：

```html
<head>
  <style>
    /* 只放首屏需要的 navbar + carousel 樣式 */
    .navbar { ... }
    .carousel-item img { width:100%; height:auto; }
    /* 約 2-3 KiB */
  </style>

  <!-- 非同步載入完整 CSS -->
  <link rel="preload" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
        as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  </noscript>
</head>
```

### 2b. Swiper CSS 延遲載入

Swiper 不在首屏，可以非同步載入（`index.html:28`）：

```html
<link rel="preload" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"
      as="style" onload="this.onload=null;this.rel='stylesheet'">
```

### 2c. 預連接 CDN 來源

在 `<head>` 最前面加上：

```html
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
```

**預估效果**：FCP 改善 200ms，LCP 間接改善

---

## 🟡 優先級 3：CSS 優化（LCP 可省 50ms）

**問題**：`web_style.06c823a0884b.css` 未壓縮且有 74% 未使用

### 3a. Minify CSS

```bash
# 使用 cssnano 或 clean-css
npx clean-css-cli -o web_style.min.css web_style.06c823a0884b.css
```

預估節省 5 KiB（23.7% 壓縮率）

### 3b. 移除未使用的 CSS

`web_style.06c823a0884b.css` 有 74% 未被使用（14 KiB 可節省）。其中包含 `about`、`course_plan`、`feedback`、`history` 等其他頁面的樣式。建議：

- 將各頁面專屬樣式拆分到獨立檔案
- 或使用 PurgeCSS 清除首頁未使用的 CSS

```bash
# 使用 PurgeCSS
npx purgecss --css static/css/web_style.06c823a0884b.css --content index.html --output static/css/
```

**預估效果**：LCP 改善 50ms，流量減少 19 KiB

---

## 🟡 優先級 4：文件壓縮（Document Latency）

**問題**：HTML 文件（40 KiB）未啟用 gzip/brotli 壓縮

**修正方案**：在 Web Server 配置壓縮。正式部署時確保 nginx/Apache 啟用：

```nginx
# Nginx 設定
gzip on;
gzip_types text/html text/css application/javascript image/svg+xml;
gzip_min_length 256;
```

```apache
# Apache 設定
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml
</IfModule>
```

**預估效果**：文件大小從 40 KiB 降至約 10 KiB

---

## 🟡 優先級 5：Font Display 優化

**問題**：Font Awesome 字體缺少 `font-display: swap`，字體檔過大

### 5a. 將 Font Awesome CSS 改為非同步載入

目前 Font Awesome CSS 在 `</body>` 前面才載入（`index.html:829`）：

```html
<link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      as="style" onload="this.onload=null;this.rel='stylesheet'">
```

### 5b. 只載入需要的 Font Awesome 圖標

目前載入完整的 `all.min.css`，包含：
- `fa-solid-900.woff2`：157 KiB
- `fa-brands-400.woff2`：118 KiB
- **合計 275 KiB 字體檔**

實際只用了 5 個圖標：`fa-bars`、`fa-chevron-down`、`fa-globe-americas`、`fa-facebook-f`、`fa-map-marker-alt`

建議改用 SVG 圖標取代：

```html
<!-- 用 SVG inline 取代 Font Awesome，節省 275 KiB -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16">
  <path d="M0 96C0 78.3 14.3 64 32 64H416c17.7..."/>
</svg>
```

**預估效果**：流量減少 275 KiB，消除 font-display 問題

---

## 🟢 優先級 6：其他優化

### 6a. bf-cache（Back/Forward Cache）

**問題**：頁面被阻止進入 bfcache

**修正**：檢查是否有 `unload` 事件監聽器，改用 `pagehide`：

```javascript
// 修改前
window.addEventListener('unload', handler);

// 修改後
window.addEventListener('pagehide', handler);
```

### 6b. Cache Headers

**問題**：靜態資源快取效期不佳

**修正**：對帶 hash 的檔案設定長期快取：

```nginx
# 帶 hash 的靜態資源（如 web_style.06c823a0884b.css）
location ~* \.[a-f0-9]{12}\.(css|js|svg|ico|png)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

### 6c. Network Dependency Tree

**問題**：關鍵請求鏈存在

**修正**：用 `<link rel="preload">` 預載 LCP 圖片，打破依賴鏈：

```html
<link rel="preload" as="image" fetchpriority="high"
      href="./media/img/news/banner/附件二_申請入學書面資料審查準備指引首頁大圖底圖樣式113年新版樣式.jpg...">
```

---

## 預估修正後效果

| 修正項 | LCP 改善 | FCP 改善 | 流量節省 |
|--------|----------|----------|----------|
| 圖片 WebP + 縮放 | -350ms | - | -817 KiB |
| fetchpriority=high | -50~100ms | - | - |
| 消除 render-blocking | - | -200ms | - |
| CSS minify + purge | -50ms | - | -19 KiB |
| Font Awesome SVG 替代 | - | - | -275 KiB |
| gzip 壓縮 | - | -20ms | -30 KiB |
| **合計** | **~450ms** | **~220ms** | **~1,141 KiB** |

**預期最終結果**：
- Performance 分數：**99-100**
- LCP：從 1.2s 降至 **~0.8s**
- 總頁面大小：從 4,069 KiB 降至 **~2,928 KiB**

---

## 修正順序建議

1. ✅ 先做 1a（加 `fetchpriority="high"`）— 改一行 HTML 即見效
2. ✅ 再做 2c（加 `preconnect`）— 改兩行 HTML
3. ✅ 做 1d（加 `width`/`height`）— 改 HTML 屬性
4. ✅ 做 1e（加 `loading="lazy"`）— 改 HTML 屬性
5. ✅ 做 1b/1c（圖片轉 WebP + `<picture>`）— 所有圖片已轉換並使用 `<picture>` 標籤
6. ✅ 做 2a/2b（Critical CSS + 非同步載入）— Bootstrap CSS 改為 preload async，關鍵 CSS 已內嵌到 `<style>`
7. ✅ 做 3a/3b（CSS minify + purge）— 建立 `web_style.index.min.css`，移除 74% 非首頁樣式（15.3→7.2 KiB）
8. ✅ 做 5b（Font Awesome 替換為 SVG）— 7 個圖標全部替換為 inline SVG（節省 ~275 KiB）
9. ✅ 做其他伺服器端設定（gzip、brotli、cache headers、bfcache）— 設定文件已更新
