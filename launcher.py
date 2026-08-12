import threading
import time
import webview
from app import app

def start_flask():
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        use_reloader=False
    )

def center_window(window):
    screens = webview.screens
    if screens:
        primary = screens[0]
        center_x = int((primary.width - window.width) / 2)
        center_y = int((primary.height - window.height) / 2)
        center_x = max(0, center_x)
        center_y = max(0, center_y)
        window.move(center_x, center_y)

if __name__ == "__main__":
    flask_thread = threading.Thread(
        target=start_flask,
        daemon=True
    )
    flask_thread.start()
    time.sleep(1)
    window = webview.create_window(
        "PseudoPro",
        "http://127.0.0.1:5000",
        width=1200,
        height=800,
        resizable=True,
    )
    webview.start(func=center_window, args=window)