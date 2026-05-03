import base64

def encode_file(file_path):
  with open(file_path, "rb") as read_file:
    return base64.b64encode(read_file.read()).decode('utf-8')