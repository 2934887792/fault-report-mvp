import pandas as pd
import json

df = pd.read_excel(
    "E5 Building.xlsx",
    sheet_name="E5",
    header=2
)

df = df[["Floor Code", "Room Code", "Room Name"]]

df["Floor Code"] = df["Floor Code"].astype(str).str.zfill(2)

rooms_by_floor = {}

for _, row in df.iterrows():
    floor = row["Floor Code"]
    room_code = row["Room Code"]
    room_name = row["Room Name"]

    if floor not in rooms_by_floor:
        rooms_by_floor[floor] = []

    rooms_by_floor[floor].append({
        "code": room_code,
        "name": room_name
    })

with open("e5_rooms.json", "w", encoding="utf-8") as f:
    json.dump(rooms_by_floor, f, indent=2, ensure_ascii=False)

print("✅ e5_rooms.json generated successfully")
