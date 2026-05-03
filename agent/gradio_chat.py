import gradio as gr
from langchain_core.messages import  AIMessage

from tool.common import encode_file
from tool.file_fuction import upload_files, list_files, readfile, save_file, delete_file
#from tool.tool_run import TOOL_LIST
from agent.room_agent import roomAgent
from tool.llm import GPT_LLM_5,client

# -----------------------------
# 主处理函数：既能处理文字，也能处理图片
# -----------------------------
async def chat_pipeline(message, history, lat, lng, request: gr.Request):

    session_id = request.session_hash

    text_input = message.get("text", "")
    files = message.get("files", [])

    base64_file = None
    print("test")
    if files:
        image_path = files[0]
        # base64_file = encode_file(image_path)
        # print("debug"+image_path)
    # completion = await client.chat.completions.create(
    #     model="doubao-seed-2-0-mini-260215",
    #     messages=[
    #         {
    #             "role": "user",
    #             "content": [
    #                 {
    #                     "type": "image_url",
    #                     "image_url": {
    #                         "url": f"data:image/jpeg;base64,{base64_file}"
    #                     },
    #                 },
    #                 {
    #                     "type": "text",
    #                     "text": "用户会上传关于类似房间号的信息，图片可能翻转，描述图片中的正确文字信息",
    #                 },
    #             ],
    #         }
    #     ],
    # )
    #
    # print(completion.choices[0])
    completion = await client.responses.create(
        model="doubao-seed-1-6-flash-250828",
        input=[
            {"role": "user", "content": [
                {
                    "type": "input_image",
                    "image_url": f"file://{image_path}"
                },
                {
                    "type": "input_text",
                    "text": "Users will upload information such as room numbers and describe the text in the image accurately."
                }
            ]},
        ]
    )
    print(completion)
    case_agent = roomAgent(model=GPT_LLM_5)

    for chunk in case_agent.run_stream(completion, session_id, lat=lat, lng=lng):
        yield chunk

# def refresh_kb_manage():
#     kbs = list_kbs()
#     return (
#         gr.update(choices=kbs, value=None),  # kb_dropdown
#         gr.update(choices=[], value=None),  # service_dropdown
#         gr.update(choices=[], value=None),   # file_dropdown
#         gr.update(value=""),                 # file_content
#         gr.update(value="")                  # result
#     )



# -----------------------------
# Gradio UI：添加 image 上传组件
# -----------------------------
demo = gr.ChatInterface(
    fn=chat_pipeline,
    title="Agent",
    description=(
        "Enter your request, and the agent will automatically search for relevant documents.\n"
    ),
)

def chat_page():
    with gr.Blocks() as page:
        lat_box = gr.Textbox(visible=False, value="")
        lng_box = gr.Textbox(visible=False, value="")

        gr.ChatInterface(
            fn=chat_pipeline,
            title="Agent Assistant",
            multimodal=True,  # 👈 核心修改：开启多模态支持（允许上传图片/文件）
            additional_inputs=[lat_box, lng_box],
            description=(
                "Enter a natural language query, or click the button to the left of the text box to upload an image"
            ),
            examples=[

            ],
        )

        # 页面加载时自动获取浏览器定位，并写入隐藏输入框
        page.load(
            fn=None,
            inputs=[],
            outputs=[lat_box, lng_box],
            js="""
            async () => {
                if (!navigator.geolocation) return ["", ""];
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0,
                    });
                }).catch(() => null);
                if (!pos) return ["", ""];
                return [String(pos.coords.latitude), String(pos.coords.longitude)];
            }
            """,
        )
    return page

def upload_page():
    with gr.Blocks() as page:
        gr.Markdown("## 📁 File Upload / Knowledge Base Management")


        file_input = gr.File(
            label="Select a file",
            file_types=[".txt", ".log", ".pdf", ".md"],
            file_count="multiple",
        )

        upload_btn = gr.Button("Confirm Upload", variant="primary")

        output = gr.Textbox(label="处理结果", lines=8)

        upload_btn.click(
            fn=upload_files,
            inputs=[file_input],
            outputs=output
        )
    return page


def kb_manage_page():
    with gr.Blocks() as page:
        gr.Markdown("## Knowledge Base Management - Select a File and Edit")

        # 文件下拉列表
        file_dropdown = gr.Dropdown(
            label="List of Files",
            choices=list_files(),  # 这里直接列出所有文件
            interactive=True
        )

        # 显示文件内容，可编辑
        file_content = gr.Textbox(
            label="Document content (editable)",
            lines=20
        )

        # 保存 / 删除按钮
        save_btn = gr.Button("Save the file", variant="primary")
        delete_file_btn = gr.Button("Delete file")
        result = gr.Textbox(label="Operation results", lines=2)

        # 选择文件 → 读取内容
        file_dropdown.change(
            fn=readfile,
            inputs=[file_dropdown],
            outputs=file_content
        )

        # 保存文件
        save_btn.click(
            fn=save_file,
            inputs=[file_dropdown, file_content],
            outputs=result
        )

        # 删除文件
        delete_file_btn.click(
            fn=delete_file,
            inputs=[file_dropdown],
            outputs=result
        )

        # 页面加载时刷新文件列表
        def refresh_files():
            return gr.update(choices=list_files(), value=None)

        page.load(
            fn=refresh_files,
            outputs=file_dropdown
        )

    return page

with gr.Blocks() as demo:
    with gr.Tab(" Chat Search"):
        chat_page()

    with gr.Tab("File Upload"):
        upload_page()

    with gr.Tab("Knowledge Base Management"):
        kb_manage_page()

if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=7888
    )