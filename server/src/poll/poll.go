package longpoll

import (
	"sync"
	"time"
)

// // Subscriber represents a client subscription
// type Subscriber struct {
// 	ID       string
// 	Callback func(interface{})
// 	Done     chan struct{}
// }

// // LongPoll represents a long polling instance
// type LongPoll struct {
// 	subscribers map[string]*Subscriber
// 	mu          sync.RWMutex
// 	timeout     time.Duration
// }

// // New creates a new LongPoll instance
// func New(timeout time.Duration) *LongPoll {
// 	return &LongPoll{
// 		subscribers: make(map[string]*Subscriber),
// 		timeout:     timeout,
// 	}
// }

// // Subscribe adds a new subscriber with a callback function
// func (lp *LongPoll) Sub(id string, callback func(interface{})) *Subscriber {
// 	lp.mu.Lock()
// 	defer lp.mu.Unlock()

// 	// Unsub before subscribing again
// 	lp.Unsub(id)

// 	subscriber := &Subscriber{
// 		ID:       id,
// 		Callback: callback,
// 		Done:     make(chan struct{}),
// 	}

// 	lp.subscribers[id] = subscriber
// 	return subscriber
// }

// // Unsubscribe removes a subscriber
// func (lp *LongPoll) Unsub(id string) {
// 	lp.mu.Lock()
// 	defer lp.mu.Unlock()

// 	if subscriber, exists := lp.subscribers[id]; exists {
// 		close(subscriber.Done)
// 		delete(lp.subscribers, id)
// 	}
// }

// // Send broadcasts data to all subscribers
// func (lp *LongPoll) Send(data interface{}) {
// 	for _, subscriber := range lp.subscribers {
// 		go func(s *Subscriber) {
// 			s.Callback(data)
// 		}(subscriber)
// 	}

// }

// // Count returns the number of active subscribers
// func (lp *LongPoll) Count() int {
// 	lp.mu.RLock()
// 	defer lp.mu.RUnlock()
// 	return len(lp.subscribers)
// }

// // Clear removes all subscribers
// func (lp *LongPoll) Clear() {
// 	lp.mu.Lock()
// 	defer lp.mu.Unlock()

// 	for _, subscriber := range lp.subscribers {
// 		close(subscriber.Done)
// 	}
// 	lp.subscribers = make(map[string]*Subscriber)
// }

type Subscriber struct {
	ID       string
	Callback func(interface{})
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

func (lp *LongPoll) Sub(id string, callback func(interface{})) *Subscriber {
	lp.mu.Lock()
	defer lp.mu.Unlock()

	delete(lp.subscribers, id)

	subscriber := &Subscriber{
		ID:       id,
		Callback: callback,
	}
	lp.subscribers[id] = subscriber
	return subscriber
}

func (lp *LongPoll) Unsub(id string) {
	lp.mu.Lock()
	defer lp.mu.Unlock()

	delete(lp.subscribers, id)
}

func (lp *LongPoll) Send(data interface{}) {
	for _, subscriber := range lp.subscribers {
		go func(s *Subscriber) {
			s.Callback(data)
		}(subscriber)
	}
}
