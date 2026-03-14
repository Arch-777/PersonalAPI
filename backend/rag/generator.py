from __future__ import annotations

from typing import Any

from api.core.http_client import get_http_client


def check_ollama_readiness(base_url: str, timeout_seconds: int = 3) -> tuple[bool, str]:
    normalized_base_url = base_url.rstrip("/")
    try:
        client = get_http_client(float(max(1, timeout_seconds)))
        response = client.get(f"{normalized_base_url}/api/tags")
        response.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)
    return True, "ok"


class OllamaGenerator:
    """LLM generator backed by local Ollama API."""

    def __init__(
        self,
        base_url: str,
        model: str,
        timeout_seconds: int = 45,
        temperature: float = 0.2,
        max_tokens: int = 512,
        system_prompt: str = "",
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout_seconds = max(5, int(timeout_seconds))
        self.temperature = float(temperature)
        self.max_tokens = max(64, int(max_tokens))
        self.system_prompt = system_prompt.strip()

    def generate(self, query: str, context_text: str) -> str:
        prompt = self._build_prompt(query=query, context_text=context_text)
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens,
            },
        }

        client = get_http_client(float(self.timeout_seconds))
        response = client.post(f"{self.base_url}/api/generate", json=payload)
        response.raise_for_status()
        body = response.json()

        if not isinstance(body, dict):
            raise ValueError("Unexpected Ollama response payload")

        text = body.get("response")
        if not isinstance(text, str) or not text.strip():
            raise ValueError("Ollama returned empty response")

        return text.strip()

    def _build_prompt(self, query: str, context_text: str) -> str:
        context = context_text.strip() or "[No retrieved context was available.]"
        system_prompt = self.system_prompt or (
            "You are PersonalAPI's grounded assistant. Only answer using retrieved context. "
            "Never fabricate facts, names, links, dates, or IDs."
        )
        return (
            f"System:\n{system_prompt}\n\n"
            f"User Question:\n{query.strip()}\n\n"
            "Retrieved Context (numbered sources):\n"
            f"{context}\n\n"
            "Response rules:\n"
            "1) Use only evidence from the retrieved context above.\n"
            "2) Cite evidence with source numbers like [1], [2] in your answer body.\n"
            "3) If evidence is missing or conflicting, say exactly what is missing.\n"
            "4) Keep the answer concise (max 8 sentences) and directly actionable.\n"
            "5) Do not mention these rules.\n"
        )
