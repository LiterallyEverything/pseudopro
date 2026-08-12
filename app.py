from flask import Flask, render_template, request, jsonify, send_from_directory
from inter.pci import interpreter, InterpreterError
from queue import Queue
from threading import Thread
import os
import sys
import traceback

if getattr(sys, "frozen", False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)

input_queue = Queue()
output_queue = Queue()
waiting_for_input = False
running = False

SAVE_FOLDER = os.path.join(BASE_DIR, "saved")
EXAMPLES_FOLDER = os.path.join(BASE_DIR, "examples")
os.makedirs(SAVE_FOLDER, exist_ok=True)

for filename in os.listdir(SAVE_FOLDER):
    path = os.path.join(SAVE_FOLDER, filename)
    if os.path.isfile(path):
        try:
            os.remove(path)
        except OSError:
            pass

open_files = set()

def run_interpreter(inter, code):
    global running
    try:
        inter.initRun(code)
    except InterpreterError as e:
        output_queue.put({
            "text": str(e),
            "type": "error"
        })
    except Exception:
        output_queue.put({
            "text": traceback.format_exc(),
            "type": "error"
        })
    finally:
        running = False

def input_callback():
    global waiting_for_input
    waiting_for_input = True
    value = input_queue.get()
    waiting_for_input = False
    return value

@app.route("/")
def home():
    return render_template("splash.html")

@app.route("/app")
def application():
    return render_template("index.html")

@app.post("/run")
def run():
    global running
    if running:
        return {
            "success": False,
            "message": "A program is already running."
        }
    running = True
    while not output_queue.empty():
        output_queue.get()
    code = request.json["code"]
    inter = interpreter()
    inter.output_callback = lambda text: output_queue.put({
        "text": str(text),
        "type": "output"
    })
    inter.input_callback = input_callback
    Thread(
        target=run_interpreter,
        args=(inter, code),
        daemon=True
    ).start()
    return {"success": True}

@app.get("/output")
def output():
    outputs = []
    while not output_queue.empty():
        outputs.append(output_queue.get())
    return jsonify(outputs)

@app.post("/input")
def receive_input():
    input_queue.put(request.json["input"])
    return {"success": True}

@app.get("/waiting")
def waiting():
    return {
        "waiting": waiting_for_input
    }

@app.post("/save")
def save():
    data = request.json
    filename = os.path.basename(data["filename"])
    code = data["code"]
    if filename not in open_files:
        return {
            "success": False,
            "message": "File is not open."
        }
    path = os.path.join(SAVE_FOLDER, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    return {"success": True}

@app.post("/open")
def open_file():
    filename = os.path.basename(request.json["filename"])
    if filename in open_files:
        return {
            "success": False,
            "message": "A file with that name is already open."
        }
    path = os.path.join(SAVE_FOLDER, filename)
    if not os.path.exists(path):
        return {
            "success": False,
            "message": "File does not exist."
        }
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()
    open_files.add(filename)
    return {
        "success": True,
        "code": code
    }

@app.post("/new")
def new_file():
    filename = os.path.basename(request.json["filename"])
    if filename in open_files:
        return {
            "success": False,
            "message": "A file with that name is already open."
        }
    path = os.path.join(SAVE_FOLDER, filename)
    if os.path.exists(path):
        return {
            "success": False,
            "message": "File already exists."
        }
    open(path, "w", encoding="utf-8").close()
    open_files.add(filename)
    return {"success": True}

@app.post("/close")
def close_file():
    filename = os.path.basename(request.json["filename"])
    if filename not in open_files:
        return {
            "success": False,
            "message": "File is not open."
        }
    open_files.remove(filename)
    path = os.path.join(SAVE_FOLDER, filename)
    if os.path.exists(path):
        os.remove(path)
    return {"success": True}

@app.get("/files")
def list_files():
    files = []
    for filename in os.listdir(SAVE_FOLDER):
        path = os.path.join(SAVE_FOLDER, filename)
        if os.path.isfile(path):
            files.append(filename)
    return jsonify(files)

@app.get("/examples")
def list_examples():
    examples = []
    if not os.path.exists(EXAMPLES_FOLDER):
        return jsonify(examples)
    for filename in os.listdir(EXAMPLES_FOLDER):
        if filename.endswith(".pseudo"):
            examples.append(filename)
    examples.sort()
    return jsonify(examples)

@app.get("/examples/<filename>")
def get_example(filename):
    filename = os.path.basename(filename)
    if not filename.endswith(".pseudo"):
        return {
            "success": False,
            "message": "Invalid example file."
        }
    path = os.path.join(EXAMPLES_FOLDER, filename)
    if not os.path.exists(path):
        return {
            "success": False,
            "message": "Example file does not exist."
        }
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()
    return {
        "success": True,
        "code": code
    }

@app.post("/exit")
def exit_app():
    def shutdown():
        import time
        time.sleep(0.2)
        os._exit(0)
    Thread(target=shutdown, daemon=True).start()
    return {"success": True}

@app.route("/documentation")
def documentation():
    return send_from_directory(BASE_DIR, "documentation.pdf")

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )