import os
import shutil
# session_id -> 文件信息
SESSION_FILES = {}

BASE_KB_DIR = "./knowledge/"


#创建知识库和服务目录
def get_kb_dir(kb_name: str,service_name:str) -> str:
    print(kb_name)
    kb_dir = os.path.join(BASE_KB_DIR, kb_name)
    service_dir= os.path.join(kb_dir, service_name)
    os.makedirs(service_dir, exist_ok=True)
    return kb_dir

#上传文件
def upload_files(files):
    if not files:
        return "❌ 未上传任何文件"


    flag=False
    if not os.path.exists(os.path.join(os.path.join(BASE_KB_DIR),"metaInfo.toml")):
        for f in files:
            print(os.path.basename(f.name))
            if os.path.basename(f.name) == "metaInfo.txt":
                flag = True
    else:
        flag = True
    if not flag:
        return "❌请首先上传名称为metaInfo.txt的文件"

    infos = []
    for f in files:
        filename = os.path.basename(f.name)
        target_path = os.path.join(BASE_KB_DIR, filename)

        shutil.copy(f.name, target_path)
        infos.append(f"✅ {filename} ")

    return "\n".join(infos)

#文件的下拉栏
def list_files():
    if not os.path.exists(BASE_KB_DIR):
        return []
    return [
        d for d in os.listdir(BASE_KB_DIR)
    ]

#读取文件
def readfile(filename):
    path = os.path.join(BASE_KB_DIR,  filename)
    if not os.path.exists(path):
        return "❌ 文件不存在"

    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

#保存文件
def save_file(filename, content):
    path = os.path.join(BASE_KB_DIR, filename)
    if not os.path.exists(path):
        return "❌ 文件不存在"

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    return "✅ 文件已保存"

#删除文件
def delete_file(filename):
    path = os.path.join(BASE_KB_DIR, filename)
    if not os.path.exists(path):
        return "❌ 文件不存在"

    os.remove(path)
    return f"🗑️ 已删除文件：{filename}"