package io

import (
	"encoding/json"
	"flag"
	"fmt"
	cfg "image-optimization/src/pkg/config"
	"image-optimization/src/pkg/image"
	"io"
	"log"
	"os"
	"runtime"
	"strconv"
	"strings"
)

func LoadConfig() cfg.Config {
	var config cfg.Config
	err := loadOptionsFromConfig(&config)

	if err != nil {
		fmt.Println("Error loading config, using defaults")
	}
	parseFlags(&config)
	printConfig(config)
	return config
}

func printConfig(config cfg.Config) {
	fmt.Printf(`
	
Using Configuration:
Input directory: %s
Output directory: %s
Workers: %d
Sizes: %v
Quality: %d
Output formats: %v

`, config.InputDir, config.OutputDir, config.Workers, config.Sizes, config.Quality, config.Formats,
	)
}

func parseFlags(config *cfg.Config) {
	defaultSizesArr := make([]string, len(config.Sizes))
	for idx, size := range config.Sizes {
		defaultSizesArr[idx] = strconv.Itoa(size)
	}

	defaultSizes := strings.Join(defaultSizesArr, ",")
	if config.Sizes == nil {
		defaultSizes = "320,640,1024,1920"
	}

	defaultWorkers := config.Workers
	if config.Workers < 1 {
		defaultWorkers = runtime.NumCPU() - 1
		if defaultWorkers < 1 {
			defaultWorkers = 1
		}
	}

	defaultFormats := strings.Join(config.Formats, ",")
	if config.Formats == nil {
		defaultFormats = "webp"
	}

	defaultQuality := config.Quality
	if config.Quality == 0 {
		defaultQuality = 80
	}

	defaultInputDir := config.InputDir
	if config.InputDir == "" {
		defaultInputDir = "./input"
	}

	defaultOutputDir := config.OutputDir
	if config.OutputDir == "" {
		defaultOutputDir = "./output"
	}

	inputDir := flag.String("input", defaultInputDir, "Input directory containing images")
	outputDir := flag.String("output", defaultOutputDir, "Output directory for processed images")
	workers := flag.Int("workers", defaultWorkers, "Number of concurrent workers")
	sizes_arg := flag.String("sizes", defaultSizes, "Comma-separated list of target sizes")
	quality := flag.Int("quality", defaultQuality, "Output image quality (1-100)")
	formats_arg := flag.String("formats", defaultFormats, "Comma-separated list of output formats")

	flag.Parse()

	var sizes []int
	for _, s := range strings.Split(*sizes_arg, ",") {
		size, err := strconv.Atoi(strings.TrimSpace(s))
		if err != nil {
			log.Fatalf("Invalid size value: %s", s)
		}
		sizes = append(sizes, size)
	}

	formats := strings.Split(*formats_arg, ",")
	for i, format := range formats {
		format = strings.ToLower(strings.TrimSpace(format))
		formats[i] = format
		if !image.IsSupportedImageFormat(format) {
			log.Fatalf("Unsupported format: %s (supported formats: jpg/jpeg, png, webp)\n", format)
		}
	}

	if *workers < 1 {
		log.Fatalln("Number of workers must be at least 1")
	}

	if *quality < 1 || *quality > 100 {
		log.Fatalln("Quality must be between 1 and 100")
	}

	config.InputDir = *inputDir
	config.OutputDir = *outputDir
	config.Workers = *workers
	config.Sizes = sizes
	config.Quality = *quality
	config.Formats = formats
}

func loadOptionsFromConfig(config *cfg.Config) error {

	path := *flag.String("config", "./config.json", "Path to config file")

	_, err := os.Stat(path)
	if err != nil {
		fmt.Println("Config file not found")
		return err
	}

	fmt.Println("Config file found, reading...")

	cfgFile, err := os.Open(path)

	if err != nil {
		fmt.Println("Error reading config file", err)
		return err
	}
	defer cfgFile.Close()

	bytes, err := io.ReadAll(cfgFile)

	if err != nil {
		fmt.Println("Error reading config file", err)
		return err
	}

	parseErr := json.Unmarshal(bytes, config)

	if parseErr != nil {
		fmt.Println("Error parsing config file", parseErr)
		return err
	}
	return nil
}
