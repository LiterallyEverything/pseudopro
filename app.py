from flask import Flask, render_template, request, jsonify
from inter.pci import interpreter, InterpreterError
from queue import Queue
from threading import Thread
import os
import traceback

app = Flask(__name__)

input_queue = Queue()
output_queue = Queue()

waiting_for_input = False
running = False

SAVE_FOLDER = "saved"
os.makedirs(SAVE_FOLDER, exist_ok=True)

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
    value = request.json["input"]
    input_queue.put(value)
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
    with open(
        os.path.join(SAVE_FOLDER, filename),
        "w",
        encoding="utf-8"
    ) as f:
        f.write(code)
    return {"success": True}

if __name__ == "__main__":
    app.run(debug=True)