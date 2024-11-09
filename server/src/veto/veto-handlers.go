package veto

import (
	"fmt"
	"math/rand/v2"
	"net/http"
	"slices"
	"sync"
	"time"

	"github.com/gogf/gf/frame/g"
	"github.com/gogf/gf/net/ghttp"
)

func CleanupMiddleware(r *ghttp.Request) {
	clientId := r.GetString("token")
	id := r.GetString("id")
	veto := GetVeto(id)

	if veto == nil || clientId == "" {
		r.Middleware.Next()
		return
	}

	ctx := r.Context()

	go func() {
		<-ctx.Done()
		veto.poll.Unsub(clientId)
	}()

	r.Middleware.Next()
}

func GetVetoHandler(r *ghttp.Request) {
	id := r.GetString("id")
	veto := GetVeto(id)
	if veto == nil {
		r.Response.WriteStatus(404)
		return
	}

	tokenInterface := r.GetQuery("token")
	token, ok := tokenInterface.(string)
	if !ok {
		r.Response.WriteStatus(400, "Invalid Token")
		return
	}

	var clientType string

	if token == veto.Config.Team1.Id {
		clientType = "team1"
	} else if token == veto.Config.Team2.Id {
		clientType = "team2"
	} else if token == veto.Config.ViewersToken {
		clientType = "viewer"
	}

	if clientType == "" {
		r.Response.WriteStatus(401)
		return
	}

	vetoResponse := VetoResponse{
		Id:         veto.Config.Id,
		ClientType: clientType,
		Team1:      TeamResponse{Name: veto.Config.Team1.Name, Index: veto.Config.Team1.Index},
		Team2:      TeamResponse{Name: veto.Config.Team2.Name, Index: veto.Config.Team2.Index},
		Maps:       veto.Config.Maps,
		Rounds:     veto.Config.Rounds,
		Stages:     veto.Config.Stages,
		Game:       veto.Config.Game,

		CurrentStage: veto.CurrentStage,
		Selected:     veto.Selected,
		Banned:       veto.Banned,
	}

	r.Response.Status = 200
	r.Response.WriteJson(vetoResponse)
}

func UpdateTeamHandler(r *ghttp.Request) {
	id := r.GetString("id")
	teamId := r.GetString("teamId")
	if id == "" || teamId == "" {
		r.Response.WriteStatus(400, "Veto id and team required")
		return
	}

	veto := GetVeto(id)
	if veto == nil {
		r.Response.WriteStatus(404, "Veto not found")
		return
	}

	veto.ExtendLifetime()

	var newData *Team
	if err := r.GetStruct(&newData); err != nil {
		r.Response.WriteStatus(400, "Invalid JSON")
		return
	}

	switch teamId {
	case veto.Config.Team1.Id:
		veto.Config.Team1.Name = newData.Name
	case veto.Config.Team2.Id:
		veto.Config.Team2.Name = newData.Name
	default:
		r.Response.WriteStatus(400, "Invalid team")
		return
	}

	vetoState := GetVetoPollData(veto)

	veto.poll.Send(vetoState)
	r.Response.WriteStatus(200)
}

func VetoPollHandler(r *ghttp.Request) {
	ctx := r.Context()
	id := r.GetString("id")

	if id == "" {
		r.Response.WriteStatus(400, "Veto id required")
		return
	}

	veto := GetVeto(id)

	if veto == nil {
		r.Response.WriteStatus(404, "Veto not found")
		return
	}

	clientId := r.GetString("token")
	if clientId == "" {
		r.Response.WriteStatus(400, "Token required")
		return
	}

	respChan := make(chan interface{})
	var once sync.Once
	veto.poll.Sub(clientId, func(data interface{}) {
		once.Do(func() {
			respChan <- data
		})
	})

	select {
	case data := <-respChan:
		fmt.Println(data)
		r.Response.WriteJson(data)
		return
	case <-time.After(time.Minute):
		r.Response.WriteStatus(http.StatusRequestTimeout)
	case <-ctx.Done():
		return
	}
}

func ActionHandler(r *ghttp.Request) {
	// Get Veto from Request
	id := r.GetString("id")
	veto := GetVeto(id)
	if veto == nil {
		r.Response.WriteStatus(404, "Session not found")
		return
	}

	veto.ExtendLifetime()

	// Get Action Props from Request
	var stageActionProps StageActionProps
	if err := r.GetStruct(&stageActionProps); err != nil {
		r.Response.WriteStatus(400, "Invalid JSON")
		return
	}

	// Check if the Team is valid
	if stageActionProps.TeamId != veto.Config.Team1.Id && stageActionProps.TeamId != veto.Config.Team2.Id {
		r.Response.WriteStatus(401)
		return
	}

	// Check if the current turn is the Tea=
	turnTeam := veto.Config.Stages[veto.CurrentStage].Team
	turnTeamId := veto.Config.Team1.Id

	if turnTeam == 2 {
		turnTeamId = veto.Config.Team2.Id
	}

	if stageActionProps.TeamId != turnTeamId {
		r.Response.WriteStatus(401)
		return
	}

	// Check if the Map is valid
	if !slices.Contains(veto.Config.Maps, stageActionProps.Map) {
		r.Response.WriteStatus(400, "Invalid Map")
		return
	}

	// Check if the Map is already selected or banned
	if slices.Contains(veto.Selected, stageActionProps.Map) || slices.Contains(veto.Banned, stageActionProps.Map) {
		r.Response.WriteStatus(400, "Map already selected or banned")
		return
	}

	stage := veto.GetCurrentStage()

	switch stage.Type {
	case "pick":
		if slices.Contains(veto.Selected, stageActionProps.Map) {
			r.Response.WriteStatus(400, "Map already selected")
			return
		}
		veto.Selected = append(veto.Selected, stageActionProps.Map)

	case "ban":
		if slices.Contains(veto.Banned, stageActionProps.Map) {
			r.Response.WriteStatus(400, "Map already banned")
			return
		}
		veto.Banned = append(veto.Banned, stageActionProps.Map)

	default:
		r.Response.WriteStatus(400, "Invalid Action")
		return
	}

	veto.CurrentStage++
	vetoState := GetVetoPollData(veto)
	veto.poll.Send(vetoState)

	// If the current stage is the decider stage, send a random map to the client
	newStage := veto.GetCurrentStage()
	if newStage.Type == "decider" {
		go func() {
			time.Sleep(time.Second)
			remainingMaps := veto.GetRemainingMaps()

			randIdx := rand.IntN(len(remainingMaps))
			randMap := remainingMaps[randIdx]

			veto.Selected = append(veto.Selected, randMap)
			vetoState := GetVetoPollData(veto)
			veto.poll.Send(vetoState)
		}()
	}

	r.Response.WriteStatus(200)
}

func InitialVetoStateHandler(r *ghttp.Request) {
	id := r.GetString("id")
	veto := GetVeto(id)

	if veto == nil {
		r.Response.WriteStatus(404)
		return
	}

	r.Response.WriteJson(GetVetoPollData(veto))
}

func StartVeto(r *ghttp.Request) {
	var props VetoConstructorProps
	if err := r.Parse(&props); err != nil {
		r.Response.WriteJsonExit(g.Map{"error": "Invalid request body"})
		return
	}

	veto := NewVeto(props, time.Second*10)
	r.Response.Status = http.StatusCreated
	r.Response.WriteJsonExit(g.Map{"id": veto.Config.Id})
}

func GetTokens(r *ghttp.Request) {
	id := r.GetString("id")
	veto := GetVeto(id)
	if veto == nil {
		r.Response.Status = http.StatusNotFound
		r.Response.WriteJsonExit(g.Map{"error": "Veto not found"})
		return
	}
	tokens := g.Map{
		"team1":   veto.Config.Team1.Id,
		"team2":   veto.Config.Team2.Id,
		"viewers": veto.Config.ViewersToken,
	}
	r.Response.WriteJsonExit(g.Map{"tokens": tokens})
}
