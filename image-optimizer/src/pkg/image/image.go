package image

import (
	"image"
	"image/jpeg"
	"image/png"
	"os"
	"strings"

	"github.com/chai2010/webp"
)

var SUPPORTED_FORMATS = map[string]bool{
	"jpg":  true,
	"jpeg": true,
	"png":  true,
	"webp": true,
}

func JpegEncoder(file *os.File, image image.Image, quality int) error {
	return jpeg.Encode(file, image, &jpeg.Options{Quality: quality})
}

func PngEncoder(file *os.File, image image.Image, quality int) error {
	encoder := png.Encoder{CompressionLevel: png.BestCompression}
	return encoder.Encode(file, image)
}

func WebpEncoder(file *os.File, image image.Image, quality int) error {
	options := &webp.Options{
		Quality:  float32(quality),
		Lossless: false,
	}
	return webp.Encode(file, image, options)
}

func GetEncoder(format string) func(*os.File, image.Image, int) error {
	switch format {
	case "jpg", "jpeg":
		return JpegEncoder
	case "png":
		return PngEncoder
	case "webp":
		return WebpEncoder
	default:
		return nil
	}
}

func IsSupportedImageFormat(format string) bool {
	return SUPPORTED_FORMATS[strings.ToLower(format)]
}
