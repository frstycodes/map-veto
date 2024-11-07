package main

import (
	"main/src/poll"
	"main/src/utils"
	"path/filepath"

	"github.com/gogf/gf/frame/g"
	"github.com/gogf/gf/net/ghttp"
	"github.com/gogf/gf/os/gfile"

	"main/src/api"
)

func cors(r *ghttp.Request) {
	r.Response.CORS(ghttp.CORSOptions{
		AllowOrigin: "localhost:3000",
	})
	r.Middleware.Next()
}

func main() {
	s := g.Server()
	s.BindMiddlewareDefault(cors)

	// API Handlers
	s.Group("/api", func(group *ghttp.RouterGroup) {
		group.GET("/", func(r *ghttp.Request) {
			r.Response.Write("API")
		})
		group.Group("/veto", func(vetoGroup *ghttp.RouterGroup) {
			vetoGroup.POST("/start", api.StartVeto)
			vetoGroup.GET("/tokens/:id", api.GetTokens)
		})
		group.GET("/poll", poll.HandlePoll)
		group.POST("/poll", poll.SendEvent)
	})

	/*
		// Socket.io
		server := socketio.NewServer(&engineio.Options{
			Transports: []transport.Transport{&websocket.Transport{}},
		})
		defer server.Close()

		io.IOHandler(server)
		s.BindHandler("/socket.io/", func(r *ghttp.Request) { // Socket.io http handler
			server.ServeHTTP(r.Response.Writer, r.Request)
		})
	*/
	// Serve Frontend
	utils.ServeStatic(s, filepath.Join(gfile.MainPkgPath(), "../../dist"), "index.html")

	// go utils.StartSocketIO(server)
	s.SetPort(8000)
	s.Run()
}
