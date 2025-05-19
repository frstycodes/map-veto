package utils

import "math/rand"

func GenerateID(predicate func(string) bool, size int) string {
	chars := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	id := ""
	len := len(chars)
	for {
		for range size {
			id += string(chars[rand.Intn(len)])
		}
		if predicate == nil || predicate(id) {
			return id
		}
	}
}
