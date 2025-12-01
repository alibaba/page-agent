# 国际化配置说明

本项目使用 `react-i18next` 实现国际化支持。

## 目录结构

```
pages/i18n/
├── config.ts              # i18next 配置和初始化
├── types.ts               # TypeScript 类型声明
├── locales/
│   ├── zh-CN/             # 中文翻译
│   │   ├── common.json    # 通用组件（Header, Footer等）
│   │   ├── home.json      # 首页
│   │   └── docs.json      # 文档页（待完善）
│   └── en-US/             # 英文翻译
│       ├── common.json
│       ├── home.json
│       └── docs.json
└── README.md              # 本文件
```

## 使用方法

### 在组件中使用

```tsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation('common') // 指定命名空间
  
  return <h1>{t('header.nav_docs')}</h1>
}
```

### 使用多个命名空间

```tsx
const { t } = useTranslation(['home', 'common'])

// 使用时指定命名空间
t('home:hero.title')
t('common:header.nav_docs')
```

## 语言切换

用户可以通过以下方式切换语言：

1. **自动检测**：首次访问根据浏览器语言自动选择
2. **手动切换**：点击页面右上角的语言切换按钮
3. **持久化**：语言选择保存在 `localStorage` 中，刷新后保持

## 添加新翻译

1. 在对应的 JSON 文件中添加翻译条目（如 `zh-CN/home.json`）
2. 在对应的英文文件中添加翻译（如 `en-US/home.json`）
3. 在组件中使用 `t('namespace:key')` 获取翻译

## TypeScript 支持

`types.ts` 文件提供了类型声明，使得翻译 key 具有：

- 自动补全
- 编译期类型检查
- 防止拼写错误

## 待完成

- [ ] 文档页翻译（`docs.json`）
- [ ] DocsLayout 导航结构国际化
- [ ] 404 页面国际化

