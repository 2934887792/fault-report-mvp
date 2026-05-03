from langchain_openai import ChatOpenAI
import os
import asyncio
from volcenginesdkarkruntime import AsyncArk
GPT_LLM_MODEL_API_KEY = "sk-D6wCR4YPUNg7GkEG8aB365F0F49e48Ad810c1f24Ac3a9c32"


GPT_LLM = ChatOpenAI(
        model="gpt-5-mini",
        temperature=0,
        api_key=GPT_LLM_MODEL_API_KEY,
        base_url="https://api.aihubmix.com/v1",
        model_kwargs={
        "response_format": {"type": "json_object"}
        }
    )

GPT_LLM_5 = ChatOpenAI(
        model="gpt-5.1",
        temperature=0,
        api_key=GPT_LLM_MODEL_API_KEY,
        base_url="https://api.aihubmix.com/v1"
    )

client = AsyncArk(
    base_url='https://ark.cn-beijing.volces.com/api/v3',
    api_key='afd12415-f657-44cd-ba9e-f0c476a81588'
)