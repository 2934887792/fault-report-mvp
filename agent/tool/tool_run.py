:from tool.es_tool import run_es_tool
from tool.hive_tool import run_hive_tool
from tool.http_tool import run_http_tool
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import StructuredTool
import json
from common.common import get_meta, get_scene_by_message, strptime_multiformat, compare_curtime
from common.config import (
    META_INFO_KEY_SCENE_DESC,
    META_INFO_KNOWLEDGE_TOOL,
    META_INFO_KEY_TOOL_INFO,
    META_INFO_KEY_ID,
    META_INFO_KEY_TOOL_ID,
    META_INFO_KEY_ES_TOOL_ID,
    META_INFO_KEY_ES_PARAM,
    META_INFO_KEY_HIVE_TOOL_ID,
    META_INFO_KEY_HIVE,
    META_INFO_KEY_HTTP,
    META_INFO_KEY_HTTP_TOOL_ID,
    )
from llm.llm import DEEP_SEEK_LLM
from datetime import datetime
from llm.prompt import CASE_ANALYZE_TIME_PROMPT,KNOWLEDGE_TOOL_PROMPT


RUN_TYPE_HIVE = 1
RUN_TYPE_ES   = 2
RUN_TYPE_HTTP = 3

TOOL_MAP_INFO = {
    "get_log_by_hive": run_hive_tool,
    "get_log_by_es":   run_es_tool,
    "get_info_by_http":run_http_tool,
}

TOOL_LIST = [run_hive_tool, run_es_tool, run_http_tool]

TIME_STAMP_FORMATS = [
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M:%S.%f",
    "%Y-%m-%d %H:%M:%S %z",
    "%Y-%m-%d %H:%M:%S.%f %z"
]


def parse_tool_param(meta_info: dict, tool_id: str) -> dict:
    tool_meta_info = {}
    if META_INFO_KEY_TOOL_INFO not in meta_info or len(meta_info[META_INFO_KEY_TOOL_INFO]) <= 0:
        return tool_meta_info
    tool_map = {}
    for tool_info in meta_info[META_INFO_KEY_TOOL_INFO]:
        if META_INFO_KEY_ID not in tool_info:
            continue
        tool_map[tool_info["id"]] = tool_info
    if tool_id not in tool_map:
        print(f"[run_tool], invalid tool_id={tool_id}")
        return tool_meta_info
    tool_info = tool_map[tool_id]
    if META_INFO_KEY_ES_TOOL_ID in tool_info:
        if META_INFO_KEY_ES_PARAM not in meta_info or len(meta_info[META_INFO_KEY_ES_PARAM]) <= 0:
            print(f"[run_tool]empty es_conf")
            return tool_meta_info
        # 传入toolid对应的info
        es_conf_infos = get_conf_info_by_id(tool_info, META_INFO_KEY_ES_TOOL_ID, meta_info["esParam"])
        if len(es_conf_infos) <= 0:
            print(f"[run_tool]get es conf fails, get_conf_info_by_id empty result")
            return tool_meta_info
        tool_meta_info["esParam"] = es_conf_infos[0]
    if META_INFO_KEY_HIVE_TOOL_ID in tool_info:
        if META_INFO_KEY_HIVE not in meta_info or len(meta_info[META_INFO_KEY_HIVE]) <= 0:
            print(f"[run_tool]empty hive_conf")
            return tool_meta_info
        hive_conf_infos = get_conf_info_by_id(tool_info, META_INFO_KEY_HIVE_TOOL_ID, meta_info[META_INFO_KEY_HIVE])
        if len(hive_conf_infos) <= 0:
            print(f"[run_tool]get hive conf fails, get_conf_info_by_id empty result")
            return tool_meta_info
        tool_meta_info["hive"] = hive_conf_infos[0]
    if META_INFO_KEY_HTTP_TOOL_ID in tool_info:
        if META_INFO_KEY_HTTP not in meta_info or len(meta_info[META_INFO_KEY_HTTP]) <= 0:
            print(f"[run_tool]empty http_conf")
            return tool_meta_info
        http_conf_infos = get_conf_info_by_id(tool_info, META_INFO_KEY_HTTP_TOOL_ID, meta_info[META_INFO_KEY_HTTP])
        if len(http_conf_infos) <= 0:
            print(f"[run_tool]get http conf fails, get_conf_info_by_id empty result")
            return tool_meta_info
        http_meta_info = {}
        http_uri = {}
        http_params = {}
        for info in http_conf_infos:
            if info.get("interface", "") == "" or info.get("uri", "") == "":
                continue
            http_uri[info.get("interface", "")] = info.get("uri", "")
            http_params[info.get("interface", "")] = info.get("param")
        http_meta_info["http_uri"] = http_uri
        http_meta_info["http_params"] = http_params
        tool_meta_info["http"] = http_meta_info
    tool_meta_info[META_INFO_KEY_TOOL_INFO] = tool_info
    return tool_meta_info


# 前置工具调用
def prefix_run_tools(meta_info:dict, message:str):
    ret = []
    if META_INFO_KEY_TOOL_ID not in meta_info or meta_info[META_INFO_KEY_TOOL_ID] == "":
        return ret
    tool_ids = meta_info[META_INFO_KEY_TOOL_ID].split(",")
    for tool_id in tool_ids:
        tool_params = parse_tool_param(meta_info, tool_id)
        if META_INFO_KEY_TOOL_INFO not in tool_params:
            print(f"[prefix_run_tools]fails, invalid tool_id={tool_id}")
            continue
        tool_run_info = run_tool_with_meta(message, tool_params)
        ret.append(tool_run_info)
    return ret


# 知识库工具调用
def get_knowledge_tool_list(meta_info:dict):
    tool_list = []
    tool_conf_list = []
    if META_INFO_KNOWLEDGE_TOOL not in meta_info or meta_info[META_INFO_KNOWLEDGE_TOOL] == "":
        return tool_list
    tool_ids = meta_info[META_INFO_KNOWLEDGE_TOOL].split(",")
    for tool_id in tool_ids:
        tool_params = parse_tool_param(meta_info, tool_id)
        if META_INFO_KEY_TOOL_INFO not in tool_params:
            print(f"[prefix_run_tools]fails, invalid tool_id={tool_id}")
            continue
        tool_conf_list.append(tool_params)
    if len(tool_conf_list) <= 0:
        print("[get_knowledge_tool_list]fails, empty tool_conf_list")
        return tool_list
    for tool_conf in tool_conf_list:
        if not isinstance(tool_conf, dict):
            print("[get_knowledge_tool_list]invalid tool_conf")
            continue
        if META_INFO_KEY_TOOL_INFO not in tool_conf or not isinstance(tool_conf[META_INFO_KEY_TOOL_INFO], dict):
            print("[get_knowledge_tool_list]empty tool_info")
            continue
        tool_info = tool_conf.get(META_INFO_KEY_TOOL_INFO, {})
        print(f"[debug]tool_info:{tool_info}")
        des_info = tool_info.get(META_INFO_KEY_SCENE_DESC, "") + KNOWLEDGE_TOOL_PROMPT.format(tool_conf = tool_conf)
        print(f"[debug]des_info:{des_info}")
        tool = StructuredTool.from_function(
            func=run_tool_with_meta,
            name="run_tool_with_meta",
            description=des_info,
        )
        tool_list.append(tool)
    return tool_list


def get_conf_info_by_id(scene_info, scene_tool_key_id, infos):
    ret_conf_info = []
    if isinstance(infos, list) == False or scene_tool_key_id not in scene_info:
        return ret_conf_info
    if scene_info[scene_tool_key_id] == "":
        return ret_conf_info
    scene_ids = scene_info[scene_tool_key_id].split(',')
    conf_ids_map = {}
    for id in scene_ids:
        conf_ids_map[id] = True
    for info in infos:
        if META_INFO_KEY_ID in info and conf_ids_map.get(info[META_INFO_KEY_ID]) == True:
            ret_conf_info.append(info)
    return ret_conf_info

def run_tool_with_meta(message: str, meta: dict):
    print(f"[run_tool_with_meta]message:{message}")
    print(f"[run_tool_with_meta]meta:{meta}")
    if META_INFO_KEY_TOOL_INFO not in meta:
        print("[run_tool_with_meta]fails, empty tool_info")
        return ""
    tool_info = meta.get(META_INFO_KEY_TOOL_INFO, {})
    tool_type = get_run_tool_type(message, tool_info)
    try:
        if tool_type == RUN_TYPE_HIVE:
            tool_input_dict = {
                "meta_params": meta,
                "message": message,
                "hive_tool_id":"",
            }
            result = run_hive_tool.invoke(tool_input_dict)
            return result
        elif tool_type == RUN_TYPE_ES:
            tool_input_dict = {
                "metaParams": meta,
                "message": message,
                "es_tool_id": "",
            }
            result = run_es_tool.invoke(tool_input_dict)
            return result
        elif tool_type == RUN_TYPE_HTTP:
            http_meta = meta.get("http", {})
            if not isinstance(http_meta, dict):
                print("[run_tool_with_meta]invalid http_meta")
                return ""
            http_meta_info = {
                "http_uri": http_meta.get("http_uri", {}),
                "http_params": http_meta.get("http_params", {})
            }
            tool_input_dict = {
                "meta_params": http_meta_info,
                "message": message
            }
            result = run_http_tool.invoke(tool_input_dict)
            return result
    except Exception as e:
        # 缩进1：except 块内，与 try 块对齐
        print(f"[get_ret_by_tool]run fails：{e}")
        return ""
    return ""


def get_run_tool_type(message: str, tool_info: dict):
    if (META_INFO_KEY_ES_TOOL_ID in tool_info and
        META_INFO_KEY_HIVE_TOOL_ID in tool_info and
       "day" in tool_info and
        tool_info["day"] > 0):
        return get_run_tool_type_by_day(message, tool_info)
    elif META_INFO_KEY_HIVE_TOOL_ID in tool_info:
        return RUN_TYPE_HIVE
    elif META_INFO_KEY_ES_TOOL_ID in tool_info:
        return RUN_TYPE_ES
    elif META_INFO_KEY_HTTP_TOOL_ID in tool_info:
        return RUN_TYPE_HTTP
    return 0


def get_run_tool_type_by_day(message: str, tool_info: dict):
    try:
        day = tool_info.get("day", 0)
        prompt = ChatPromptTemplate.from_messages([
            ("system", CASE_ANALYZE_TIME_PROMPT),
            ("human", "{question}"),
        ])

        response = DEEP_SEEK_LLM.invoke(prompt.format_prompt(question=message).to_messages())
        response_content = response.model_dump().get("content", "").strip()
        if not response_content:
            print("[get_run_tool_type_by_day]get empty content")
            return RUN_TYPE_HIVE
        time_infos = json.loads(response_content)
        tool_type = get_tool_type_from_time_day(time_infos, "time_stamp", day)
        if tool_type != 0:
            return tool_type
        tool_type = get_tool_type_from_time_day(time_infos, "beg_time_stamp", day)
        if tool_type != 0:
            return tool_type
        return RUN_TYPE_HIVE
    except json.JSONDecodeError as e:
        # 捕获 JSON 解析失败异常
        print(f"[get_run_tool_type_by_day]json fails, err = {e}")
        return RUN_TYPE_HIVE
    except Exception as e:
        print(f"[get_run_tool_type_by_day]调用大模型失败，err={e}")
        return RUN_TYPE_HIVE


def get_tool_type_from_time_day(time_info: dict, key: str, day):
    if day == 0:
        return RUN_TYPE_HIVE
    if time_info.get(key, "") == "":
        return 0
    time_val = time_info.get(key, "")
    try:
        target_datetime = strptime_multiformat(time_val, TIME_STAMP_FORMATS)
        absolute_day_diff = compare_curtime(target_datetime)
        if absolute_day_diff < day:
            return RUN_TYPE_ES
        else:
            return RUN_TYPE_HIVE
    except ValueError as e:
        # 捕获时间字符串格式错误的异常
        print(f"时间字符串格式错误，无法解析：{e}")
        return 0
    except Exception as e:
        # 捕获其他未知异常
        print(f"计算天数差值失败：{e}")
        return 0

if __name__ == '__main__':
    # message = """请查找上车点日志，用户ID是17594624067143, 起始时间是2026-01-06 04:40:58，终止时间是2026-01-06 04:42:58，方法是FixOrderTriggerText """
    #message = """请查找上车点日志，用户ID是17592394104748, 起始时间是2025-12-22 11:10:00，终止时间是2025-12-22 11:13:59，场景是FixOrderTriggerText """
    #message = """请查找下车点日志，用户ID是158332133784636,起始时间是2025-11-26 02:02:27，终止时间是2025-11-26 02:04:27，请求类型是trigger"""
    #message = """请查找下车点日志，用户ID是283556707570471,起始时间是"2026-01-06 01:22:01.000 +0800"，终止时间是"2026-01-06 01:24:01.000 +0800"，订单id是17852959370704，请求类型是pickup"""
    message = """请查找下车点接驾场景日志，用户ID是283556707570471,起始时间是2026-01-06 01:22:01，
    终止时间是2026-01-06 01:24:01，订单id是17852959370704"""

    meta_info = get_meta()
    scene_meta_info = get_scene_by_message(message, meta_info)
    ret = prefix_run_tools(scene_meta_info, message)
    print("run_result=", ret)