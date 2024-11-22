package main

import (
	"main/src/veto"

	"github.com/gogf/gf/frame/g"
	"github.com/gogf/gf/net/ghttp"
)

func cors(r *ghttp.Request) {
	r.Response.CORS(ghttp.CORSOptions{
		AllowOrigin: "*",
	})
	r.Middleware.Next()
}

func main() {
	s := g.Server()
	s.BindMiddlewareDefault(cors)

	// API Handlers
	s.Group("/api", func(group *ghttp.RouterGroup) {
		group.GET("/status", func(r *ghttp.Request) {
			r.Response.WriteJson(g.Map{
				"status": "ok",
			})
		})
		group.Group("/veto", func(vetoGroup *ghttp.RouterGroup) {
			vetoGroup.POST("/start", veto.StartVeto)
			vetoGroup.Group("/:id", func(idGroup *ghttp.RouterGroup) {
				idGroup.GET("/", veto.GetVetoHandler)
				idGroup.GET("/tokens", veto.GetTokens)
				idGroup.GET("/state", veto.InitialVetoStateHandler)
				idGroup.GET("/poll", veto.VetoPollHandler)
				idGroup.POST("/action", veto.ActionHandler)
				idGroup.POST("/pick-side", veto.SidePickHandler)
				idGroup.Group("/team/:teamId", func(teamGroup *ghttp.RouterGroup) {
					teamGroup.PUT("/", veto.UpdateTeamHandler)
				})
			})
		})
	})

	// Serve Frontend
	// utils.ServeStatic(s, filepath.Join(gfile.MainPkgPath(), "../../dist"), "index.html")

	s.SetPort(8000)
	s.Run()
}
