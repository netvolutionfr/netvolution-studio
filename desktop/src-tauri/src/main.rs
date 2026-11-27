// Netvolution Studio desktop application (ADR-0028): starts the unchanged Studio server
// (apps/studio/server.ts) with a bundled Node on a free local port, then points the window at it.
// No IPC is exposed to the page.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::{TcpListener, TcpStream};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Manager, RunEvent};

struct Server(Mutex<Option<Child>>);

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let started = Instant::now();
            let resources = app.path().resource_dir()?.join("app");
            let data = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data)?;
            // ponytail: free port picked then released; tiny race if another process grabs it first.
            let port = TcpListener::bind("127.0.0.1:0")?.local_addr()?.port();
            let node = std::env::current_exe()?.with_file_name(if cfg!(windows) { "node.exe" } else { "node" });
            // `--import` takes a URL: an absolute Windows path (C:\…) would read as a URL scheme.
            let hook = tauri::Url::from_file_path(resources.join("resolve-ns.mjs"))
                .map_err(|_| "resource path is not absolute")?;
            let mut command = Command::new(node);
            // Windows: no console window for the server.
            #[cfg(windows)]
            std::os::windows::process::CommandExt::creation_flags(&mut command, 0x0800_0000);
            let child = command
                .arg("--import")
                .arg(hook.as_str())
                .arg(resources.join("apps/studio/server.ts"))
                .env("NODE_ENV", "production")
                .env("HOST", "127.0.0.1")
                .env("PORT", port.to_string())
                .env("NS_DATA_DIR", &data)
                .env("NS_LAN_PREVIEW", "1")
                .spawn()?;
            app.manage(Server(Mutex::new(Some(child))));

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                while TcpStream::connect(("127.0.0.1", port)).is_err() {
                    if started.elapsed() > Duration::from_secs(20) {
                        eprintln!("Studio server did not start");
                        return handle.exit(1);
                    }
                    std::thread::sleep(Duration::from_millis(50));
                }
                eprintln!("Studio server ready in {} ms", started.elapsed().as_millis());
                let url = format!("http://127.0.0.1:{port}/").parse().expect("local URL");
                if let Some(window) = handle.get_webview_window("main") {
                    let _ = window.navigate(url);
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Tauri application")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                if let Some(mut child) = app.state::<Server>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        });
}
