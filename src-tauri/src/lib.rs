#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .invoke_handler(tauri::generate_handler![open_external_url])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    std::process::Command::new("rundll32")
      .args(["url.dll,FileProtocolHandler", &url])
      .spawn()
      .map_err(|error| error.to_string())?;
  }

  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open")
      .arg(&url)
      .spawn()
      .map_err(|error| error.to_string())?;
  }

  #[cfg(target_os = "linux")]
  {
    std::process::Command::new("xdg-open")
      .arg(&url)
      .spawn()
      .map_err(|error| error.to_string())?;
  }

  Ok(())
}
