"""Strict model-output boundary for Kaki's Android vision/action loop."""

from __future__ import annotations

from dataclasses import dataclass
import json
import re
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
IRREVERSIBLE = re.compile(r"\b(pay|confirm|book|order|submit|transfer|top[ -]?up|consent)\b", re.I)


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
    if not isinstance(action_value, dict) or not {"type", "target"} <= set(action_value):
        raise ValueError("invalid action")
    action_type = action_value["type"]
    if action_type not in ALLOWED_ACTIONS:
        raise ValueError("unknown action type")
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
