package veto

import (
	"fmt"
	longpoll "main/src/poll"
	"main/src/utils"
	"slices"
	"sync"
	"time"
)

type Team struct {
	Id    string `json:"id"`
	Name  string `json:"name"`
	Index int    `json:"index"`
}

type Stage struct {
	Team int    `json:"team"`
	Type string `json:"type"`
}

type VetoConfig struct {
	Id           string
	Team1        Team
	Team2        Team
	ViewersToken string
	Maps         []string
	Rounds       int
	Stages       []Stage
	Game         string
}

type Veto struct {
	Config       VetoConfig
	CurrentStage int
	Selected     []string
	Banned       []string
	poll         *longpoll.LongPoll
	resetChan    chan struct{}
}

func NewVeto(props VetoConstructorProps, timeout time.Duration) *Veto {
	VetoMapMutex.Lock()
	defer VetoMapMutex.Unlock()

	id := utils.GenerateID(nil, 7)
	viewersToken := utils.GenerateID(nil, 7)

	team1 := Team{
		Id:    utils.GenerateID(nil, 7),
		Index: 1,
	}
	team2 := Team{
		Id:    utils.GenerateID(nil, 7),
		Index: 2,
	}

	config := VetoConfig{
		Id:           id,
		Team1:        team1,
		Team2:        team2,
		ViewersToken: viewersToken,
		Maps:         props.Maps,
		Rounds:       props.Rounds,
		Stages:       props.Stages,
		Game:         props.Game,
	}

	veto := &Veto{
		Config:       config,
		CurrentStage: 0,
		poll:         longpoll.New(time.Minute),
	}

	go veto.monitor(timeout)

	VetoMap[id] = veto

	fmt.Println("Veto Created")
	fmt.Println("New Veto Count: ", len(VetoMap))

	return veto
}

func (veto *Veto) monitor(timeout time.Duration) {
	timer := time.NewTimer(timeout)
	select {
	case <-veto.resetChan:
		// Stop monitoring a start a new one
		go veto.monitor(timeout)
		return
	case <-timer.C:
		delete(VetoMap, veto.Config.Id)
		fmt.Println("Veto timed out. New count: ", len(VetoMap))
	}
}

func (veto *Veto) ExtendLifetime() {
	veto.resetChan <- struct{}{}
}

func (veto *Veto) GetCurrentStage() Stage {
	veto.ExtendLifetime()
	return veto.Config.Stages[veto.CurrentStage]
}

func (veto *Veto) GetRemainingMaps() []string {
	veto.ExtendLifetime()

	var remainingMaps []string
	for _, mapName := range veto.Config.Maps {
		if !slices.Contains(veto.Selected, mapName) && !slices.Contains(veto.Banned, mapName) {
			remainingMaps = append(remainingMaps, mapName)
		}
	}
	return remainingMaps
}

func GetVeto(id string) *Veto {
	veto, ok := VetoMap[id]
	if !ok {
		return nil
	}
	return veto
}

func GetVetoPollData(veto *Veto) *VetoPollResponse {
	return &VetoPollResponse{
		Team1:        veto.Config.Team1.Name,
		Team2:        veto.Config.Team2.Name,
		Selected:     veto.Selected,
		Banned:       veto.Banned,
		CurrentStage: veto.CurrentStage,
	}
}

var (
	VetoMap      = make(map[string]*Veto)
	VetoMapMutex sync.Mutex
)
