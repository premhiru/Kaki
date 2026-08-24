import json

import pytest

from kaki_phone_vision import parse_decision


def test_accepts_accessibility_first_action() -> None:
    decision = parse_decision(
        json.dumps(
            {
                "observation": "Destination field is visible",
                "progress": "Pickup is filled",
                "action": {"type": "tap", "target": "Destination"},
                "confidence": 0.94,
            }
        )
    )
    assert decision.action.target == "Destination"


def test_blocks_confirmation_tap() -> None:
    with pytest.raises(ValueError, match="approval"):
        parse_decision(
            json.dumps(
                {
                    "observation": "Confirm booking for $18",
                    "progress": "Ready",
                    "action": {"type": "tap", "target": "Confirm"},
                    "confidence": 1,
                }
            )
        )
