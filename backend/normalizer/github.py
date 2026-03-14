from __future__ import annotations

from typing import Any

from normalizer.base import BaseNormalizer, NormalizedItem


class GitHubNormalizer(BaseNormalizer):
    platform = "github"
    item_type = "repository"

    def normalize_record(self, record: dict[str, Any]) -> NormalizedItem | None:
        source_id = self.deterministic_source_id(
            platform=self.platform,
            candidate_id=self.ensure_text(record.get("node_id") or record.get("id") or record.get("full_name")),
            payload=record,
        )

        owner = record.get("owner") if isinstance(record.get("owner"), dict) else {}
        owner_login = self.ensure_text(owner.get("login"))
        title = self.ensure_text(record.get("full_name") or record.get("name"))

        topics = record.get("topics") if isinstance(record.get("topics"), list) else []
        topics_text = ", ".join([str(topic).strip() for topic in topics if str(topic).strip()])

        description = self.ensure_text(record.get("description"))
        language = self.ensure_text(record.get("language"))
        visibility = self.ensure_text(record.get("visibility"))
        stars = int(record.get("stargazers_count") or 0)
        forks = int(record.get("forks_count") or 0)

        content_parts = [part for part in [description, f"Language: {language}" if language else None, f"Topics: {topics_text}" if topics_text else None] if part]
        content = "\n".join(content_parts) if content_parts else None

        metadata = {
            "html_url": self.ensure_text(record.get("html_url")),
            "clone_url": self.ensure_text(record.get("clone_url")),
            "owner_login": owner_login,
            "is_private": bool(record.get("private", False)),
            "is_fork": bool(record.get("fork", False)),
            "default_branch": self.ensure_text(record.get("default_branch")),
            "visibility": visibility,
            "language": language,
            "topics": topics,
            "stars": stars,
            "forks": forks,
            "open_issues_count": int(record.get("open_issues_count") or 0),
        }

        item_date = self.coerce_datetime(record.get("pushed_at") or record.get("updated_at") or record.get("created_at"))

        return NormalizedItem(
            type=self.item_type,
            source=self.platform,
            source_id=source_id,
            title=title,
            sender_name=owner_login,
            sender_email=None,
            content=content,
            summary=self.build_summary(description or title),
            metadata_json=metadata,
            item_date=item_date,
            raw_record=record,
        )
