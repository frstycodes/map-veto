package main

import (
	"fmt"
	cfg "image-optimization/src/pkg/config"
	"image-optimization/src/pkg/image"
	"image-optimization/src/pkg/io"
	"image-optimization/src/pkg/utils"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/disintegration/imaging"
)

func createDir(dir string) {
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Fatal("Error creating output directory:", err)
	}
}

func main() {
	config := io.LoadConfig()

	createDir(config.OutputDir)

	var workersWg sync.WaitGroup
	var resultsWg sync.WaitGroup

	process := cfg.NewProcess()

	for i := 0; i < config.Workers; i++ {
		workersWg.Add(1)
		go worker(&process, &workersWg, config.Quality)
	}

	// RESULT CONSUMER
	resultsWg.Add(1)
	go func() {
		processResults(process.Results)
		resultsWg.Done()
	}()

	// TASK PRODUCER
	go func() {
		if err := processDir(process.Tasks, config); err != nil {
			log.Fatal("Error processing directory:", err)
		}
		close(process.Tasks)
	}()

	workersWg.Wait()
	close(process.Results)
	resultsWg.Wait()

	fmt.Println("Image optimization complete!")
}

func processDir(tasks chan<- cfg.Task, config cfg.Config) error {
	entries, err := os.ReadDir(config.InputDir)
	if err != nil {
		return fmt.Errorf("failed to read directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		filename := entry.Name()
		ext := strings.TrimLeft(strings.ToLower(filepath.Ext(filename)), ".")

		if !image.IsSupportedImageFormat(ext) {
			fmt.Printf("Warn: Skipping! Unsupported format: %s\n", filename)
			continue
		}

		inputPath := filepath.Join(config.InputDir, filename)

		originalWidth, err := utils.GetImageWidth(inputPath)
		if err != nil {
			log.Printf("Warn: Unable to retrieve dimensions for %s: %v\n", filename, err)
			continue
		}

		nameWithoutExt := strings.TrimSuffix(filename, filepath.Ext(filename))
		sizes := config.Sizes

		if !utils.Contains(sizes, originalWidth) {
			sizes = append(sizes, originalWidth)
		}

		for _, size := range sizes {
			if size > originalWidth {
				fmt.Printf("Skipping %s: original width %d is less than target width %d\n", filename, originalWidth, size)
				continue
			}

			for _, format := range config.Formats {
				outputFilename := fmt.Sprintf("%s-%dw.%s", nameWithoutExt, size, format)
				outputPath := filepath.Join(config.OutputDir, outputFilename)

				tasks <- cfg.Task{
					Filename:   filename,
					InputPath:  inputPath,
					Width:      size,
					OutputPath: outputPath,
					Format:     format,
				}
			}
		}
	}
	return nil
}

func processImage(task cfg.Task, quality int) error {
	src, err := imaging.Open(task.InputPath)
	if err != nil {
		return err
	}
	resized := imaging.Resize(src, task.Width, 0, imaging.Lanczos)

	output, err := os.Create(task.OutputPath)
	if err != nil {
		return err
	}

	defer output.Close()

	encoder := image.GetEncoder(task.Format)
	if encoder == nil {
		return fmt.Errorf("unsupported format: %s", task.Format)
	}

	return encoder(output, resized, quality)
}

func processResults(results chan cfg.Result) {
	for r := range results {
		if r.Err != nil {
			log.Printf("Error processing %s: %v\n", r.Task.Filename, r.Err)
			continue // Changed from return to continue to keep processing other results
		}
		fmt.Printf("Completed processing %s at %dpx width to %s\n", r.Task.Filename, r.Task.Width, r.Task.Format)
	}
}

func worker(process *cfg.Process, wg *sync.WaitGroup, quality int) {
	for task := range process.Tasks {
		err := processImage(task, quality)
		process.Results <- cfg.Result{Task: task, Err: err}
	}
	wg.Done()

}
