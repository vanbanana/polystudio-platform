"""
ReasoningChatOpenAI - 保留推理内容（reasoning_content）的 ChatOpenAI 子类

langchain_openai 默认只解析 OpenAI 官方字段，会丢弃第三方供应商
（DeepSeek / 火山 / vLLM 等）返回的 reasoning_content。本子类在流式
chunk 转换时把 reasoning_content 注入到 AIMessageChunk.additional_kwargs，
供 StreamProcessor 取出后以 SSE `reasoning` 事件下发前端展示思考过程。
"""
from typing import Any, Optional
from langchain_core.outputs import ChatGenerationChunk
from langchain_core.messages import AIMessageChunk
from langchain_openai import ChatOpenAI


def _extract_reasoning(delta: Any) -> Optional[str]:
    """从 chat.completions 的 delta 中提取 reasoning_content（兼容多种字段名）"""
    if not isinstance(delta, dict):
        return None
    for key in ("reasoning_content", "reasoning"):
        value = delta.get(key)
        if isinstance(value, str) and value:
            return value
    return None


class ReasoningChatOpenAI(ChatOpenAI):
    """在流式输出中保留 reasoning_content 的 ChatOpenAI"""

    def _convert_chunk_to_generation_chunk(
        self,
        chunk: dict,
        default_chunk_class: type,
        base_generation_info: Optional[dict],
    ) -> Optional[ChatGenerationChunk]:
        generation_chunk = super()._convert_chunk_to_generation_chunk(
            chunk, default_chunk_class, base_generation_info
        )
        if generation_chunk is None:
            return None

        choices = (
            chunk.get("choices", [])
            or chunk.get("chunk", {}).get("choices", [])
        )
        if choices:
            delta = choices[0].get("delta")
            reasoning = _extract_reasoning(delta)
            if reasoning and isinstance(generation_chunk.message, AIMessageChunk):
                generation_chunk.message.additional_kwargs["reasoning_content"] = reasoning

        return generation_chunk
