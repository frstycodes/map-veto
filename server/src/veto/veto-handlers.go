package veto

import (
	"fmt"
	VetoConst "main/src/veto-constants"
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
	go veto.ExtendLifetime()

	tokenInterface := r.GetQuery("token")
	token, ok := tokenInterface.(string)
	if !ok {
		r.Response.WriteStatus(400, "Invalid Token")
		return
	}

	var clientType int = -1

	switch token {
	case veto.Config.Team1.Id:
		clientType = 1
	case veto.Config.Team2.Id:
		clientType = 2
	case veto.Config.ViewersToken:
		clientType = 0
	}

	if clientType == -1 {
		r.Response.WriteStatus(401)
		return
	}
	team1Response := TeamResponse{
		Name:  veto.Config.Team1.Name,
		Index: veto.Config.Team1.Index,
	}
	team2Response := TeamResponse{
		Name:  veto.Config.Team2.Name,
		Index: veto.Config.Team2.Index,
	}

	vetoResponse := VetoResponse{
		Id:         veto.Config.Id,
		ClientType: clientType,
		Team1:      team1Response,
		Team2:      team2Response,
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

	veto.SendPollData()
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

	var subscriberId = r.Session.Id()

	respChan := make(chan interface{})
	var once sync.Once
	veto.poll.Sub(subscriberId, func(data interface{}) {
		once.Do(func() {
			respChan <- data
		})
	})

	select {
	case data := <-respChan:
		r.Response.WriteJson(data)
		return
	case <-time.After(time.Minute):
		r.Response.WriteStatus(http.StatusRequestTimeout)
	case <-ctx.Done():
		veto.poll.Unsub(subscriberId)
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

	// Check if the current turn is the Team
	turnTeam := veto.GetTurnTeam()

	if turnTeam.Id == "" || turnTeam.Id != stageActionProps.TeamId {
		r.Response.WriteStatus(400, "Not your turn")
		return
	}

	// Check if the Map is valid
	if !slices.Contains(veto.Config.Maps, stageActionProps.Map) {
		r.Response.WriteStatus(400, "Invalid Map")
		return
	}

	stage := veto.GetCurrentStage()

	switch stage.Type {
	case "pick":
		err := veto.PickMap(stageActionProps.Map, stage.Team)
		if err != nil {
			r.Response.WriteStatus(400, "Map already selected")
			return
		}
		log := NewLog(fmt.Sprintf("Team %d(%s) picked %s.", turnTeam.Index, turnTeam.Name, stageActionProps.Map))
		veto.AddLog(log)

	case "ban":
		err := veto.BanMap(stageActionProps.Map, stage.Team)
		if err != nil {
			r.Response.WriteStatus(400, "Map already banned")
			return
		}

		log := NewLog(fmt.Sprintf("Team %d(%s) banned %s.", turnTeam.Index, turnTeam.Name, stageActionProps.Map))
		veto.AddLog(log)

	default:
		r.Response.WriteStatus(400, "Invalid Action")
		return
	}

	veto.CurrentStage++
	veto.SendPollData()

	// If the current stage is the decider stage, send a random map to the client
	newStage := veto.GetCurrentStage()
	if newStage.Type == "decider" {
		go func() {
			time.Sleep(time.Millisecond * 500)
			sendDeciderMap(veto)
			time.Sleep(time.Second)
			changePhase(veto)
		}()
	}

	r.Response.WriteStatus(200)
}

type SidePickProp struct {
	TeamId   string `json:"teamId"`
	Attacker bool   `json:"isAttacking"`
}

func SidePickHandler(r *ghttp.Request) {
	id := r.GetString("id")
	veto := GetVeto(id)
	if veto == nil {
		r.Response.WriteStatus(404, "Veto not found")
		return
	}

	veto.ExtendLifetime()

	var sidePickProps SidePickProp
	if err := r.GetStruct(&sidePickProps); err != nil {
		r.Response.WriteStatus(400, "Invalid JSON")
		return
	}

	turnTeam := veto.GetTeamFromID(sidePickProps.TeamId)

	if sidePickProps.TeamId != turnTeam.Id || turnTeam == nil {
		r.Response.WriteStatus(400, "Not your turn")
		return
	}

	idx, sidePickStage := veto.GetSidePickStage()

	if sidePickStage == nil {
		r.Response.WriteStatus(400, "Invalid stage")
		return
	}

	var attacker = turnTeam.Index
	if !sidePickProps.Attacker {
		attacker = 3 - turnTeam.Index
	}

	modifiedMap := PickedMap{
		Name:     sidePickStage.Name,
		By:       sidePickStage.By,
		Attacker: attacker,
	}

	veto.Selected[idx] = modifiedMap

	veto.SendPollData()

	r.Response.WriteStatus(200)

}

func changePhase(veto *Veto) {
	veto.Phase = VetoConst.ChooseSides
	veto.SendPollData()
}

func sendDeciderMap(veto *Veto) {
	remainingMaps := veto.GetRemainingMaps()

	randIdx := rand.IntN(len(remainingMaps))
	randMap := remainingMaps[randIdx]

	veto.Phase = VetoConst.ChooseSides
	veto.PickMap(randMap, 0)

	veto.logs = append(veto.logs, Log{
		Time:  time.Now(),
		Event: fmt.Sprintf("%s was chosen as the decider map.", randMap),
	})

	veto.SendPollData()
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

type StartVetoReponse struct {
	Id           string `json:"id"`
	CreatorToken string `json:"creatorToken"`
}

func StartVeto(r *ghttp.Request) {
	var props VetoConstructorProps
	if err := r.Parse(&props); err != nil {
		r.Response.WriteJsonExit(g.Map{"error": "Invalid request body"})
		return
	}

	veto := NewVeto(props, 5*time.Minute)
	r.Response.Status = http.StatusCreated

	res := StartVetoReponse{
		Id:           veto.Config.Id,
		CreatorToken: veto.Config.CreatorToken,
	}

	r.Response.WriteJsonExit(res)
}

func GetTokens(r *ghttp.Request) {
	id := r.GetString("id")
	creatorToken := r.GetString("creatorToken")
	veto := GetVeto(id)
	if veto == nil {
		r.Response.Status = http.StatusNotFound
		r.Response.WriteJsonExit(g.Map{"error": "Veto not found"})
		return
	}
	if veto.Config.CreatorToken != creatorToken {
		r.Response.Status = http.StatusUnauthorized
		r.Response.WriteJsonExit(g.Map{"error": "Unauthorized"})
		return
	}

	tokens := g.Map{
		"team1":   veto.Config.Team1.Id,
		"team2":   veto.Config.Team2.Id,
		"viewers": veto.Config.ViewersToken,
	}
	r.Response.WriteJsonExit(g.Map{"tokens": tokens})
}
