package veto

import (
	"github.com/gogf/gf/frame/g"
)

type TeamResponse struct {
	Name  string `json:"name"`
	Index int    `json:"index"`
}

type VetoResponse struct {
	Id           string       `json:"id"`
	ClientType   string       `json:"clientType"`
	Team1        TeamResponse `json:"team1"`
	Team2        TeamResponse `json:"team2"`
	Maps         []string     `json:"maps"`
	Rounds       int          `json:"rounds"`
	Stages       []Stage      `json:"stages"`
	Game         string       `json:"game"`
	CurrentStage int          `json:"currentStage"`
	Selected     []string     `json:"selectedMaps"`
	Banned       []string     `json:"bannedMaps"`
}

type VetoConstructorProps struct {
	Game   string   `json:"game"`
	Rounds int      `json:"rounds"`
	Maps   []string `json:"maps"`
	Stages []Stage  `json:"stages"`
}

type VetoPollResponse struct {
	Team1        string `json:"team1"`
	Team2        string `json:"team2"`
	Selected     []string
	Banned       []string
	CurrentStage int
}

type StageActionProps struct {
	TeamId string `json:"teamId"`
	Map    string `json:"map"`
}

type PollData struct {
	event string `json:"event"`
	data  g.Map  `json:"data"`
}
