package ws

import "github.com/gorilla/websocket"

type Client struct {
	Id   string
	Room string
	Hub  *Hub
	ws   *websocket.Conn
}

type Hub struct {
	clients map[*Client]bool
	rooms   map[string]map[*Client]bool
	events  map[string]func(client *Client, data []byte)
}

func (client *Client) Send(event string, data []byte) {
	client.ws.WriteMessage(websocket.TextMessage, data)
}
