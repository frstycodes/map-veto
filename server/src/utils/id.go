package utils

import "math/rand"

func GenerateID(predicate func(string) bool, size int) string {
	chars := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	id := ""
	for {
		for i := 0; i < size; i++ {
			id += string(chars[rand.Intn(len(chars))])
		}
		if predicate == nil || predicate(id) {
			return id
		}
	}
}
