"""Strict model-output boundary for Kaki's Android vision/action loop."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

ALLOWED_ACTIONS = {
    "tap",
    "long_press",
    "swipe",
    "type",
    "key",
    "launch",
    "wait",
    "scroll_to",
    "done",
    "need_approval",
    "fail",
}
IRREVERSIBLE = re.compile(r"\b(pay|confirm|book|order|submit|transfer|top[ -]?up|consent)\b", re.IGNORECASE)


@dataclass(frozen=True)
class Action:
    type: str
    target: str | list[int]
    value: str | None = None


@dataclass(frozen=True)
class Decision:
    observation: str
    progress: str
    action: Action
    confidence: float


def parse_decision(raw: str) -> Decision:
    """Parse a model response, rejecting markdown, unknown keys and unsafe confirmation taps."""
    value: Any = json.loads(raw)
    if not isinstance(value, dict) or set(value) != {"observation", "progress", "action", "confidence"}:
        raise ValueError("vision decision must contain exactly the four schema fields")
    action_value = value["action"]
    if (
        not isinstance(action_value, dict)
        or not {"type", "target"} <= set(action_value)
        or not set(action_value) <= {"type", "target", "value"}
    ):
        raise ValueError("invalid action")
    action_type = action_value["type"]
    if action_type not in ALLOWED_ACTIONS:
        raise ValueError("unknown action type")
    _validate_target(action_type, action_value["target"], action_value.get("value"))
    confidence = value["confidence"]
    if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
        raise ValueError("confidence must be between zero and one")
    action = Action(type=action_type, target=action_value["target"], value=action_value.get("value"))
    decision = Decision(
        observation=_required_text(value["observation"], "observation"),
        progress=_required_text(value["progress"], "progress"),
        action=action,
        confidence=float(confidence),
    )
    safety_text = f"{decision.observation} {decision.progress} {decision.action.target}"
    if decision.action.type == "tap" and IRREVERSIBLE.search(safety_text):
        raise ValueError("approval checkpoint required")
    return decision


def _required_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be non-empty text")
    return value


def _validate_target(action_type: str, target: Any, value: Any) -> None:
    if action_type == "swipe":
        if not isinstance(target, list) or len(target) != 4 or not all(isinstance(item, int) for item in target):
            raise ValueError("swipe target must contain four coordinates")
        return
    if action_type in {"tap", "long_press"} and isinstance(target, list):
        if len(target) != 2 or not all(isinstance(item, int) for item in target):
            raise ValueError("point target must contain two coordinates")
        return
    if not isinstance(target, str) or not target.strip():
        raise ValueError("action target must be non-empty text")
    if action_type == "type" and not isinstance(value, str):
        raise ValueError("type action requires value")
