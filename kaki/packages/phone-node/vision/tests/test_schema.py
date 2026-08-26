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


def test_rejects_malformed_swipe_shape() -> None:
    with pytest.raises(ValueError, match="four coordinates"):
        parse_decision(
            json.dumps(
                {
                    "observation": "List is visible",
                    "progress": "Need next row",
                    "action": {"type": "swipe", "target": [1, 2]},
                    "confidence": 0.8,
                }
            )
        )


@pytest.mark.parametrize(
    ("payload", "message"),
    [
        ([], "exactly the four schema fields"),
        (
            {"observation": "Visible", "progress": "Ready", "action": "tap", "confidence": 1},
            "invalid action",
        ),
        (
            {
                "observation": "Visible",
                "progress": "Ready",
                "action": {"type": "delete", "target": "row"},
                "confidence": 1,
            },
            "unknown action type",
        ),
        (
            {
                "observation": "Visible",
                "progress": "Ready",
                "action": {"type": "wait", "target": "page"},
                "confidence": True,
            },
            "confidence must be between zero and one",
        ),
        (
            {
                "observation": " ",
                "progress": "Ready",
                "action": {"type": "wait", "target": "page"},
                "confidence": 0.5,
            },
            "observation must be non-empty text",
        ),
        (
            {
                "observation": "Visible",
                "progress": "Ready",
                "action": {"type": "tap", "target": [1, "2"]},
                "confidence": 0.5,
            },
            "point target must contain two coordinates",
        ),
        (
            {
                "observation": "Visible",
                "progress": "Ready",
                "action": {"type": "type", "target": "Search"},
                "confidence": 0.5,
            },
            "type action requires value",
        ),
    ],
)
def test_rejects_invalid_model_boundaries(payload: object, message: str) -> None:
    with pytest.raises(ValueError, match=message):
        parse_decision(json.dumps(payload))


@pytest.mark.parametrize(
    "action",
    [
        {"type": "swipe", "target": [1, 2, 3, 4]},
        {"type": "long_press", "target": [10, 20]},
        {"type": "type", "target": "Search", "value": "kopi"},
    ],
)
def test_accepts_valid_coordinate_and_value_actions(action: dict[str, object]) -> None:
    decision = parse_decision(
        json.dumps(
            {
                "observation": "Control is visible",
                "progress": "Ready for the next reversible step",
                "action": action,
                "confidence": 0.75,
            }
        )
    )
    assert decision.action.type == action["type"]
