# Cache 相关字段标准

## Anthropic Cache Fields

来源: [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)

### usage 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `input_tokens` | integer | **仅最后一个 cache breakpoint 之后的 token**，非总量 |
| `cache_creation_input_tokens` | integer | 写入新缓存的 token 数 |
| `cache_read_input_tokens` | integer | 从缓存读取的 token 数 |
| `output_tokens` | integer | 输出 token |

### 数学关系

```
total_input = input_tokens + cache_creation_input_tokens + cache_read_input_tokens
```

示例：100,000 缓存 + 50 新消息 → `cache_read: 100000, cache_creation: 0, input_tokens: 50`

全部命中缓存时 `input_tokens` 可以合法为 0。

### 流式响应

- `message_start.message.usage` 包含 input_tokens + cache 字段
- `message_delta.usage` 包含累计值

## OpenAI Cache Fields

来源: [OpenAI API Reference](https://platform.openai.com/docs/api-reference/chat/object)

### usage 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `prompt_tokens` | integer | **全部输入 token（含缓存）** |
| `completion_tokens` | integer | 输出 token |
| `total_tokens` | integer | prompt + completion |
| `prompt_tokens_details.cached_tokens` | integer | 缓存命中的 token 子集 |

### 关键差异

- **Anthropic**: `input_tokens` = 非缓存部分，需加上 cache 字段才是总量
- **OpenAI**: `prompt_tokens` = 总量（含缓存），`cached_tokens` 是子集详情

### 转换公式

```
openai_prompt_tokens = anthropic_input_tokens + cache_creation + cache_read
openai_cached_tokens ≈ anthropic_cache_read_input_tokens
```

## 缓存语义测试项

### 重复计数检测 (Double Counting)

已知问题：部分代理/供应商（如 Kimi）在 Anthropic 格式响应中，`input_tokens` 使用 OpenAI 语义（包含缓存部分），导致 `input_tokens + cache_read` 重复计算。

| # | 检查项 | 级别 | 说明 |
|---|--------|------|------|
| 1 | `input_tokens < cache_read_input_tokens` (when cache hit) | MUST | Anthropic 标准中 input_tokens 仅为非缓存部分，若 >= cache_read 说明包含了缓存（OpenAI 语义），total=input+cache 会重复计费 |
| 2 | 无 OpenAI 风格 `prompt_tokens` 字段 | SHOULD | Anthropic 响应中不应出现 prompt_tokens 字段，出现说明字段混用 |
| 3 | `input_tokens !== prompt_tokens` (if both present) | MUST | 两者相等说明 input_tokens 使用了 OpenAI 语义，代理平台按 Anthropic 标准公式计算将导致重复计费 |

### 检测逻辑

```
场景 A: 标准 Anthropic (正确)
  input_tokens=50, cache_read=10000 → 50 < 10000 ✅ 不重复

场景 B: Kimi 风格 (重复计数)
  input_tokens=10000, cache_read=10000 → 10000 >= 10000 ❌ 重复!
  prompt_tokens=10000, input_tokens=10000 → 相等 ❌ 语义冲突!

场景 C: 无缓存
  input_tokens=500, cache_read=0 → 不触发检测
```
