import json
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
INPUT_PATH = BASE_DIR / "room_data_request.xlsx"
OUTPUT_PATH = BASE_DIR.parent / "src" / "data" / "rooms_by_building.json"
SHEET_NAME = "data"

REQUIRED_COLUMNS = [
    "Building Code",
    "Building Name",
    "Floor Code",
    "Room Code",
    "Room Name",
]

BUILDING_CODE_ALIASES = {
    "HSSML": "HSS",
}


def clean_text(value) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def normalize_building_code(value: str) -> str:
    value = clean_text(value).upper()
    return BUILDING_CODE_ALIASES.get(value, value)


def normalize_floor_code(value: str) -> str:
    value = clean_text(value)
    if not value:
        return ""
    if value.isdigit():
        return value.zfill(2)
    return value.upper()



def main() -> None:
    df = pd.read_excel(INPUT_PATH, sheet_name=SHEET_NAME)

    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = df[REQUIRED_COLUMNS].copy()

    df["Building Code"] = df["Building Code"].map(normalize_building_code)
    df["Building Name"] = df["Building Name"].map(clean_text)
    df["Floor Code"] = df["Floor Code"].map(normalize_floor_code)
    df["Room Code"] = df["Room Code"].map(clean_text)
    df["Room Name"] = df["Room Name"].map(clean_text)

    df = df[
        (df["Building Code"] != "")
        & (df["Floor Code"] != "")
        & (df["Room Code"] != "")
    ].copy()

    df = df.drop_duplicates(subset=["Building Code", "Floor Code", "Room Code"])
    df = df.sort_values(by=["Building Code", "Floor Code", "Room Code"], kind="stable")

    rooms_by_building = {}

    for _, row in df.iterrows():
        building_code = row["Building Code"]
        building_name = row["Building Name"]
        floor_code = row["Floor Code"]
        room_code = row["Room Code"]
        room_name = row["Room Name"]

        building_entry = rooms_by_building.setdefault(
            building_code,
            {
                "buildingName": building_name,
                "floors": {},
            },
        )

        if not building_entry["buildingName"] and building_name:
            building_entry["buildingName"] = building_name

        floor_list = building_entry["floors"].setdefault(floor_code, [])
        floor_list.append(
            {
                "code": room_code,
                "name": room_name,
            }
        )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(rooms_by_building, f, indent=2, ensure_ascii=False)

    print(f"Generated {len(rooms_by_building)} buildings -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
