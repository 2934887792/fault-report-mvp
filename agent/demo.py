import os
from typing import Tuple

import gradio as gr
import requests


GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


def _pick_building_name(results: list[dict]) -> Tuple[str, str]:
    """Return best building/POI name and a formatted address."""
    preferred_types = ("premise", "establishment", "point_of_interest", "subpremise")

    # Prefer results that are likely buildings/POIs.
    for result in results:
        r_types = result.get("types", [])
        if any(t in r_types for t in preferred_types):
            address = result.get("formatted_address", "")
            # Keep the first segment as a short display name if possible.
            short_name = address.split(",")[0].strip() if address else ""
            return short_name or "未知建筑", address or "无详细地址"

    # Fallback to first result if no building-like type is found.
    if results:
        address = results[0].get("formatted_address", "")
        short_name = address.split(",")[0].strip() if address else ""
        return short_name or "未知建筑", address or "无详细地址"

    return "未找到", "当前坐标附近没有可识别的地点"


def get_building_name_by_latlng(lat: str, lng: str) -> str:
    api_key ="AIzaSyCifaSJELBkMdAjCWYO7XTUnufD6uoFJQs"
    if not api_key:
        return "请先设置环境变量 GOOGLE_MAPS_API_KEY"

    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except (TypeError, ValueError):
        return "经纬度无效，请先点击“获取当前位置”"

    params = {
        "latlng": f"{lat_f},{lng_f}",
        "result_type": "premise|establishment|point_of_interest|subpremise",
        "language": "zh-CN",
        "key": api_key,
    }

    try:
        resp = requests.get(GEOCODE_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        return f"请求 Google API 失败: {e}"

    status = data.get("status")
    if status != "OK":
        err = data.get("error_message", "")
        return f"Google API 返回状态: {status} {err}".strip()

    building_name, full_address = _pick_building_name(data.get("results", []))
    return (
        f"当前位置建筑/地点名称: {building_name}\n"
        f"完整地址: {full_address}\n"
        f"坐标: ({lat_f}, {lng_f})"
    )


def create_demo() -> gr.Blocks:
    with gr.Blocks(title="当前位置建筑名称查询 Demo") as demo:
        gr.Markdown(
            "## Gradio + Google API 当前位置建筑名称查询\n"
            "1. 点击“获取当前位置”自动读取浏览器坐标\n"
            "2. 点击“查询建筑名称”调用 Google Geocoding API"
        )

        with gr.Row():
            lat_box = gr.Textbox(label="纬度 Latitude", placeholder="例如: 1.2966")
            lng_box = gr.Textbox(label="经度 Longitude", placeholder="例如: 103.7764")

        with gr.Row():
            locate_btn = gr.Button("获取当前位置")
            query_btn = gr.Button("查询建筑名称")

        output = gr.Textbox(label="查询结果", lines=6)

        # Use browser geolocation API and write back to two textboxes.
        locate_btn.click(
            None,
            inputs=[],
            outputs=[lat_box, lng_box],
            js="""
            async () => {
                if (!navigator.geolocation) {
                    return ["", ""];
                }
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    });
                }).catch(() => null);

                if (!pos) return ["", ""];
                return [
                    String(pos.coords.latitude),
                    String(pos.coords.longitude)
                ];
            }
            """,
        )

        query_btn.click(
            fn=get_building_name_by_latlng,
            inputs=[lat_box, lng_box],
            outputs=output,
        )

    return demo


if __name__ == "__main__":
    demo = create_demo()
    demo.launch()
