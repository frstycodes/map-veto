package cfg

type Config struct {
	InputDir  string   `json:"inputDir"`
	OutputDir string   `json:"outputDir"`
	Workers   int      `json:"workers"`
	Sizes     []int    `json:"sizes"`
	Quality   int      `json:"quality"`
	Formats   []string `json:"formats"`
}

type Task struct {
	Filename   string
	InputPath  string
	Width      int
	OutputPath string
	Format     string
}

type Result struct {
	Task Task
	Err  error
}

type Process struct {
	Tasks   chan Task
	Results chan Result
}

func NewProcess() Process {
	return Process{
		Tasks:   make(chan Task),
		Results: make(chan Result),
	}
}
