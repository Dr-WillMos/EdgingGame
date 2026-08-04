# 寸止挑战 · Edging Challenge

> **NSFW / 18+**：本项目包含成人内容，仅适用于 18 岁及以上用户。

**在线体验**：<https://edge.willmo.top>

一款纯前端的螺旋棋盘成人互动游戏。玩家掷骰子沿顺时针螺旋路径向中心终点前进，途经寸止、节拍器、命运抽卡等事件格，在沉浸式全屏媒体体验中完成挑战。所有数据存储在浏览器本地，零后端依赖，构建产物为纯静态文件。

---

## 技术栈

| 层面 | 选型 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| 状态管理 | Zustand |
| 动画 | Framer Motion |
| 样式 | Tailwind CSS 3 |
| 音频 | Web Audio API（实时合成，无外部音频文件） |
| 本地存储 | IndexedDB（媒体文件） + localStorage（存档/设置） |

---

## 快速开始

```bash
npm install              # 安装依赖
npm run dev              # 开发服务器 → http://localhost:3000
npm run dev -- --host    # 局域网访问（手机/平板测试）
npm run build            # 构建生产版本 → dist/
npm run preview          # 预览构建产物
```

环境要求：Node.js 18+，npm 或 pnpm。

---

## 游戏玩法

从棋盘左上角起点出发，掷骰子沿顺时针螺旋路径向中心终点前进。每次移动后触发当前格子的事件，完成后继续掷骰，直到抵达中心终点触发通关高潮庆祝。

### 地块类型

| 地块 | 标签 | 效果 |
|------|------|------|
| 起点 | 起 | 游戏起始位置 |
| 终点 | 终 | 到达后触发通关高潮庆祝 + 结算 |
| 寸止 | 寸 | 倒计时 + 呼吸引导圆环，需保持冷静 |
| 慢速 | 慢 | 60 BPM 节拍器，完成 30 次跟随 |
| 中速 | 中 | 100 BPM 节拍器，完成 40 次跟随 |
| 快速 | 快 | 140 BPM 节拍器，完成 50 次跟随 |
| 润滑 | 润 | 恢复 1 点能量 |
| 箭头 | 箭 | 随机前进 1-3 格或后退 1-2 格 |
| 命运 | 运 | 随机抽取命运卡，奖励或惩罚 |

### 道具系统

| 道具 | 图标 | 效果 |
|------|------|------|
| 冷静卡 | 🛡️ | 免除当前格子任务，直接跳过 |
| 重掷卡 | 🎲 | 对骰子点数不满意时重新掷一次 |
| 精准控制 | 🎯 | 消耗 1 点能量，自选 1-3 步前进 |

### 命运卡池

共 21 张命运卡（12 张好运 / 9 张惩罚），按权重随机抽取：

- **好运卡**：前进、获得道具、恢复能量、骰子保底、再抽一次
- **惩罚卡**：原地寸止、寸止加时、丢失道具、能量清零、骰子诅咒、倒退

### 通关称号

根据通关时的寸止次数授予专属称号：秒杀级选手（0 次）→ 绝对掌控者（1-5 次）→ 寸止界魔导师（6-12 次）→ 极限修行者（12+ 次）。

---

## 通关高潮庆祝

到达终点格后触发专属庆祝场景，分为三个阶段：

| 阶段 | 时长 | 效果 |
|------|------|------|
| 蓄势 | 4 秒 | 媒体逐渐放大提亮，顶部进度条从蓝向红渐变，中心显示倒计时数字（4→3→2→1），脉冲暗角递增加速，配合频率持续上升的扫频音效。最后 1 秒全屏红色脉冲遮罩 + "准备释放"文字提示 |
| 释放 | 3 秒 | 白色闪光 + 80 颗粒子爆发 + 双层光环扩散，显示"释放"，配合低频冲击 + 白噪声 burst + C 大调和弦 |
| 余韵 | 4 秒 | 温暖光晕，显示"完美的终点" + 简要统计（寸止/撸动/最高连击），配合长尾余韵音 |

蓄势阶段的倒计时使用 `requestAnimationFrame` 驱动，通过 ref 比对上次渲染值避免不必要的重渲染。阶段推进仍由 `setTimeout` 链控制，倒计时仅为视觉增强，不影响阶段切换时机。庆祝结束后显示"查看战绩"按钮，点击进入结算面板。

---

## 媒体素材系统

### 素材分类

游戏使用两套独立的素材库：

| 分类 | 使用场景 | 存储位置 |
|------|----------|----------|
| 常规素材 | 踩中寸止/慢速/中速/快速格时全屏播放 | IndexedDB `files` 存储区 |
| 高潮素材 | 到达终点触发通关庆祝时专属展示 | IndexedDB `climax_files` 存储区 |

两套素材库完全独立，互不影响。高潮素材为空时，通关场景会自动回退到常规素材池。

### 媒体来源

常规素材支持三种来源模式，在设置中切换：

| 模式 | 说明 |
|------|------|
| 仅自定义 | 只使用用户上传的素材（默认） |
| 混合 | 内置素材 + 用户上传素材 |
| 仅内置 | 只使用 `public/media/` 中的素材 |

### 添加内置素材

将图片或视频文件放入 `public/media/` 目录，启动开发服务器或构建时会自动扫描并生成清单（`src/config/builtinMediaManifest.ts`）。支持格式：JPG、PNG、GIF、WEBP、MP4、WEBM。

### 上传自定义素材

进入「设置」→「素材管理」，支持拖拽上传或点击选择。上传的文件存储在浏览器 IndexedDB 中，刷新页面后不会丢失，支持预览、单个删除、一键清空。高潮素材在「设置」→「高潮素材（通关专属）」中单独上传。

### 播放机制

- **双层交叉淡入**：A/B 两个层永远存在，通过 opacity 过渡实现无缝切换，避免黑屏闪烁
- **时间片轮转**：每个素材播放固定时长（默认 5 秒，可在设置中调整 1-60 秒）后自动切换
- **视频控制**：切换时暂停不可见层视频，可见层从头播放，防止音频重叠
- **预加载**：游戏开始时预热 3 张素材到浏览器缓存，减少首次加载等待

---

## 设置项

| 分类 | 可调参数 |
|------|----------|
| 寸止 | 倒计时秒数 |
| 节拍器 | 慢/中/快速 BPM 与总次数 |
| 地图 | 棋盘边长（影响路径总格数） |
| 地块权重 | 各类地块出现概率 |
| 道具与能量 | 初始道具数量、初始/最大能量 |
| 音效与媒体 | 音效开关、媒体开关、媒体来源、切换间隔、BPM 同步效果 |
| 素材管理 | 上传/预览/删除常规素材 |
| 高潮素材 | 上传/预览/删除通关专属素材 |

所有设置项实时生效，无需重启。

---

## 项目结构

```
src/
├── components/
│   ├── AgeGate.tsx           # 18+ 年龄验证弹窗
│   ├── BPMMetronome.tsx      # BPM 节拍器（自动跟随，无需操作）
│   ├── BreathingCircle.tsx   # 寸止呼吸引导圆环
│   ├── ChanceCardDisplay.tsx # 命运卡翻转动画
│   ├── ClimaxScene.tsx       # 通关高潮庆祝场景（三阶段动画 + 倒计时引导）
│   ├── Dice.tsx              # 骰子动画
│   ├── DiceArea.tsx          # 骰子操作面板
│   ├── ErrorBoundary.tsx     # 全局错误边界
│   ├── EventModal.tsx        # 格子事件弹窗（沉浸式/卡片式）
│   ├── GameBoard.tsx         # 螺旋棋盘渲染
│   ├── Inventory.tsx         # 道具栏与能量条
│   ├── MediaPlayer.tsx       # 双层无缝媒体播放器
│   ├── MediaUploader.tsx     # 自定义素材上传与管理（常规+高潮）
│   ├── PlayerToken.tsx       # 玩家棋子动画
│   ├── SettingsScreen.tsx    # 游戏设置界面
│   └── StatsModal.tsx        # 通关结算看板
├── config/
│   ├── builtinMediaManifest.ts # 内置素材清单（自动生成，勿手动编辑）
│   ├── itemsConfig.ts        # 道具与命运卡配置
│   ├── mapData.ts            # 棋盘配置与地块生成
│   └── mediaConfig.ts        # 媒体池管理与随机抽取
├── store/
│   ├── useGameStore.ts       # 游戏核心状态（位置/骰子/事件/存档）
│   └── useSettingsStore.ts   # 游戏设置状态
├── types/
│   └── index.ts              # 全局 TypeScript 类型定义
├── utils/
│   ├── mediaDB.ts            # IndexedDB 封装（双存储区）
│   ├── pathFinder.ts         # 螺旋路径生成器（带缓存）
│   └── soundEngine.ts        # Web Audio 音效合成器
├── App.tsx                   # 主应用组件
├── index.css                 # 全局样式
└── main.tsx                  # 入口
```

---

## 游戏架构

### 状态管理

游戏状态分为两个 Zustand store：`useGameStore` 管理运行时状态（玩家位置、骰子、事件、统计、存档），`useSettingsStore` 管理所有可调参数。组件通过精细化选择器（selector）订阅所需字段，避免不必要的重渲染。

### 螺旋路径生成

`pathFinder.ts` 使用方向向量法生成 NxN 矩阵的顺时针螺旋路径，结果按棋盘大小缓存。支持任意奇数边长的棋盘（7x7、9x9、11x11 等）。

### 音效引擎

`soundEngine.ts` 基于 Web Audio API 实时合成所有音效，无需外部音频文件：骰子滚动/落地、棋子移动、寸止触发、倒计时心跳（频率随剩余时间加快）、BPM 节拍器（强拍/弱拍区分）、环境氛围音（双振荡器 + LFO 调制 + 低通滤波）、高潮蓄势/释放音效、胜利旋律、道具使用、错误提示。音效总开关关闭时，所有音效静默，包括视频音轨。

### 存档系统

使用 localStorage 持久化玩家位置、统计、地图配置，存档包含版本号支持未来向后兼容。存储空间不足或 localStorage 被禁用时自动降级不崩溃，支持从开始界面「继续上次游戏」恢复进度。

### 年龄验证

首次进入时显示 18+ 内容警告弹窗，用户确认后写入 localStorage，后续访问不再弹出。

---

## 部署

本项目已通过 GitHub Actions 自动部署至 GitHub Pages，绑定自定义域名 **edge.willmo.top**。每次推送到 `main` 分支即触发自动构建与部署（见 `.github/workflows/deploy.yml`）。

如需自行部署，构建产物为纯静态文件：

```bash
npm run build    # 产物在 dist/ 目录
```

可部署到任意静态托管平台：

- **GitHub Pages** — 免费，已配置 CI/CD 自动部署
- **Cloudflare Pages** — 免费、快速，策略相对宽松
- **Vercel / Netlify** — 免费 tier，NSFW 内容需查看各自政策
- **自建 VPS** — 完全自主控制，推荐 Hetzner、Vultr 等

部署时无需配置服务端，所有功能均在浏览器端运行。

---

## 开发说明

### 添加新地块类型

1. 在 `src/types/index.ts` 的 `TileType` 中添加新类型
2. 在 `src/config/mapData.ts` 的 `TILE_STYLES` 中添加配色方案
3. 在 `DEFAULT_TILE_WEIGHTS` 中添加权重
4. 在 `useGameStore.ts` 的 `triggerTileEvent` 中添加事件处理逻辑

### 添加新命运卡

在 `src/config/itemsConfig.ts` 的 `CHANCE_CARDS` 数组中添加卡片配置即可，无需修改其他文件：

```typescript
{
  id: 'unique_id',
  title: '卡片标题',
  description: '卡片描述',
  effect: 'MOVE_FORWARD',  // 使用已有的 ChanceEffect 类型
  value: 3,
  isPositive: true,
  weight: 2,
}
```

### 添加新道具

1. 在 `src/types/index.ts` 的 `ItemType` 中添加类型
2. 在 `src/config/itemsConfig.ts` 的 `ITEMS_CONFIG` 中添加配置
3. 在 `useGameStore.ts` 的 `useItem` 中添加使用逻辑
4. 在 `Inventory.tsx` 的 `ITEM_ICONS` 中添加图标映射

### 内置素材清单生成

`scripts/generate-media-manifest.js` 会在 `npm run dev` 和 `npm run build` 前自动执行，扫描 `public/media/` 目录并生成 `src/config/builtinMediaManifest.ts`。不要手动编辑该文件。

---

## 浏览器兼容

- Chrome / Edge 90+（推荐）
- Firefox 88+
- Safari 14+
- 移动端 Chrome / Safari（支持触摸操作）

需要支持 IndexedDB、Web Audio API、localStorage。隐私模式下部分功能会自动降级。

---

## License

[MIT](LICENSE)
