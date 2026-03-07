"""
client.py — Cliente de Chat TCP con Hilos
==========================================
Arquitectura:
  - Hilo principal     → lectura de teclado (envío de mensajes)
  - Hilo receptor      → recibe mensajes del servidor en background
  - stop_event         → señal de parada compartida entre ambos hilos
"""

import socket
import threading
import sys

# ─── Constantes ──────────────────────────────────────────────────────────────
HOST = "192.168.1.79"
PORT = 9999
BUFFER = 4096
ENCODING = "utf-8"


# ─── Evento de parada compartido ─────────────────────────────────────────────
stop_event = threading.Event()


# ─── Hilo receptor ───────────────────────────────────────────────────────────

def receive_messages(sock: socket.socket) -> None:
    """
    Corre en su propio hilo.
    Recibe mensajes del servidor y los imprime sin interrumpir
    la línea de entrada del usuario.
    """
    buffer = ""
    while not stop_event.is_set():
        try:
            data = sock.recv(BUFFER)
            if not data:
                print("\n[!] El servidor cerró la conexión.")
                stop_event.set()
                break

            buffer += data.decode(ENCODING)
            # Procesar mensajes completos (delimitados por \n)
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                if line:
                    # Limpiar la línea actual del input y reimprimir
                    print(f"\r{line}                ")
                    print("> ", end="", flush=True)

        except OSError:
            if not stop_event.is_set():
                print("\n[!] Conexión perdida con el servidor.")
            stop_event.set()
            break


# ─── Punto de entrada ─────────────────────────────────────────────────────────

def main() -> None:
    # ── Argumentos opcionales: python client.py <host> <port> ────────────────
    host = sys.argv[1] if len(sys.argv) > 1 else HOST
    port = int(sys.argv[2]) if len(sys.argv) > 2 else PORT

    # ── Crear y conectar el socket TCP ───────────────────────────────────────
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.connect((host, port))
    except ConnectionRefusedError:
        print(f"[!] No se pudo conectar a {host}:{port}. ¿Está el servidor corriendo?")
        sys.exit(1)

    print(f"[✔] Conectado al servidor {host}:{port}")
    print("    Comandos: @usuario <msg> para privado | /list | /quit\n")

    # ── Iniciar hilo receptor ─────────────────────────────────────────────────
    recv_thread = threading.Thread(
        target=receive_messages,
        args=(sock,),
        daemon=True,
        name="receiver",
    )
    recv_thread.start()

    # ── Bucle de envío (hilo principal) ──────────────────────────────────────
    try:
        while not stop_event.is_set():
            try:
                msg = input("> ")
            except EOFError:
                break

            if not msg.strip():
                continue

            try:
                sock.sendall((msg + "\n").encode(ENCODING))
            except OSError:
                print("[!] Error al enviar mensaje. Conexión perdida.")
                break

            if msg.strip() == "/quit":
                stop_event.set()
                break

    except KeyboardInterrupt:
        print("\n[!] Interrumpido por el usuario.")
        try:
            sock.sendall(("/quit\n").encode(ENCODING))
        except OSError:
            pass
    finally:
        stop_event.set()
        sock.close()
        print("[✔] Conexión cerrada.")


if __name__ == "__main__":
    main()
