import json
from pathlib import Path

from langchain_core.messages import AIMessage, ToolMessage
from langchain.agents import create_agent
from demo import get_building_name_by_latlng
# from tool.tool_run import TOOL_MAP_INFO, prefix_run_tools, get_knowledge_tool_list
# from common.common import get_meta, get_scene_by_message, get_content
# from common.config import META_INFO_KNOWLEDGE_TOOL



class roomAgent:
    def __init__(self, model):
        self.model = model

    def run_stream(self, message: str, session_id: str, lat: str = "", lng: str = ""):
        buffer=""
        # meta_infos = get_meta()
        # 先获取当前楼的信息
        lat = (lat or "").strip()
        lng = (lng or "").strip()
        print(f"debug lat(from frontend):{lat}")
        print(f"debug lng(from frontend):{lng}")
        building_result = get_building_name_by_latlng(lat, lng) if lat and lng else ""

        # 解析 get_building_name_by_latlng 的第一行名称：
        # 例如：当前位置建筑/地点名称: E5
        building_text = ""
        if "当前位置建筑/地点名称:" in building_result:
            building_text = building_result.split("当前位置建筑/地点名称:", 1)[1].splitlines()[0].strip()

        building_name = f"{building_text}.txt" if building_text else "E5.txt"
        print(f"debug building:{building_result}")
        knowledge_path = Path("./knowledge") / building_name
        if not knowledge_path.exists():
            building_name = "E5.txt"
            knowledge_path = Path("./knowledge") / building_name

        if not building_name:
            yield " meta.txt 信息为空,停止执行"
            return
        #meta_scene_info = get_scene_by_message(message, building_name)
        #根据楼名取获取对应的楼的知识库信息
        with open(knowledge_path, "r", encoding="utf-8") as f:
            building_detail=f.read()
        # knowledge_infos = ""
        # tool_info = ""

        # if isinstance(meta_scene_info, dict) and "path" in meta_scene_info:
        #     knowledge_infos = get_content(meta_scene_info["path"])
        #     knowledge_file=meta_scene_info["description"]
        #     buffer=buffer+f"选择的知识库文件是\"{knowledge_file}\"\n\n"
        #     yield buffer
        #
        # if "tool_id" in meta_scene_info:
        #     buffer=buffer + "正在执行前置工具查询指定日志..\n\n"
        #     yield buffer
        #     tool_info = prefix_run_tools(meta_scene_info, message)
        #
        #     if not tool_info:
        #         buffer=buffer+"没有指定前置工具 \n"
        #     else:
        #         buffer=buffer+f" 日志查询结果：\n```text\n{tool_info}\n```\n"
        #
        #     yield buffer
        #
        # tool_list = []
        # if META_INFO_KNOWLEDGE_TOOL in meta_scene_info:
        #     print(f"[debug]meta_scene_info:{meta_scene_info}")
        #     tool_list = get_knowledge_tool_list(meta_scene_info)
        #     if len(tool_list) == 0:
        #         buffer = buffer + "没有声明需要加载工具"
        #     else:
        #         buffer=buffer+f" 已加载工具：{meta_scene_info[META_INFO_KNOWLEDGE_TOOL]}\n\n"
        #     yield buffer
        # meta_scene_info=json..dumps(meta_scene_info, ensure_ascii=False)
        self.agent = create_agent(
            model=self.model,
            tools=[],
        )

        #给出图片信息
        photo_info=message
        messages = [
            {
                "role": "user",
                "content": f"知识库会给出这个楼对应房间的楼层，教室号和教室名字。根据知识库中的信息,识别图片对应的位置信息 包括建筑名 楼层 教室号码和名称，用英文输出"
                           f"这是图片中的信息{photo_info}"
            },
            {
                "role": "user",
                "content": (
                    f"这是用户提供的知识库信息{building_detail},"
                )
            }
        ]
        yield buffer+" Agent 开始执行...\n"

        #  核心：使用 stream
        for event in self.agent.stream(
                {"messages": messages},
                {"configurable": {"thread_id": session_id}},
                stream_mode="values"
        ):

            if "messages" in event:
                ai_messages = [
                    msg for msg in event["messages"]
                    if isinstance(msg, AIMessage)
                ]

                # 如果没有 AIMessage，直接跳出
                if not ai_messages:
                    continue

            # 1. LLM 输出
            if "messages" in event:
                for msg in event["messages"]:
                    if isinstance(msg, AIMessage):
                        buffer =buffer+ msg.content+"\n"
                        yield buffer+" "
                    elif isinstance(msg, ToolMessage):
                        buffer = buffer + f" 调用工具：{msg.name}\n"+f"返回结果是\n```text\n{msg.content}\n```\n"
                        yield buffer + " "

        yield buffer+"\n Agent 执行完成"