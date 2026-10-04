pub mod core;
#[cfg(feature = "desktop")]
mod desktop {
    use crate::core::{self, ChatResult, Config, Documents, Message, Model, Snapshot, Store};
    use serde::Serialize;
    use std::sync::Mutex;
    use tauri::{ipc::Channel, AppHandle, Manager, State};
    use tauri_plugin_autostart::ManagerExt;
    use tauri_plugin_global_shortcut::{
        Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
    };

    #[derive(Clone, Serialize)]
    struct Token {
        text: String,
    }
    struct RuntimeStatus(Mutex<Vec<String>>);
    fn reveal(app: &AppHandle) {
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.unminimize();
            let _ = w.show();
            let _ = w.set_focus();
        }
    }
    #[tauri::command]
    fn snapshot(store: State<'_, Store>) -> Result<Snapshot, String> {
        store.snapshot()
    }
    #[tauri::command]
    fn runtime_status(status: State<'_, RuntimeStatus>) -> Result<Vec<String>, String> {
        Ok(status.0.lock().map_err(|e| e.to_string())?.clone())
    }
    #[tauri::command]
    fn messages(id: String, store: State<'_, Store>) -> Result<Vec<Message>, String> {
        store.messages(&id)
    }
    #[tauri::command]
    fn new_conversation(store: State<'_, Store>) -> Result<String, String> {
        store.new_conversation()
    }
    #[tauri::command]
    fn save_settings(
        app: AppHandle,
        config: Config,
        documents: Documents,
        store: State<'_, Store>,
    ) -> Result<(), String> {
        let _guard = store
            .work
            .try_lock()
            .map_err(|_| "Wait for the reply or memory update to finish.")?;
        config.validate()?;
        if !cfg!(debug_assertions) {
            if config.launch_at_login {
                app.autolaunch().enable().map_err(|e| e.to_string())?;
            } else {
                app.autolaunch().disable().map_err(|e| e.to_string())?;
            }
        }
        store.save(&config, &documents)
    }
    #[tauri::command]
    fn save_api_key(value: String) -> Result<(), String> {
        core::save_key(&value)
    }
    #[tauri::command]
    fn delete_api_key() -> Result<(), String> {
        core::delete_key()
    }
    #[tauri::command]
    async fn model_list(store: State<'_, Store>) -> Result<Vec<Model>, String> {
        store.models().await
    }
    #[tauri::command]
    async fn chat(
        id: String,
        text: String,
        on_token: Channel<Token>,
        store: State<'_, Store>,
    ) -> Result<ChatResult, String> {
        store
            .chat(&id, &text, |s| {
                let _ = on_token.send(Token { text: s.into() });
            })
            .await
    }
    #[tauri::command]
    fn cancel(store: State<'_, Store>) -> Result<(), String> {
        store.stop()
    }
    #[tauri::command]
    async fn update_memory(store: State<'_, Store>) -> Result<String, String> {
        store.update_memory().await
    }
    #[tauri::command]
    fn open_data_folder(store: State<'_, Store>) -> Result<(), String> {
        std::process::Command::new("open")
            .arg(&store.dir)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[tauri::command]
    fn export_history(store: State<'_, Store>) -> Result<String, String> {
        let path = store.export()?;
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(path)
    }

    pub fn run() {
        let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);
        let app = tauri::Builder::default()
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                reveal(app)
            }))
            .plugin(
                tauri_plugin_window_state::Builder::default()
                    .with_state_flags(
                        tauri_plugin_window_state::StateFlags::SIZE
                            | tauri_plugin_window_state::StateFlags::POSITION,
                    )
                    .build(),
            )
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec!["--background"]),
            ))
            .plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |app, pressed, event| {
                        if pressed == &shortcut && event.state() == ShortcutState::Pressed {
                            if let Some(w) = app.get_webview_window("main") {
                                if w.is_visible().unwrap_or(false)
                                    && w.is_focused().unwrap_or(false)
                                {
                                    let _ = w.hide();
                                } else {
                                    reveal(app);
                                }
                            }
                        }
                    })
                    .build(),
            )
            .setup(move |app| {
                // Match the visible file locations from the brief, independent of bundle identifiers.
                #[cfg(target_os = "macos")]
                let dir = app
                    .path()
                    .home_dir()?
                    .join("Library/Application Support/Mentor");
                #[cfg(not(target_os = "macos"))]
                let dir = app.path().app_data_dir()?;
                let store = Store::open(dir).map_err(std::io::Error::other)?;
                let c = store.config().map_err(std::io::Error::other)?;
                let mut notes = Vec::new();
                if let Err(e) = app.global_shortcut().register(shortcut) {
                    notes.push(format!("Option+Space unavailable: {e}. Use the Dock icon."));
                }
                if !cfg!(debug_assertions) && c.launch_at_login {
                    if let Err(e) = app.autolaunch().enable() {
                        notes.push(format!("Launch at login could not be enabled: {e}"));
                    }
                }
                app.manage(store);
                app.manage(RuntimeStatus(Mutex::new(notes)));
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
                let hide =
                    MenuItem::with_id(app, "hide", "Hide Mentor", true, Some("CmdOrCtrl+W"))?;
                let quit =
                    MenuItem::with_id(app, "quit", "Quit Mentor", true, Some("CmdOrCtrl+Q"))?;
                let main = Submenu::with_items(app, "Mentor", true, &[&hide, &quit])?;
                let undo = PredefinedMenuItem::undo(app, None)?;
                let redo = PredefinedMenuItem::redo(app, None)?;
                let cut = PredefinedMenuItem::cut(app, None)?;
                let copy = PredefinedMenuItem::copy(app, None)?;
                let paste = PredefinedMenuItem::paste(app, None)?;
                let all = PredefinedMenuItem::select_all(app, None)?;
                let edit = Submenu::with_items(
                    app,
                    "Edit",
                    true,
                    &[&undo, &redo, &cut, &copy, &paste, &all],
                )?;
                app.set_menu(Menu::with_items(app, &[&main, &edit])?)?;
                if !std::env::args().any(|a| a == "--background") {
                    reveal(app.handle());
                }
                Ok(())
            })
            .on_menu_event(|app, event| match event.id().as_ref() {
                "hide" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.hide();
                    }
                }
                "quit" => app.exit(0),
                _ => {}
            })
            .on_window_event(|window, event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            })
            .invoke_handler(tauri::generate_handler![
                snapshot,
                runtime_status,
                messages,
                new_conversation,
                save_settings,
                save_api_key,
                delete_api_key,
                model_list,
                chat,
                cancel,
                update_memory,
                open_data_folder,
                export_history
            ])
            .build(tauri::generate_context!())
            .expect("Mentor could not start");
        app.run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                reveal(app);
            }
            #[cfg(not(target_os = "macos"))]
            let _ = (app, event);
        });
    }
}
#[cfg(feature = "desktop")]
pub use desktop::run;
