package veto

import "main/src/utils"

type Team struct {
	Id    string `json:"id"`
	Name  string `json:"name"`
	Index int    `json:"index"`
}

type Veto struct {
	Id           string   `json:"id"`
	Team1        Team     `json:"team1"`
	Team2        Team     `json:"team2"`
	ViewersToken string   `json:"viewersToken"`
	Maps         []string `json:"maps"`
	Rounds       int      `json:"rounds"`
	BanOrders    []string `json:"banOrders"`
	Game         string   `json:"game"`
}

type ConstructorProps struct {
	Game      string   `json:"game"`
	Rounds    int      `json:"rounds"`
	Maps      []string `json:"maps"`
	BanOrders []string `json:"banOrders"`
}

var VetoMap = make(map[string]*Veto)

func NewVeto(props ConstructorProps) *Veto {
	id := utils.GenerateID(nil, 7)
	viewersToken := utils.GenerateID(nil, 7)

	team1 := Team{
		Id:    utils.GenerateID(nil, 7),
		Name:  "Team 1",
		Index: 1,
	}
	team2 := Team{
		Id:    utils.GenerateID(nil, 7),
		Name:  "Team 2",
		Index: 2,
	}

	veto := &Veto{
		Id:           id,
		Team1:        team1,
		Team2:        team2,
		ViewersToken: viewersToken,
		Maps:         props.Maps,
		Rounds:       props.Rounds,
		BanOrders:    props.BanOrders,
		Game:         props.Game,
	}
	VetoMap[id] = veto
	return veto
}

func GetVeto(id string) *Veto {
	veto, ok := VetoMap[id]
	if !ok {
		return nil
	}
	return veto
}
