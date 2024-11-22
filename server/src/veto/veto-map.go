package veto

// import (
// 	"sync"
// 	"time"
// )

// type ExpiringVeto struct {
// 	Veto       *Veto
// 	ExtendChan chan struct{}
// }

// func NewExpiringVeto(veto *Veto) *ExpiringVeto {
// 	return &ExpiringVeto{
// 		Veto:       veto,
// 		ExtendChan: make(chan struct{}),
// 	}
// }

// type AutoExpiringVetoMap struct {
// 	items map[string]*ExpiringVeto
// 	mu    sync.Mutex
// }

// func (m *AutoExpiringVetoMap) Get(key string) (*Veto, bool) {
// 	m.mu.Lock()
// 	defer m.mu.Unlock()
// 	expr, ok := m.items[key]
// 	return expr.Veto, ok
// }

// func (m *AutoExpiringVetoMap) Set(key string, value *Veto, timeout time.Duration) {
// 	m.mu.Lock()
// 	defer m.mu.Unlock()
// 	m.items[key] = value

// 	go func() {
// 		timer := time.NewTimer(timeout)
// 		select {
// 		case <-timer.C:
// 			m.Delete(key)
// 		case <-value.ExtendChan:
// 			return
// 		}
// 	}()
// }

// func (m *AutoExpiringVetoMap) Delete(key string) {
// 	m.mu.Lock()
// 	defer m.mu.Unlock()
// 	delete(m.items, key)
// }

// func (m *AutoExpiringVetoMap) ExtendLifetime(key string, timeout time.Duration) {
// 	m.mu.Lock()
// 	value, exists := m.Get(key)
// 	m.mu.RUnlock()

// 	if exists {
// 		m.Set(key, value, timeout)
// 	}
// }

// type ExpiringVeto struct {
// 	Veto       *Veto
// 	ExtendChan chan struct{}
// }

// func NewExpiringVeto(veto *Veto) *ExpiringVeto {
// 	return &ExpiringVeto{
// 		Veto:       veto,
// 		ExtendChan: make(chan struct{}),
// 	}
// }

// type AutoExpiringVetoMap struct {
// 	items map[string]*ExpiringVeto
// 	mu    sync.Mutex
// }

// func (m *AutoExpiringVetoMap) Get(key string) (*Veto, bool) {
// 	m.mu.Lock()
// 	defer m.mu.Unlock()
// 	expr, ok := m.items[key]
// 	return expr.Veto, ok
// }

// func (m *AutoExpiringVetoMap) Set(key string, value *Veto, timeout time.Duration) {
// 	m.mu.Lock()
// 	defer m.mu.Unlock()
// 	m.items[key] = value

// 	go func() {
// 		timer := time.NewTimer(timeout)
// 		select {
// 		case <-timer.C:
// 			m.Delete(key)
// 		case <-value.ExtendChan:
// 			return
// 		}
// 	}()
// }

// func (m *AutoExpiringVetoMap) Delete(key string) {
// 	m.mu.Lock()
// 	defer m.mu.Unlock()
// 	delete(m.items, key)
// }

// func (m *AutoExpiringVetoMap) ExtendLifetime(key string, timeout time.Duration) {
// 	m.mu.Lock()
// 	value, exists := m.Get(key)
// 	m.mu.RUnlock()

// 	if exists {
// 		m.Set(key, value, timeout)
// 	}
// }
