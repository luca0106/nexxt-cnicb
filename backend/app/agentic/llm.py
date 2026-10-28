"""The single place where the review agent talks to Claude.

Claude runs on AWS Bedrock (AnthropicBedrock) with the Bedrock API key from backend/.env.
Tests use ScriptedLLM instead, so they never call Bedrock.
"""

import json
from typing import Any, Optional, Protocol

from ..config import settings


class LLMError(Exception):
    """The model could not produce a usable answer (refusal, truncation, network failure)."""


class LLM(Protocol):
    model: str

    def create(self, **params: Any) -> Any:
        """Same parameters as client.messages.create (model and max_tokens are filled in)."""


class BedrockLLM:
    def __init__(self):
        if not settings.AWS_BEARER_TOKEN_BEDROCK:
            raise LLMError("AWS_BEARER_TOKEN_BEDROCK is not set in backend/.env")
        from anthropic import AnthropicBedrock

        self.model = settings.LLM_MODEL
        self.client = AnthropicBedrock(
            aws_region=settings.AWS_REGION,
            api_key=settings.AWS_BEARER_TOKEN_BEDROCK,
            max_retries=3,  # 429 / 5xx / connection errors are retried by the SDK
            timeout=180.0,
        )

    def create(self, **params: Any) -> Any:
        params.setdefault("max_tokens", 16000)
        try:
            return self.client.messages.create(model=self.model, **params)
        except Exception as exc:  # network, auth, throttling after retries
            raise LLMError(f"{type(exc).__name__}: {exc}") from exc


def get_llm() -> Optional[LLM]:
    """The live LLM, or None when the agent is disabled or no Bedrock key is configured."""
    if not settings.AGENT_ENABLED or not settings.AWS_BEARER_TOKEN_BEDROCK:
        return None
    return BedrockLLM()


def check_stop(response: Any) -> None:
    if response.stop_reason == "refusal":
        raise LLMError("The model declined the request")
    if response.stop_reason == "max_tokens":
        raise LLMError("The model's answer was cut off (max_tokens)")


def text_of(response: Any) -> str:
    return "".join(b.text for b in response.content if b.type == "text")


# --- Test double ----------------------------------------------------------------

class _Block:
    def __init__(self, **kw):
        self.__dict__.update(kw)


class _Response:
    def __init__(self, content: list, stop_reason: str):
        self.content = content
        self.stop_reason = stop_reason
        self.usage = _Block(input_tokens=0, output_tokens=0)


def text_response(text: str, stop_reason: str = "end_turn") -> _Response:
    return _Response([_Block(type="text", text=text)], stop_reason)


def tool_response(*calls: tuple, text: str = "") -> _Response:
    blocks = [_Block(type="text", text=text)] if text else []
    for n, (name, args) in enumerate(calls):
        blocks.append(_Block(type="tool_use", id=f"toolu_{name}_{n}", name=name, input=args))
    return _Response(blocks, "tool_use")


class ScriptedLLM:
    """Returns prepared responses in order and records every request."""

    model = "scripted"

    def __init__(self, responses: list):
        self.responses = list(responses)
        self.requests: list = []

    def create(self, **params: Any) -> Any:
        self.requests.append({**params, "messages": json.loads(json.dumps(params.get("messages", []), default=str))})
        if not self.responses:
            raise AssertionError("ScriptedLLM: no more responses prepared")
        nxt = self.responses.pop(0)
        return nxt(params) if callable(nxt) else nxt
