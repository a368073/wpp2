"""
server.py — Servidor de Chat TCP con Hilos
==========================================
Arquitectura:
  - Hilo principal     → acepta conexiones entrantes (accept loop)
  - Hilo por cliente   → maneja cada cliente de forma independiente
  - Lock global        → protege el diccionario compartido de clientes
"""
import socket
import threading
import logging
import sys
import sqlite3

# ─── Configuración de logging ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)

# ─── Constantes ──────────────────────────────────────────────────────────────
HOST = "0.0.0.0"   # Escuchar en todas las interfaces
PORT = 9999
BUFFER = 4096
ENCODING = "utf-8"


# ─── Estado compartido (protegido por lock) ───────────────────────────────────
clients: dict[str, socket.socket] = {}   # {username: socket}
clients_lock = threading.Lock()


# ─── Utilidades de envío ──────────────────────────────────────────────────────

def send_msg(sock: socket.socket, msg: str) -> bool:
    """Envía un mensaje a un socket. Devuelve False si falla."""
    try:
        sock.sendall((msg + "\n").encode(ENCODING))
        return True
    except OSError:
        return False


def broadcast(msg: str, exclude: str | None = None) -> None:
    """Envía un mensaje a TODOS los clientes conectados (excepto exclude)."""
    with clients_lock:
        targets = {u: s for u, s in clients.items() if u != exclude}
    for username, sock in targets.items():
        if not send_msg(sock, msg):
            logging.warning("No se pudo enviar a %s", username)


def send_private(sender: str, target: str, msg: str) -> None:
    """Envía un mensaje privado de sender → target."""
    with clients_lock:
        target_sock = clients.get(target)
        sender_sock = clients.get(sender)

    if target_sock:
        send_msg(target_sock, f"[PRIVADO] {sender}: {msg}")
        if sender_sock:
            send_msg(sender_sock, f"[PRIVADO → {target}]: {msg}")
    else:
        if sender_sock:
            send_msg(sender_sock, f"[SERVIDOR] Usuario '{target}' no encontrado.")

#guardar usuario en la bd
def guardar_usuario(username):
    conn = sqlite3.connect("chat.db")
    cursor = conn.cursor()

    cursor.execute(
        "INSERT OR IGNORE INTO usuarios (username) VALUES (?)",
        (username,)
    )

    conn.commit()
    conn.close()

#guardar mensaje en la bd
def guardar_mensaje(username, mensaje):
    conn = sqlite3.connect("chat.db")
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO mensajes (username, mensaje) VALUES (?, ?)",
        (username, mensaje)
    )

    conn.commit()
    conn.close()

#historial de mensajes
def obtener_historial(limite=10):
    conn = sqlite3.connect("chat.db")
    cursor = conn.cursor()

    cursor.execute(
        "SELECT username, mensaje, fecha FROM mensajes ORDER BY id DESC LIMIT ?",
        (limite,)
    )

    mensajes = cursor.fetchall()
    conn.close()

    return mensajes[::-1]

# ─── Manejo de un cliente ─────────────────────────────────────────────────────

def handle_client(sock: socket.socket, addr: tuple) -> None:
    """
    Ejecutado en un hilo dedicado por cada cliente.
    Protocolo de handshake:
      1. Servidor pide nombre de usuario
      2. Cliente envía su username
      3. Servidor confirma o rechaza (si ya existe)
    Protocolo de mensajes:
      - Broadcast  → cualquier texto plano
      - Privado    → @destinatario mensaje
      - Salir      → /quit
      - Lista      → /list
    """
    username = None
    try:
        # ── Handshake: registro de usuario ───────────────────────────────────
        send_msg(sock, "[SERVIDOR] Bienvenido. Ingresa tu nombre de usuario:")

        raw = sock.recv(BUFFER)
        if not raw:
            sock.close()
            return

        username = raw.decode(ENCODING).strip()

        with clients_lock:
            if username in clients:
                send_msg(sock, "[SERVIDOR] Ese nombre ya está en uso. Desconectando.")
                sock.close()
                return
            clients[username] = sock
            guardar_usuario(username)

        logging.info("✔ %s conectado desde %s:%s", username, *addr)
        send_msg(sock, f"[SERVIDOR] Hola {username}! Usa @usuario para mensajes privados, /list para ver usuarios, /historial para ver el historial, /quit para salir.")
        broadcast(f"[SERVIDOR] {username} se unió al chat.", exclude=username)

        # ── Bucle de recepción de mensajes ────────────────────────────────────
        while True:
            raw = sock.recv(BUFFER)
            if not raw:
                break   # Conexión cerrada por el cliente

            msg = raw.decode(ENCODING).strip()
            if not msg:
                continue

            logging.info("MSG de %s: %s", username, msg)

            # Comando: salir
            if msg == "/quit":
                send_msg(sock, "[SERVIDOR] Hasta luego!")
                break

            # Comando: listar usuarios
            elif msg == "/list":
                with clients_lock:
                    user_list = ", ".join(clients.keys())
                send_msg(sock, f"[SERVIDOR] Usuarios conectados: {user_list}")
            
            #comando ver historial
            elif msg == "/historial":
                mensajes = obtener_historial()
                for user, mensaje, fecha in mensajes:
                    send_msg(sock, f"{fecha} {user}: {mensaje}")
                

            # Mensaje privado: @destinatario texto
            elif msg.startswith("@"):
                parts = msg[1:].split(" ", 1)
                if len(parts) == 2:
                    target, private_msg = parts
                    send_private(username, target, private_msg)
                else:
                    send_msg(sock, "[SERVIDOR] Formato: @usuario mensaje")

            #guardar mensajes cuandos e escriben en el chat
            else:
                guardar_mensaje(username, msg)
                broadcast(f"{username}: {msg}", exclude=username)

    except ConnectionResetError:
        logging.warning("Conexión reseteada por %s", username or addr)
    except OSError as e:
        logging.error("Error de E/S con %s: %s", username or addr, e)
    finally:
        _disconnect(username, sock)


def _disconnect(username: str | None, sock: socket.socket) -> None:
    """Limpia el estado al desconectar un cliente."""
    sock.close()
    if username:
        with clients_lock:
            clients.pop(username, None)
        logging.info("✖ %s desconectado.", username)
        broadcast(f"[SERVIDOR] {username} salió del chat.")


# ─── Inicialización de Base de Datos ─────────────────────────────────────────────────────────

def init_db():
    conn = sqlite3.connect("chat.db")
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS mensajes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            mensaje TEXT,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# ─── Punto de entrada ─────────────────────────────────────────────────────────

def main() -> None:
    init_db()
    server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    try:
        server_sock.bind((HOST, PORT))
    except OSError as e:
        logging.error("No se pudo bindear %s:%s → %s", HOST, PORT, e)
        sys.exit(1)

    server_sock.listen()
    logging.info("Servidor escuchando en %s:%s", HOST, PORT)
    logging.info("Ctrl+C para detener.\n")

    try:
        while True:
            try:
                client_sock, addr = server_sock.accept()
            except OSError:
                break   # Servidor cerrando

            # Un hilo por cliente — procesamiento paralelo
            t = threading.Thread(
                target=handle_client,
                args=(client_sock, addr),
                daemon=True,          # Muere si el proceso principal termina
                name=f"client-{addr[1]}",
            )
            t.start()
            logging.info("Hilos activos: %d", threading.active_count() - 1)

    except KeyboardInterrupt:
        logging.info("\nDeteniendo servidor...")
    finally:
        broadcast("[SERVIDOR] El servidor se está cerrando.")
        server_sock.close()
        logging.info("Servidor cerrado.")


if __name__ == "__main__":
    main()
