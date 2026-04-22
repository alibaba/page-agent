# Action Interceptor 使用指南

## 概述

`actionInterceptor` 是一个强大的拦截器机制，允许您在任何工具执行前添加自定义逻辑。您可以：

- ✅ **拦截特定操作**（如点击、输入等）
- ✅ **显示确认对话框**
- ✅ **记录操作日志**
- ✅ **修改或阻止操作执行**
- ✅ **添加安全检查**

这是一个**代码级别的强制控制机制**，比通过 prompt 指导更可靠。

## 基本用法

### 1. 简单拦截所有点击操作

```typescript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
  apiKey: '',
  baseURL: '',
  model: 'qwen3.5-plus',
  language: 'zh-CN',
  
  // 添加拦截器
  async actionInterceptor(action, next) {
    console.log('即将执行操作:', action.name)
    
    // 继续执行原操作
    return next()
  }
})
```

### 2. 拦截危险操作并确认

```typescript
const agent = new PageAgent({
  // ... 其他配置
  
  async actionInterceptor(action, next) {
    // 只拦截点击动作
    if (action.name !== 'click_element_by_index') {
      return next()
    }

    // 获取元素索引
    const index = action.input.index
    
    // 从 pageController 获取元素文本
    const elementText = await this.pageController.getElementText(index)
    
    // 检查是否是危险操作
    const dangerWords = /保存|提交|删除|移除|清空|确认|下单|支付|审批|驳回/
    
    if (elementText && dangerWords.test(elementText)) {
      const userConfirmed = confirm(`⚠️ 确定要执行【${elementText}】操作吗？`)
      if (!userConfirmed) {
        return false // 取消执行
      }
    }

    // 允许执行
    return next()
  }
})
```

### 3. 完整的智能拦截示例

```typescript
const agent = new PageAgent({
  model: 'qwen3.5-plus',
  language: 'zh-CN',
  
  async actionInterceptor(action, next) {
    // ======================
    // 1. 只拦截点击动作
    // ======================
    if (action.name !== 'click_element_by_index') {
      return next()
    }

    try {
      // 获取元素索引
      const index = action.input.index
      
      // 从 pageController 获取元素文本
      const elementText = await this.pageController.getElementText(index)
      
      if (!elementText) {
        return next() // 没有文本，直接放行
      }

      // ======================
      // 2. 需要确认的高危操作关键词
      // ======================
      const needConfirmWords = /保存|提交|删除|移除|清空|确认|下单|支付|审批|驳回/
      const isDangerAction = needConfirmWords.test(elementText)

      // ======================
      // 3. 例外：查询、搜索、刷新 不需要确认
      // ======================
      const excludeWords = /查询|搜索|刷新|重置|筛选/
      const isSafeAction = excludeWords.test(elementText)

      // ======================
      // 4. 高危 + 不是安全操作 → 弹出确认
      // ======================
      if (isDangerAction && !isSafeAction) {
        const userConfirmed = confirm(`⚠️ 确定要执行【${elementText}】操作吗？`)
        if (!userConfirmed) {
          console.log('❌ 用户取消了操作')
          return false // 取消执行
        }
        console.log('✅ 用户确认了操作')
      }

      // ======================
      // 5. 允许执行
      // ======================
      return next()
      
    } catch (error) {
      console.error('拦截器错误:', error)
      // 出错时默认允许执行，避免阻塞正常流程
      return next()
    }
  }
})
```

## 参数说明

### `actionInterceptor(action, next)`

#### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `action` | `{ name: string; input: any }` | 当前要执行的动作 |
| `action.name` | `string` | 工具名称，如 `click_element_by_index`, `input_text` 等 |
| `action.input` | `any` | 工具的输入参数 |
| `next` | `() => Promise<any>` | 继续执行原操作的函数 |

#### 返回值

| 返回值 | 含义 |
|--------|------|
| `false` | **取消执行**，操作不会被执行 |
| `true` 或 `undefined` | **继续执行**，调用 `next()` 执行原操作 |
| `Promise<boolean \| undefined>` | 支持异步判断 |

## 可用的工具名称

以下是可以被拦截的工具名称：

| 工具名称 | 说明 |
|---------|------|
| `click_element_by_index` | 点击元素 |
| `input_text` | 输入文本 |
| `select_dropdown_option` | 选择下拉选项 |
| `scroll` | 滚动页面 |
| `wait` | 等待 |
| `ask_user` | 询问用户 |
| `done` | 完成任务 |
| `execute_javascript` | 执行 JavaScript |

## PageController 辅助方法

### `getElementText(index: number): Promise<string | undefined>`

获取指定索引元素的文本内容。

```typescript
const text = await this.pageController.getElementText(42)
console.log('Element text:', text)
```

### `getElementInfo(index: number): Promise<{ text?: string; element?: HTMLElement } | undefined>`

获取指定索引元素的详细信息。

```typescript
const info = await this.pageController.getElementInfo(42)
console.log('Text:', info?.text)
console.log('Element:', info?.element)
```

## 高级用法

### 1. 记录所有操作日志

```typescript
async actionInterceptor(action, next) {
  // 记录操作日志
  console.log('[Action Log]', {
    timestamp: new Date().toISOString(),
    tool: action.name,
    input: action.input
  })
  
  // 发送到服务器
  fetch('/api/action-log', {
    method: 'POST',
    body: JSON.stringify({
      tool: action.name,
      input: action.input,
      timestamp: Date.now()
    })
  })
  
  return next()
}
```

### 2. 限制某些操作的频率

```typescript
const clickCount = new Map<string, number>()

async actionInterceptor(action, next) {
  if (action.name === 'click_element_by_index') {
    const key = String(action.input.index)
    const count = clickCount.get(key) || 0
    
    if (count >= 3) {
      console.warn(`元素 ${key} 已点击 ${count} 次，阻止再次点击`)
      return false
    }
    
    clickCount.set(key, count + 1)
  }
  
  return next()
}
```

### 3. 根据页面 URL 决定是否拦截

```typescript
async actionInterceptor(action, next) {
  const currentUrl = window.location.href
  
  // 在支付页面拦截所有点击
  if (currentUrl.includes('/checkout') || currentUrl.includes('/payment')) {
    if (action.name === 'click_element_by_index') {
      const confirmed = confirm('您正在支付页面，确定要继续吗？')
      if (!confirmed) {
        return false
      }
    }
  }
  
  return next()
}
```

### 4. 结合 requireConfirmation 参数

```typescript
async actionInterceptor(action, next) {
  // 如果工具调用时已经设置了 requireConfirmation，跳过拦截
  if (action.input?.requireConfirmation) {
    return next()
  }
  
  // 否则，根据规则自动判断是否需要确认
  if (action.name === 'click_element_by_index') {
    const elementText = await this.pageController.getElementText(action.input.index)
    if (elementText && /delete|remove/i.test(elementText)) {
      const confirmed = confirm('此操作可能删除数据，是否继续？')
      if (!confirmed) return false
    }
  }
  
  return next()
}
```

## 与 requireConfirmation 参数的对比

| 特性 | `actionInterceptor` | `requireConfirmation` |
|------|-------------------|---------------------|
| **控制粒度** | 全局拦截，可针对任何工具 | 每次调用时指定 |
| **灵活性** | ⭐⭐⭐⭐⭐ 非常灵活 | ⭐⭐⭐ 中等 |
| **可靠性** | ⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐⭐ 最高 |
| **实现复杂度** | 需要编写拦截逻辑 | 只需设置参数 |
| **适用场景** | 复杂业务逻辑、审计日志 | 简单的确认需求 |

**最佳实践**：两者结合使用
- 使用 `actionInterceptor` 处理全局策略（如日志、审计）
- 使用 `requireConfirmation` 处理特定的敏感操作

## 注意事项

### ⚠️ 性能考虑

拦截器会在**每个工具执行前**被调用，请确保：

1. **避免耗时操作**：不要在拦截器中执行大量计算
2. **缓存查询结果**：如果需要查询 DOM，考虑缓存
3. **快速失败**：尽早返回，减少不必要的判断

### ⚠️ 错误处理

```typescript
async actionInterceptor(action, next) {
  try {
    // 你的逻辑
    return next()
  } catch (error) {
    console.error('Interceptor error:', error)
    // 出错时应该允许继续执行，避免阻塞
    return next()
  }
}
```

### ⚠️ 异步操作

拦截器支持异步操作，但要注意：

```typescript
// ✅ 正确：使用 async/await
async actionInterceptor(action, next) {
  const result = await someAsyncCheck()
  if (!result) return false
  return next()
}

// ❌ 错误：忘记 await
async actionInterceptor(action, next) {
  someAsyncCheck() // 没有 await，可能导致竞态条件
  return next()
}
```

## 完整示例：企业级拦截器

```typescript
class ActionSecurityInterceptor {
  private logBuffer: Array<{
    timestamp: number
    action: string
    allowed: boolean
  }> = []

  async intercept(action: { name: string; input: any }, next: () => Promise<any>) {
    const startTime = Date.now()
    let allowed = true

    try {
      // 1. 安全检查
      allowed = await this.securityCheck(action)
      if (!allowed) {
        console.warn('🚫 Security check failed')
        return false
      }

      // 2. 频率限制
      allowed = await this.rateLimitCheck(action)
      if (!allowed) {
        console.warn('⏱️ Rate limit exceeded')
        return false
      }

      // 3. 用户确认（如果需要）
      allowed = await this.userConfirmation(action)
      if (!allowed) {
        console.warn('👤 User declined')
        return false
      }

      // 4. 执行操作
      const result = await next()
      
      // 5. 记录成功日志
      this.logAction(action.name, true, Date.now() - startTime)
      
      return result
      
    } catch (error) {
      // 6. 记录失败日志
      this.logAction(action.name, false, Date.now() - startTime)
      throw error
    }
  }

  private async securityCheck(action: any): Promise<boolean> {
    // 实现安全检查逻辑
    return true
  }

  private async rateLimitCheck(action: any): Promise<boolean> {
    // 实现频率限制逻辑
    return true
  }

  private async userConfirmation(action: any): Promise<boolean> {
    // 实现用户确认逻辑
    return true
  }

  private logAction(action: string, allowed: boolean, duration: number) {
    this.logBuffer.push({
      timestamp: Date.now(),
      action,
      allowed,
    })
    
    // 定期批量发送日志
    if (this.logBuffer.length >= 10) {
      this.flushLogs()
    }
  }

  private flushLogs() {
    fetch('/api/action-logs', {
      method: 'POST',
      body: JSON.stringify(this.logBuffer)
    })
    this.logBuffer = []
  }
}

// 使用
const interceptor = new ActionSecurityInterceptor()

const agent = new PageAgent({
  // ... 配置
  actionInterceptor: (action, next) => interceptor.intercept(action, next)
})
```

## 总结

`actionInterceptor` 提供了一个**强大而灵活**的机制来控制 Agent 的行为：

✅ **完全控制**：可以拦截、修改或阻止任何操作  
✅ **高度灵活**：支持任意复杂的业务逻辑  
✅ **易于集成**：只需一个回调函数  
✅ **异步支持**：支持异步检查和确认  

结合 `requireConfirmation` 参数和 `PageController.getElementText()` 方法，可以构建一个**多层次的安全保障体系**，确保 AI Agent 的操作既智能又安全！
