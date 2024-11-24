package veto

import "time"

type LogEvent interface {
	Event() string
}

type VetoInitializationEvent struct {
	Maps []string `json:"maps"`
}

func (e VetoInitializationEvent) Event() string {
	return "veto-initialize"
}

type MapActionEvent struct {
	Map    string `json:"map"`
	Action string `json:"action"` // "ban" | "pick"
	By     int    `json:"by"`     // 1 | 2
}

func (e MapActionEvent) Event() string {
	return "veto-map-action"
}

type DeciderMapEvent struct {
	Map string `json:"map"`
}

func (e DeciderMapEvent) Event() string {
	return "veto-decider-map"
}

type SidePickEvent struct {
	Map  string `json:"map"`
	Team int    `json:"team"`
	Side string `json:"side"` // "attack" | "defend"
}

func (e SidePickEvent) Event() string {
	return "veto-side-pick"
}

type Log struct {
	Time  time.Time `json:"time"`
	Event string    `json:"event"`
	Data  LogEvent  `json:"data"`
}

func NewLog(event LogEvent) Log {
	return Log{
		Time:  time.Now(),
		Event: event.Event(),
		Data:  event,
	}
}
