from __future__ import annotations

from dataclasses import dataclass
import re
from collections import Counter

from rag.retriever import RetrievedItem


@dataclass(slots=True)
class BuiltContext:
	context_text: str
	sources: list[dict]
	documents: list[str]
	file_links: list[str]


class ContextBuilder:
	def build(self, query: str, retrieved: list[RetrievedItem], max_sources: int = 8, include_debug: bool = False) -> BuiltContext:
		selected = retrieved[:max_sources]

		context_lines: list[str] = []
		sources: list[dict] = []
		documents: list[str] = []
		file_links: list[str] = []

		for index, item in enumerate(selected, start=1):
			preview = _clean_preview(item.preview)
			context_lines.append(
				f"[{index}] ({item.source}/{item.type}) score={item.score:.3f} id={item.id} :: {preview}"
			)

			source_entry = {
				"id": item.id,
				"type": item.type,
				"source": item.source,
				"score": float(item.score),
				"preview": preview,
			}
			if include_debug and item.debug:
				source_entry["debug"] = item.debug
			sources.append(source_entry)

			documents.append(item.title or item.id)

			link = _extract_link(item)
			if link and link not in file_links:
				file_links.append(link)

		context_text = "\n".join(context_lines)
		return BuiltContext(
			context_text=context_text,
			sources=sources,
			documents=documents,
			file_links=file_links,
		)

	def compose_answer(self, query: str, retrieved: list[RetrievedItem]) -> str:
		query_tokens = _query_tokens(query)
		requested_slack = "slack" in query_tokens
		message_mode = bool(query_tokens & {"message", "messages", "chat", "dm", "dms", "slack"})

		if not retrieved:
			if requested_slack:
				return "I could not find Slack messages yet. Sync your Slack connector, then ask again with a time or channel hint like 'last 5 Slack messages from #engineering'."
			return "I could not find relevant items in your personal knowledge base yet. Try a more specific query or sync more sources."

		if message_mode:
			return _compose_message_digest(query=query, retrieved=retrieved)

		top_items = retrieved[:4]
		source_counts = Counter(item.source for item in retrieved)
		dominant_source, dominant_count = source_counts.most_common(1)[0]
		answer_lines = [
			f"I found {len(retrieved)} relevant item(s) for '{query}'.",
			f"Most evidence comes from {dominant_source} ({dominant_count}/{len(retrieved)} items).",
		]

		for index, item in enumerate(top_items, start=1):
			label = item.title or item.id
			detail = _clean_preview(item.preview, max_len=170) or "No preview available."
			answer_lines.append(f"{index}. {label} [{item.source}/{item.type}] {detail}")

		answer_lines.append("If you want a tighter answer, add constraints like source, timeframe, or keyword.")
		return "\n".join(answer_lines)


def _extract_link(item: RetrievedItem) -> str | None:
	metadata = item.metadata or {}
	for key in ["web_view_link", "web_link", "html_link", "external_url", "file_path"]:
		value = metadata.get(key)
		if isinstance(value, str) and value.strip():
			return value
	if isinstance(item.file_path, str) and item.file_path.strip():
		return item.file_path
	return None


def _clean_preview(value: str | None, max_len: int = 320) -> str:
	if not value:
		return ""
	cleaned = re.sub(r"[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]", " ", value)
	cleaned = re.sub(r"\s+", " ", cleaned).strip()
	return cleaned[:max_len]


def _query_tokens(query: str) -> set[str]:
	parts = re.findall(r"[a-z0-9]+", query.lower())
	return set(parts)


def _compose_message_digest(query: str, retrieved: list[RetrievedItem]) -> str:
	top_items = retrieved[:5]
	source_counts = Counter(item.source for item in retrieved)
	dominant_source, dominant_count = source_counts.most_common(1)[0]

	if dominant_source == "slack":
		opening = f"I found {len(retrieved)} Slack message(s) relevant to '{query}'."
	elif dominant_source == "gmail":
		opening = f"I found {len(retrieved)} message-like result(s), mostly from Gmail ({dominant_count}/{len(retrieved)})."
	else:
		opening = f"I found {len(retrieved)} message-like result(s), mostly from {dominant_source} ({dominant_count}/{len(retrieved)})."

	lines = [opening, "Top highlights:"]
	for index, item in enumerate(top_items, start=1):
		lines.append(f"{index}. {_format_message_highlight(item)}")

	lines.append("Reply with a filter like 'last 5 from #channel' or 'only DMs' for a tighter summary.")
	return "\n".join(lines)


def _format_message_highlight(item: RetrievedItem) -> str:
	metadata = item.metadata if isinstance(item.metadata, dict) else {}
	channel_name = metadata.get("channel_name") if isinstance(metadata.get("channel_name"), str) else ""
	channel_type = metadata.get("channel_type") if isinstance(metadata.get("channel_type"), str) else ""

	snippet = _clean_preview(item.preview, max_len=160) or "No content preview."
	timestamp = item.item_date.isoformat(timespec="minutes") if item.item_date else "unknown time"

	if channel_name:
		return f"#{channel_name} ({channel_type or 'channel'}) at {timestamp}: {snippet}"
	if item.source == "slack" and channel_type == "im":
		return f"DM at {timestamp}: {snippet}"
	return f"{item.source}/{item.type} at {timestamp}: {snippet}"

