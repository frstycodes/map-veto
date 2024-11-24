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
	MyTeam       int          `json:"myTeam"`
	Team1        TeamResponse `json:"team1"`
	Team2        TeamResponse `json:"team2"`
	Maps         []string     `json:"maps"`
	Rounds       int          `json:"rounds"`
	Stages       []Stage      `json:"stages"`
	Game         string       `json:"game"`
	CurrentStage int          `json:"currentStage"`
	Selected     []PickedMap  `json:"selectedMaps"`
	Banned       []BannedMap  `json:"bannedMaps"`
}

type VetoConstructorProps struct {
	Game   string   `json:"game"`
	Rounds int      `json:"rounds"`
	Maps   []string `json:"maps"`
	Stages []Stage  `json:"stages"`
}

type VetoPollResponse struct {
	Team1        string      `json:"team1"`
	Team2        string      `json:"team2"`
	Selected     []PickedMap `json:"selected"`
	Banned       []BannedMap `json:"banned"`
	CurrentStage int         `json:"currentStage"`
	Phase        string      `json:"phase"`
	Ended        bool        `json:"ended"`
}

type StageActionProps struct {
	TeamId string `json:"teamId"`
	Map    string `json:"map"`
}

type PollData struct {
	Event string `json:"event"`
	Data  g.Map  `json:"data"`
}
