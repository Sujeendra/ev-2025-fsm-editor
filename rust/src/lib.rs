use wasm_bindgen::prelude::*;
use serde::{Serialize};
use regex::Regex;
use web_sys::console;
use std::collections::HashMap;


#[wasm_bindgen]
pub fn parse_dbc_text(dbc: &str) -> JsValue {
    let mut messages = Vec::new();
    let mut current_msg: Option<Message> = None;

    for line in dbc.lines() {
        if line.starts_with("BO_") {
            if let Some(msg) = current_msg.take() {
                messages.push(msg);
            }

            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 5 { continue; }

            let id: u32 = parts[1].parse().unwrap_or(0);
            current_msg = Some(Message {
                id,
                name: parts[2].trim_end_matches(":").to_string(),
                dlc: parts[3].parse().unwrap_or(8),
                node: parts[4].to_string(),
                pgn: (id >> 8) & 0x3FFFF,
                sa: id & 0xFF,
                priority: (id >> 26) & 0x7,
                signals: Vec::new(),
                comment: None,
            });

        } else if line.trim_start().starts_with("SG_") {
            if let Some(msg) = &mut current_msg {
                let re = Regex::new(r#"SG_\s+(\w+)\s*:\s*(\d+)\|(\d+)@([01])([+-])\s+\(([\d\.\-]+),([\d\.\-]+)\)\s+\[([\d\.\-]+)\|([\d\.\-]+)\]"#).unwrap();
                if let Some(caps) = re.captures(line.trim_start()) {
                    msg.signals.push(Signal {
                        name: caps.get(1).unwrap().as_str().to_string(),
                        start_bit: caps.get(2).unwrap().as_str().parse().unwrap_or(0),
                        length: caps.get(3).unwrap().as_str().parse().unwrap_or(0),
                        byte_order: if caps.get(4).unwrap().as_str() == "1" { "LittleEndian".into() } else { "BigEndian".into() },
                        is_signed: caps.get(5).unwrap().as_str() == "-",
                        scale: caps.get(6).unwrap().as_str().parse().unwrap_or(1.0),
                        offset: caps.get(7).unwrap().as_str().parse().unwrap_or(0.0),
                        min: caps.get(8).unwrap().as_str().parse().unwrap_or(0.0),
                        max: caps.get(9).unwrap().as_str().parse().unwrap_or(0.0),
                        comment: None,
                        value_descriptions: None,
                    });
                }
            }
        }
        else if line.starts_with("CM_ BO_") {
            // Example: CM_ BO_ 2365531687 "Message Comment";
            let re = Regex::new(r#"CM_\s+BO_\s+(\d+)\s+"([^"]+)""#).unwrap();
            if let Some(caps) = re.captures(line) {
                let id = caps.get(1).unwrap().as_str().parse::<u32>().unwrap_or(0);
                let comment = caps.get(2).unwrap().as_str().to_string();
                // Find message by ID
                // debug_log(&id.to_string());
                if let Some(msg) = messages.iter_mut().find(|m| m.id == id) {
                    msg.comment = Some(comment);
                }
            }
        }
        else if line.starts_with("CM_ SG_") {
            // Example: CM_ SG_ 2365531687 SignalName "Signal Comment";
            let re = Regex::new(r#"CM_\s+SG_\s+(\d+)\s+(\w+)\s+"([^"]+)""#).unwrap();
            if let Some(caps) = re.captures(line) {
                let id = caps.get(1).unwrap().as_str().parse::<u32>().unwrap_or(0);
                let sig_name = caps.get(2).unwrap().as_str();
                let comment = caps.get(3).unwrap().as_str().to_string();
                // Find message by ID
                if let Some(msg) = messages.iter_mut().find(|m| m.id == id) {
                    if let Some(sig) = msg.signals.iter_mut().find(|s| s.name == sig_name) {
                        sig.comment = Some(comment);
                    }
                }
            }
        }
        else if line.starts_with("VAL_") {
            // Example: VAL_ 2365572093 st_lc_fault 0 "OFF" 1 "ON" 2 "ERROR" 3 "NOT AVAILABLE" ;
            let re = Regex::new(r#"VAL_\s+(\d+)\s+(\w+)\s+(.*);"#).unwrap();
            if let Some(caps) = re.captures(line) {
                let id = caps.get(1).unwrap().as_str().parse::<u32>().unwrap_or(0);
                let signal_name = caps.get(2).unwrap().as_str();
                let values_part = caps.get(3).unwrap().as_str();
        
                if let Some(msg) = messages.iter_mut().find(|m| m.id == id) {
                    if let Some(sig) = msg.signals.iter_mut().find(|s| s.name == signal_name) {
                        let mut value_map = HashMap::new();
                        let value_re = Regex::new(r#"(\d+)\s+"([^"]+)""#).unwrap();
                        for val_cap in value_re.captures_iter(values_part) {
                            let key = val_cap[1].parse::<u32>().unwrap_or(0);
                            let val = val_cap[2].to_string();
                            value_map.insert(key, val);
                        }
                        sig.value_descriptions = Some(value_map);
                    }
                }
            }
        }        
        
    }

    // After looping all lines, push last parsed message if exists
    if let Some(msg) = current_msg {
        messages.push(msg);
    }

    JsValue::from_serde(&DBCData { messages }).unwrap()
}

pub fn debug_log(message: &str) {
    console::log_1(&message.into());
}
#[derive(Serialize, Clone)]
pub struct DBCData {
    pub messages: Vec<Message>,
}

#[derive(Serialize, Clone)]
pub struct Message {
    pub id: u32,
    pub name: String,
    pub dlc: u8,
    pub node: String,
    pub pgn: u32,
    pub sa: u32,
    pub priority: u32,
    pub signals: Vec<Signal>,
    pub comment: Option<String>,  // ✨ Add this
}

#[derive(Serialize, Clone)]
pub struct Signal {
    pub name: String,
    pub start_bit: u32,
    pub length: u32,
    pub byte_order: String,
    pub is_signed: bool,
    pub scale: f32,
    pub offset: f32,
    pub min: f32,
    pub max: f32,
    pub comment: Option<String>,  // ✨ Add this
    pub value_descriptions: Option<HashMap<u32, String>>, // ✨ Add this

}
