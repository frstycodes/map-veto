package io

import (
	"log"

	socketio "github.com/googollee/go-socket.io"
)

func IOHandler(server *socketio.Server) {
	server.OnConnect("/", func(socket socketio.Conn) error {
		socket.SetContext("")
		log.Println("connected:", socket.ID())
		return nil
	})

	server.OnEvent("/", "hi", func(socket socketio.Conn, msg string) {
		log.Println("hi:", msg)
	})

	server.OnError("/", func(socket socketio.Conn, e error) {
		log.Println("meet error:", e)
	})

	server.OnDisconnect("/", func(socket socketio.Conn, reason string) {
		log.Println("closed", reason)
	})

}
