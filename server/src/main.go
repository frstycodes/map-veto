package main

import (
	"log"
	"main/src/veto"
	"os"
	"strconv"

	"github.com/gogf/gf/frame/g"
	"github.com/gogf/gf/net/ghttp"
	_ "github.com/joho/godotenv/autoload"
)

func cors(r *ghttp.Request) {
	clientURL := os.Getenv("CLIENT_URL")
	r.Response.CORS(ghttp.CORSOptions{
		AllowOrigin:  clientURL,
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	})
	r.Middleware.Next()
}

func main() {
	s := g.Server()
	s.BindMiddlewareDefault(cors)
	timeout_var := os.Getenv("VETO_TIMEOUT")
	timeout, err := strconv.Atoi(timeout_var)
	if err != nil {
		log.Fatal(err)
	}

	// API Handlers
	s.Group("/api", func(group *ghttp.RouterGroup) {
		group.GET("/status", func(r *ghttp.Request) {
			r.Response.WriteJson(g.Map{
				"status": "ok",
			})
		})
		group.Group("/veto", func(vetoGroup *ghttp.RouterGroup) {
			vetoGroup.POST("/start", func(r *ghttp.Request) {
				veto.StartVeto(r, timeout)
			})
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
				idGroup.GET("/logs", veto.GetLogsHandler)
			})
		})
	})

	// Serve Frontend
	// utils.ServeStatic(s, filepath.Join(gfile.MainPkgPath(), "../../dist"), "index.html")

	s.SetPort(8000)
	s.Run()
}
