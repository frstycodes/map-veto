use image::EncodableLayout;
use serde::Deserialize;
use std::{
    fs::{self, DirEntry, File},
    path::PathBuf,
    thread::spawn,
};

#[derive(Deserialize, Clone, Debug)]
struct Config {
    input_dir: PathBuf,
    output_dir: PathBuf,
    sizes: Vec<u32>,
    quality: u8,
    /// If true, will delete the existing output directory before processing
    clean: bool,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            input_dir: PathBuf::from("./input"),
            output_dir: PathBuf::from("./output"),
            sizes: vec![360, 480, 640, 1024, 1920],
            quality: 85,
            clean: false,
        }
    }
}

fn load_cfg() -> Config {
    let cfg_path = match std::env::args().nth(1).as_deref() {
        Some(path) => PathBuf::from(path),
        None => PathBuf::from("./config.json"),
    };

    let file = File::open(&cfg_path)
        .unwrap_or_else(|_| panic!("Failed to open config file at {:?}", cfg_path.display()));

    serde_json::from_reader(file)
        .unwrap_or_else(|err| panic!("Failed to parse config file: {}", err))
}

fn ensure_working_dirs(config: &Config) {
    if !config.input_dir.exists() {
        panic!("Input directory does not exist: {:?}", config.input_dir);
    }

    if !config.output_dir.exists() {
        std::fs::create_dir_all(&config.output_dir).unwrap_or_else(|_| {
            panic!("Failed to create output directory: {:?}", config.output_dir)
        });
    }
}

fn main() {
    let config = load_cfg();
    ensure_working_dirs(&config);
    process_dir(config);
}

fn process_dir(config: Config) {
    let entries: Vec<DirEntry> = fs::read_dir(&config.input_dir)
        .unwrap()
        .map(|entry| entry.unwrap())
        .collect();

    let mut tasks = vec![];

    for entry in entries {
        if entry.file_type().unwrap().is_dir() {
            continue;
        }

        let file_name = entry.file_name().to_string_lossy().to_string();
        let ext = entry
            .path()
            .extension()
            .unwrap()
            .to_str()
            .unwrap_or("")
            .to_string();

        let input_path = entry.path();
        let original_width = match get_image_width(&input_path) {
            Ok(w) => w,
            Err(err) => {
                eprintln!(
                    "Warn: Unable to retrieve dimensions for {}: {}",
                    input_path.display(),
                    err
                );
                continue;
            }
        };

        let file_name_without_ext = file_name.replace(&format!(".{}", ext.to_string()), "");
        let sizes: Vec<&u32> = config
            .sizes
            .iter()
            .filter(|&size| *size <= original_width)
            .collect();

        if sizes.is_empty() {
            eprintln!(
                "Warn: No valid sizes for {} with width {}",
                file_name, original_width
            );
            continue;
        }

        for size in sizes {
            let output_file_name = format!("{}-{}w.webp", file_name_without_ext, size);
            let output_path = config.output_dir.join(&output_file_name);
            if !config.clean && output_path.exists() {
                println!(
                    "Skipping {} as it already exists in output directory",
                    output_file_name
                );
                continue;
            }

            let props = ProcessImageProps {
                input_path: input_path.clone(),
                output_path: output_path.clone(),
                size: *size,
                quality: config.quality,
            };

            let file_name_clone = file_name.clone();
            let size_clone = size.clone();
            let task = spawn(move || match process_image(props) {
                Ok(_) => println!(
                    "Completed processing {} at {}px width to {}",
                    file_name_clone, size_clone, output_file_name
                ),
                Err(err) => eprintln!("Error processing {}: {}", output_file_name, err),
            });

            tasks.push(task)
        }
    }

    for task in tasks {
        let _ = task.join();
    }
}

fn get_image_width(path: &PathBuf) -> Result<u32, String> {
    let img = image::open(path).map_err(|e| format!("Failed to open image: {}", e))?;
    let width = img.width();
    Ok(width)
}

struct ProcessImageProps {
    input_path: PathBuf,
    output_path: PathBuf,
    size: u32,
    quality: u8,
}

fn process_image(props: ProcessImageProps) -> Result<(), String> {
    let ProcessImageProps {
        input_path,
        output_path,
        size,
        quality,
    } = props;

    println!(
        "Processing {}: resizing to {}w and saving as WebP {}",
        input_path.display(),
        size,
        output_path.display()
    );

    let img = image::open(&input_path).map_err(|e| format!("Failed to open image:\n {}", e))?;

    let width = img.width();
    let height = img.height();

    let new_width = size;
    let new_height = (height as f32 * (new_width as f32 / width as f32)) as u32;

    let resized = img.resize_exact(new_width, new_height, image::imageops::FilterType::Lanczos3);

    let encoder = webp::Encoder::from_image(&resized)
        .map_err(|e| format!("Failed to create WebP encoder: {}", e))?;

    let res = encoder.encode(quality as f32);

    fs::write(&output_path, res.as_bytes())
        .map_err(|e| format!("Failed to write output file: {}", e))?;
    Ok(())
}
