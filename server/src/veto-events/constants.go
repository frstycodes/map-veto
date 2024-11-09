package VetoEvents

import "github.com/gogf/gf/frame/g"

const (
	UpdateTeam = "update-team"
	Pick       = "pick"
	Ban        = "ban"
	Decider    = "decider"
)

type PollPayload struct {
	event string `json:"event"`
	data  g.Map  `json:"data"`
}
