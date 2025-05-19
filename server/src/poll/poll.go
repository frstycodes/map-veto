package longpoll

import (
	"sync"
	"time"
)

type Subscriber struct {
	ID       string
	Callback func(any)
}

type LongPoll struct {
	subscribers map[string]*Subscriber
	mu          sync.RWMutex
	timeout     time.Duration
}

func New(time time.Duration) *LongPoll {
	return &LongPoll{
		subscribers: make(map[string]*Subscriber),
		timeout:     time,
		mu:          sync.RWMutex{},
	}
}

func (lp *LongPoll) Sub(id string, callback func(any)) *Subscriber {
	lp.mu.Lock()
	defer lp.mu.Unlock()

	delete(lp.subscribers, id)

	subscriber := Subscriber{
		ID:       id,
		Callback: callback,
	}
	lp.subscribers[id] = &subscriber
	return &subscriber
}

func (lp *LongPoll) Unsub(id string) {
	lp.mu.Lock()
	defer lp.mu.Unlock()

	delete(lp.subscribers, id)
}

func (lp *LongPoll) Send(data any) {
	for _, subscriber := range lp.subscribers {
		go func(s *Subscriber) {
			s.Callback(data)
		}(subscriber)
	}
}
