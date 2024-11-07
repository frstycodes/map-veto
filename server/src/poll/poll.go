package poll

import (
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/gogf/gf/net/ghttp"
)

type Client struct {
	onDone    func(data []byte)
	waitGroup *sync.WaitGroup
}

type LongPoll struct {
	queue []*Client
	mutex sync.Mutex
}

func (poll *LongPoll) Add(client *Client) {
	poll.mutex.Lock()
	defer poll.mutex.Unlock()

	poll.queue = append(poll.queue, client)
}

func (poll *LongPoll) Remove(client *Client) {
	poll.mutex.Lock()
	defer poll.mutex.Unlock()

	for i, c := range poll.queue {
		if c == client {
			poll.queue = append(poll.queue[:i], poll.queue[i+1:]...)
			break
		}
	}
}

func (poll *LongPoll) Send(data string) {
	poll.mutex.Lock()
	defer poll.mutex.Unlock()

	for _, client := range poll.queue {
		client.onDone([]byte(data))
		client.waitGroup.Done()
	}

	poll.queue = []*Client{} // Clear the queue after sending
}

func (poll *LongPoll) Handler(r *ghttp.Request, callback func(data []byte), timeoutDuration time.Duration) {
	client := &Client{
		onDone:    callback,
		waitGroup: &sync.WaitGroup{},
	}

	poll.Add(client)
	client.waitGroup.Add(1)

	done := make(chan bool)
	timeout := time.After(timeoutDuration)

	go func() {
		client.waitGroup.Wait()
		done <- true
	}()

	select {
	case <-done:
		return
	case <-timeout:
		r.Response.WriteStatus(http.StatusRequestTimeout)
		return
	}
}

var poll = LongPoll{}

func HandlePoll(r *ghttp.Request) {
	poll.Handler(r, func(data []byte) {
		r.Response.Write(data)
	}, 60*time.Second)
}

func SendEvent(r *ghttp.Request) {
	data, err := io.ReadAll(r.Body)
	if err != nil {
		r.Response.WriteStatus(http.StatusBadRequest)
		return
	}
	poll.Send(string(data))
	r.Response.Write(data)
}
