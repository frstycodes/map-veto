package veto

import (
	"errors"
	"fmt"
	stageAction "main/src/constants/stage-action"
	vetoPhase "main/src/constants/veto-phase"
	longpoll "main/src/poll"
	"main/src/utils"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Team struct {
	Id    string `json:"id"`
	Name  string `json:"name"`
	Index int    `json:"index"`
}

type PickedMap struct {
	Name         string `json:"name"`
	By           int    `json:"by"`
	Attacker     int    `json:"attacker"`
	SidePickTurn int    `json:"sidePickTurn"`
}

type BannedMap struct {
	Name string `json:"name"`
	By   int    `json:"by"`
}

type Stage struct {
	Team int    `json:"team"`
	Type string `json:"type"`
}

type VetoConfig struct {
	Id           string
	CreatorToken string
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
	Selected     []PickedMap
	Banned       []BannedMap
	Phase        string
	Logs         []Log
	Ended        bool

	poll      *longpoll.LongPoll
	resetChan chan struct{}
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
		Id:    id,
		Team1: team1,
		Team2: team2,

		CreatorToken: uuid.New().String(),
		ViewersToken: viewersToken,

		Maps:   props.Maps,
		Rounds: props.Rounds,
		Stages: props.Stages,
		Game:   props.Game,
	}

	veto := &Veto{
		Config:       config,
		CurrentStage: 0,
		Phase:        vetoPhase.ChooseMaps,

		poll:      longpoll.New(time.Minute),
		resetChan: make(chan struct{}),
	}

	veto.monitor(timeout)

	VetoMap[id] = veto

	log := NewLog(VetoInitializationEvent{
		Maps: props.Maps,
	},
	)
	veto.AddLog(log)

	fmt.Println("Veto Created. New Count: ", len(VetoMap))

	return veto
}

func (veto *Veto) AddLog(log Log) {
	fmt.Println(log.Event)
	veto.Logs = append(veto.Logs, log)
}

func (veto *Veto) monitor(timeout time.Duration) {
	timer := time.NewTimer(timeout)
	go func() {
		select {
		case <-veto.resetChan:
			// Stop monitoring a start a new one
			veto.monitor(timeout)
			return
		case <-timer.C:
			delete(VetoMap, veto.Config.Id)
			fmt.Println("Veto timed out. New count: ", len(VetoMap))
		}
	}()
}

func (veto *Veto) ExtendLifetime() {
	veto.resetChan <- struct{}{}
}

func (veto *Veto) GetCurrentStage() *Stage {
	if veto.CurrentStage >= len(veto.Config.Stages) {
		return nil
	}
	return &veto.Config.Stages[veto.CurrentStage]
}

func (veto *Veto) GetRemainingMaps() []string {
	var remainingMaps []string
	for _, mapName := range veto.Config.Maps {
		if !veto.IsPicked(mapName) && !veto.IsBanned(mapName) {
			remainingMaps = append(remainingMaps, mapName)
		}
	}
	return remainingMaps
}

func (veto *Veto) IsBanned(mapName string) bool {
	for _, bannedMaps := range veto.Banned {
		if bannedMaps.Name == mapName {
			return true
		}
	}
	return false
}

func (veto *Veto) IsPicked(mapName string) bool {
	for _, pickedMap := range veto.Selected {
		if pickedMap.Name == mapName {
			return true
		}
	}
	return false
}

func (veto *Veto) GetTurnTeam() *Team {
	stage := veto.GetCurrentStage()
	if stage.Team == 1 {
		return &veto.Config.Team1
	} else if stage.Team == 2 {
		return &veto.Config.Team2
	}
	return nil
}

func (veto *Veto) GetTeamFromIdx(idx int) *Team {
	if idx == 1 {
		return &veto.Config.Team1
	}
	if idx == 2 {
		return &veto.Config.Team2
	}
	return nil
}

func (veto *Veto) GetSidePickStage() (int, *PickedMap) {
	for idx, pickedMap := range veto.Selected {
		if pickedMap.Attacker == 0 {
			return idx, &pickedMap
		}
	}
	return (-1), nil
}

func (veto *Veto) GetTeamFromID(id string) *Team {
	if veto.Config.Team1.Id == id {
		return &veto.Config.Team1
	}
	if veto.Config.Team2.Id == id {
		return &veto.Config.Team2
	}
	return nil
}

func (veto *Veto) PickSide(isAttacker bool, team int) error {
	attackingTeam := team
	if !isAttacker {
		attackingTeam = 3 - team
	}

	pickedMap := PickedMap{
		Name:     veto.GetRemainingMaps()[0],
		By:       team,
		Attacker: attackingTeam,
	}
	veto.Selected = append(veto.Selected, pickedMap)

	var side = "defend"
	if isAttacker {
		side = "attack"
	}

	log := NewLog(SidePickEvent{
		Team: team,
		Map:  pickedMap.Name,
		Side: side,
	})
	veto.AddLog(log)

	return nil

}

func (veto *Veto) PickMap(mapName string, team int) error {
	if veto.IsPicked(mapName) {
		return errors.New("already-picked")
	}

	/* We check for 2 because if the map is decider [team == 0]
	 * then we want the team 1 to pick the side on that map.
	 * Since, Team 0 starts the ban, side pick order is Team 2 -> Team 1 -> Team 2
	 * So, we want [0,1] to resolve to Team 2 and 2 to resolve to Team 1
	 */

	var sidePickTurn = 2
	if team == 2 {
		sidePickTurn = 1
	}

	pickedMap := PickedMap{
		Name:         mapName,
		By:           team,
		SidePickTurn: sidePickTurn,
	}
	veto.Selected = append(veto.Selected, pickedMap)

	if team == 0 { // team is 0 when the map is decider
		log := NewLog(DeciderMapEvent{
			Map: mapName,
		})
		veto.AddLog(log)
	} else {
		log := NewLog(MapActionEvent{
			Map:    mapName,
			By:     team,
			Action: stageAction.Pick,
		})
		veto.AddLog(log)
	}

	return nil
}

func (veto *Veto) BanMap(mapName string, team int) error {
	if veto.IsBanned(mapName) {
		return errors.New("already-banned")
	}
	bannedMap := BannedMap{
		Name: mapName,
		By:   team,
	}
	veto.Banned = append(veto.Banned, bannedMap)

	log := NewLog(MapActionEvent{
		Map:    mapName,
		By:     team,
		Action: stageAction.Ban,
	})

	veto.AddLog(log)

	return nil
}

func (veto *Veto) SendPollData() {
	data := GetVetoPollData(veto)
	veto.poll.Send(data)
}

func GetVeto(id string) *Veto {
	veto, ok := VetoMap[id]
	if !ok {
		return nil
	}
	return veto
}

func (v *Veto) CheckIfEnded() {
	_, stage := v.GetSidePickStage()
	if stage == nil {
		v.Ended = true
	}

}

func GetVetoPollData(veto *Veto) *VetoPollResponse {
	return &VetoPollResponse{
		Team1:        veto.Config.Team1.Name,
		Team2:        veto.Config.Team2.Name,
		Selected:     veto.Selected,
		Banned:       veto.Banned,
		CurrentStage: veto.CurrentStage,
		Phase:        veto.Phase,
		Ended:        veto.Ended,
	}
}

var (
	VetoMap      = make(map[string]*Veto)
	VetoMapMutex sync.Mutex
)
