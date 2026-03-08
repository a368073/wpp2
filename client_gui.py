import socket
import threading
import tkinter as tk
from tkinter import scrolledtext

HOST = "192.168.1.70"
PORT = 9999
BUFFER = 4096
ENCODING = "utf-8"

class ChatClient:

    def __init__(self, root):
        self.root = root
        self.root.title("Chat TCP")
        self.root.geometry("500x500")

        # Área de chat
        self.chat_area = scrolledtext.ScrolledText(root, wrap=tk.WORD)
        self.chat_area.pack(padx=10, pady=10, fill=tk.BOTH, expand=True)
        self.chat_area.config(state="disabled")

        # Frame inferior
        bottom_frame = tk.Frame(root)
        bottom_frame.pack(fill=tk.X, padx=10, pady=10)

        self.msg_entry = tk.Entry(bottom_frame)
        self.msg_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0,10))
        self.msg_entry.bind("<Return>", self.send_message)

        self.send_button = tk.Button(bottom_frame, text="Enviar", command=self.send_message)
        self.send_button.pack(side=tk.RIGHT)

        # Conexión socket
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.connect((HOST, PORT))

        # Hilo receptor
        thread = threading.Thread(target=self.receive_messages)
        thread.daemon = True
        thread.start()

    def receive_messages(self):
        while True:
            try:
                message = self.sock.recv(BUFFER).decode(ENCODING)

                self.chat_area.config(state="normal")
                self.chat_area.insert(tk.END, message + "\n")
                self.chat_area.config(state="disabled")
                self.chat_area.yview(tk.END)

            except:
                break

    def send_message(self, event=None):
        message = self.msg_entry.get()

        if message.strip() == "":
            return

        try:
            self.sock.send((message + "\n").encode(ENCODING))
        except:
            pass

        self.msg_entry.delete(0, tk.END)


root = tk.Tk()
client = ChatClient(root)
root.mainloop()