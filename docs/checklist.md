# LLM API 标准检查清单

基于 OpenAI 和 Anthropic 官方 API 文档定义的校验规则。

## 级别定义

- **MUST** (核心标准) — 规范明确要求，违反即不合规，标记为 `fail`
- **SHOULD** (建议标准) — 规范推荐或惯例行为，违反标记为 `warn` 并标注原因

## 1. GET /v1/models

来源：[OpenAI API Reference - List Models](https://platform.openai.com/docs/api-reference/models/list)

标准响应结构：
```json
{
  "object": "list",
  "data": [
    { "id": "gpt-5", "object": "model", "created": 1775137350, "owned_by": "openai" }
  ]
}
```

| # | 检查项 | 级别 | 失败原因说明 |
|---|--------|------|-------------|
| 1 | HTTP 200 | MUST | 接口不可用或认证失败 |
| 2 | `object === "list"` | MUST | 响应格式不符合 OpenAI 规范 |
| 3 | `data` is array | MUST | 响应结构缺失 |
| 4 | `data[0].id` exists (string) | MUST | 模型对象缺少必需字段 |
| 5 | `data[0].object === "model"` | MUST | 模型对象 type 不符合规范 |
| 6 | `data[0].created` exists (number) | SHOULD | OpenAI 规范要求，部分代理可能省略 |
| 7 | `data[0].owned_by` exists (string) | SHOULD | OpenAI 规范要求，部分代理可能省略 |

## 2. POST /v1/chat/completions (非流式)

来源：[OpenAI API Reference - Create Chat Completion](https://platform.openai.com/docs/api-reference/chat/create)

标准响应结构：
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677858242,
  "model": "gpt-5",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "Hello!" },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15 }
}
```

| # | 检查项 | 级别 | 失败原因说明 |
|---|--------|------|-------------|
| 1 | HTTP 200 | MUST | 接口不可用或请求格式错误 |
| 2 | `id` exists (string) | MUST | 响应缺少必需字段 |
| 3 | `object === "chat.completion"` | MUST | 响应类型标识错误 |
| 4 | `model` exists (string) | MUST | 响应缺少必需字段 |
| 5 | `choices` is non-empty array | MUST | 响应缺少必需字段 |
| 6 | `choices[0].message.role === "assistant"` | MUST | 消息角色不符合规范 |
| 7 | `choices[0].message.content` is string or null | MUST | 消息内容类型错误 |
| 8 | `choices[0].finish_reason` exists | MUST | 缺少完成原因（stop/length/tool_calls/content_filter） |
| 9 | `choices[0].index` exists (number) | MUST | 缺少索引字段 |
| 10 | `usage` exists | SHOULD | 规范中 usage 为可选字段，但绝大多数实现都会返回 |
| 11 | `usage.prompt_tokens` > 0 | SHOULD | Token 计量缺失，影响计费 |
| 12 | `usage.completion_tokens` >= 0 | SHOULD | Token 计量缺失 |
| 13 | `usage.total_tokens === prompt + completion` | SHOULD | Token 计算不一致，影响计费准确性 |

## 3. POST /v1/chat/completions (流式)

来源：[OpenAI API Reference - Streaming](https://platform.openai.com/docs/api-reference/chat/streaming)

标准 SSE 格式：
```
data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}

data: [DONE]
```

| # | 检查项 | 级别 | 失败原因说明 |
|---|--------|------|-------------|
| 1 | 收到有效 SSE 事件 | MUST | 流式响应完全无效 |
| 2 | chunk `object === "chat.completion.chunk"` | MUST | 流式 chunk 类型标识错误 |
| 3 | 首个 chunk `delta.role === "assistant"` | MUST | 流式首 chunk 缺少角色标识 |
| 4 | 中间 chunks 包含 `delta.content` | MUST | 流式内容为空 |
| 5 | `finish_reason` 在某个 chunk 中非 null | MUST | 流缺少终止信号 |
| 6 | 以 `data: [DONE]` 结束 | MUST | OpenAI 规范明确要求 [DONE] 作为流终止标记 |
| 7 | `stream_options.include_usage` 时最终 chunk 含 usage | MUST | 请求了 usage 但未返回 |
| 8 | usage chunk 的 `choices` 为空数组 | SHOULD | 规范：usage chunk 的 choices 应为 [] |
| 9 | `usage.prompt_tokens` > 0 | SHOULD | Token 计量缺失 |
| 10 | `usage.completion_tokens` >= 0 | SHOULD | Token 计量缺失 |

## 4. POST /v1/messages (非流式)

来源：[Anthropic API Reference - Create a Message](https://docs.anthropic.com/en/api/messages)

标准响应结构：
```json
{
  "id": "msg_abc123",
  "type": "message",
  "role": "assistant",
  "content": [{ "type": "text", "text": "Hello!" }],
  "model": "claude-opus-4-6",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": { "input_tokens": 10, "output_tokens": 5 }
}
```

Thinking 模型响应结构（content 数组中 thinking 块在前，text 块在后）：
```json
{
  "content": [
    { "type": "thinking", "thinking": "...", "signature": "..." },
    { "type": "text", "text": "Hello!" }
  ]
}
```

| # | 检查项 | 级别 | 失败原因说明 |
|---|--------|------|-------------|
| 1 | HTTP 200 | MUST | 接口不可用或认证失败 |
| 2 | `type === "message"` | MUST | 响应类型标识错误 |
| 3 | `role === "assistant"` | MUST | 角色不符合规范 |
| 4 | `content` is non-empty array | MUST | 响应内容为空 |
| 5 | `content` 数组中存在 `type: "text"` 的元素 | MUST | 响应缺少文本内容（thinking 模型会有 thinking 块在前） |
| 6 | `id` exists (string) | MUST | 响应缺少必需字段 |
| 7 | `model` exists (string) | MUST | 响应缺少必需字段 |
| 8 | `stop_reason` exists | MUST | 缺少停止原因（end_turn/stop_sequence/max_tokens/tool_use） |
| 9 | `usage.input_tokens` > 0 | MUST | Anthropic 规范 usage 为必需字段 |
| 10 | `usage.output_tokens` > 0 | MUST | Anthropic 规范 usage 为必需字段 |

## 5. POST /v1/messages (流式)

来源：[Anthropic API Reference - Streaming Messages](https://docs.anthropic.com/en/api/messages-streaming)

标准事件序列：
```
event: message_start
data: {"type":"message_start","message":{"id":"msg_abc","type":"message","role":"assistant","content":[],"model":"claude-opus-4-6","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":5}}

event: message_stop
data: {"type":"message_stop"}
```

Thinking 模型的 delta 类型：`thinking_delta`（含 `thinking` 字段）和 `signature_delta`（含 `signature` 字段）。

| # | 检查项 | 级别 | 失败原因说明 |
|---|--------|------|-------------|
| 1 | 收到 `event: message_start` | MUST | 流式首事件缺失 |
| 2 | `message_start` 包含完整 message 对象 | MUST | 首事件结构不完整 |
| 3 | 收到 `event: content_block_start` | MUST | 内容块起始事件缺失 |
| 4 | 收到 `event: content_block_delta` | MUST | 无内容增量事件 |
| 5 | delta 包含有效内容（text_delta 或 thinking_delta） | MUST | 增量内容为空 |
| 6 | 收到 `event: content_block_stop` | MUST | 内容块未正常关闭 |
| 7 | 收到 `event: message_delta` | MUST | 缺少消息终止事件 |
| 8 | `message_delta` 包含 `stop_reason` | MUST | 终止事件缺少停止原因 |
| 9 | 收到 `event: message_stop` | MUST | 流未正常终止 |
| 10 | `message_start` 中 `usage.input_tokens` > 0 | MUST | 规范要求（代理转换场景可能为 0，因上游 OpenAI 流开始时不提供此值） |
| 11 | `message_delta` 中 `usage.output_tokens` > 0 | MUST | 规范要求 message_delta 包含 output_tokens |
| 12 | SSE `event:` 行冒号后有空格 | SHOULD | WHATWG SSE 规范中空格可选，但 Anthropic 官方示例始终使用空格 |
