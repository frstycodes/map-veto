package utils

import (
	"image"
	"os"
)

func GetImageWidth(path string) (int, error) {
	file, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	img, _, err := image.DecodeConfig(file)
	if err != nil {
		return 0, err
	}

	return img.Width, nil

}
