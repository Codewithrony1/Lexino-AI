use tauri::Manager;
use std::net::ToSocketAddrs;
use std::net::TcpStream;
use std::time::Duration;

fn is_online(host: &str) -> bool {
    let address = format!("{}:443", host);
    if let Ok(mut addrs) = address.to_socket_addrs() {
        if let Some(addr) = addrs.next() {
            return TcpStream::connect_timeout(&addr, Duration::from_secs(4)).is_ok();
        }
    }
    false
}

#[tauri::command]
fn check_connection(window: tauri::WebviewWindow) -> bool {
    let production_url = std::env::var("LEXINO_PRODUCTION_URL")
        .unwrap_or_else(|_| "https://lexinoai.vercel.app".to_string());
    
    let host = production_url
        .replace("https://", "")
        .replace("http://", "")
        .split('/')
        .next()
        .unwrap_or("lexinoai.vercel.app")
        .to_string();
        
    if is_online(&host) {
        let chat_url = format!("{}/chat", production_url);
        if let Ok(parsed_url) = tauri::Url::parse(&chat_url) {
            let _ = window.navigate(parsed_url);
            return true;
        }
    }
    false
}

#[tauri::command]
fn open_in_browser(app: tauri::AppHandle, url: String) {
    use tauri_plugin_shell::ShellExt;
    let _ = app.shell().open(url, None);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![check_connection, open_in_browser])
        .setup(|app| {
            let production_url = std::env::var("LEXINO_PRODUCTION_URL")
                .unwrap_or_else(|_| "https://lexinoai.vercel.app".to_string());
            
            let host = production_url
                .replace("https://", "")
                .replace("http://", "")
                .split('/')
                .next()
                .unwrap_or("lexinoai.vercel.app")
                .to_string();

            if is_online(&host) {
                if let Some(window) = app.get_webview_window("main") {
                    let chat_url = format!("{}/chat", production_url);
                    if let Ok(parsed_url) = tauri::Url::parse(&chat_url) {
                        let _ = window.navigate(parsed_url);
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
