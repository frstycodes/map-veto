package api

import (
	"main/src/veto"
	"net/http"

	"github.com/gogf/gf/frame/g"
	"github.com/gogf/gf/net/ghttp"
)

func StartVeto(r *ghttp.Request) {
	var props veto.ConstructorProps
	if err := r.Parse(&props); err != nil {
		r.Response.WriteJsonExit(g.Map{"error": "Invalid request body"})
		return
	}

	veto := veto.NewVeto(props)
	r.Response.Status = http.StatusCreated
	r.Response.WriteJsonExit(g.Map{"id": veto.Id})
}

func GetTokens(r *ghttp.Request) {
	veto := veto.GetVeto(r.GetString("id"))
	if veto == nil {
		r.Response.Status = http.StatusNotFound
		r.Response.WriteJsonExit(g.Map{"error": "Veto not found"})
		return
	}
	tokens := g.Map{
		"team1":   veto.Team1.Id,
		"team2":   veto.Team2.Id,
		"viewers": veto.ViewersToken,
	}
	r.Response.WriteJsonExit(g.Map{"tokens": tokens})
}
