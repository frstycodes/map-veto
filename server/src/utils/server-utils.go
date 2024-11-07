package utils

import (
	"log"
	"path/filepath"

	"github.com/gogf/gf/net/ghttp"
	"github.com/gogf/gf/os/gfile"
	socketio "github.com/googollee/go-socket.io"
)

func StartSocketIO(server *socketio.Server) {
	if err := server.Serve(); err != nil {
		log.Fatalf("socketio listen error: %s\n", err)
	}
}

func ServeStatic(server *ghttp.Server, dir string, fallback string) {
	// Create public directory if it doesn't exist
	if !gfile.Exists(dir) {
		if err := gfile.Mkdir(dir); err != nil {
			log.Fatal("Failed to create public directory:", err)
		}
		log.Printf("Created public directory at: %s", dir)
	}

	server.SetServerRoot(dir)
	server.BindHandler("/*any", func(r *ghttp.Request) {
		r.Response.ServeFile(filepath.Join(dir, fallback))
	})
}
