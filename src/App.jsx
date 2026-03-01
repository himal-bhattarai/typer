import { useState, useEffect, useRef, useCallback } from "react";
import { SAMPLE_TEXTS } from "./sampleText";
// ── SVG Icons ─────────────────────────────────────────────────────
import { IconGithub, IconSettings, IconKeyboard, IconSun, IconMoon, IconEnter } from "./icons";

const FONTS = [
  { name: "Mono", value: "'JetBrains Mono', 'Fira Code', monospace" },
  { name: "Serif", value: "'Merriweather', Georgia, serif" },
  { name: "Sans", value: "'DM Sans', 'Helvetica Neue', sans-serif" },
  { name: "Slab", value: "'Roboto Slab', 'Courier New', serif" },
];

const CURSOR_TYPES = ["block", "line", "underline", "outline"];

const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

// Load from localStorage with fallback
function loadSetting(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function saveSetting(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
}




// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  // Settings — loaded from localStorage
  const [theme, setThemeState] = useState(() => loadSetting("typer_theme", "dark"));
  const [fontName, setFontNameState] = useState(() => loadSetting("typer_font", "Mono"));
  const [cursorType, setCursorTypeState] = useState(() => loadSetting("typer_cursor", "block"));
  const [showKeyboard, setShowKeyboardState] = useState(() => loadSetting("typer_keyboard", false));

  const font = FONTS.find(f => f.name === fontName) || FONTS[0];

  // Persist settings
  const setTheme = (v) => { setThemeState(v); saveSetting("typer_theme", v); };
  const setFontName = (v) => { setFontNameState(v); saveSetting("typer_font", v); };
  const setCursorType = (v) => { setCursorTypeState(v); saveSetting("typer_cursor", v); };
  const setShowKeyboard = (fn) => {
    setShowKeyboardState(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      saveSetting("typer_keyboard", next);
      return next;
    });
  };

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [text, setText] = useState(() => SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)]);
  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [pressedKey, setPressedKey] = useState(null);
  const [tick, setTick] = useState(0);

  const inputRef = useRef(null);
  const pressedKeyTimeout = useRef(null);
  const timerRef = useRef(null);

  const c = theme === "dark"
    ? { bg: "#262624", fg: "#141413", text: "#c9c7b8", muted: "#5c5b53", accent: "#dddac5", error: "#c94a4a", success: "#7ab87a", border: "#333230", pill: "#1c1c1a" }
    : { bg: "#FAF9F5", fg: "#F0EEE6", text: "#3a3830", muted: "#9e9b8e", accent: "#2a2820", error: "#b83a3a", success: "#3d7a3d", border: "#dddbd2", pill: "#e8e6dc" };

  // Live timer
  useEffect(() => {
    if (started && !finished) {
      timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [started, finished]);

  const handleKeyDown = useCallback((e) => {
    if (settingsOpen) return;
    if (finished) {
      if (e.key === "Enter") restart();
      return;
    }
    const key = e.key === " " ? " " : e.key.toLowerCase();
    if (showKeyboard) {
      if ([...KEYBOARD_ROWS.flat(), " "].includes(key)) {
        setPressedKey(key);
        clearTimeout(pressedKeyTimeout.current);
        pressedKeyTimeout.current = setTimeout(() => setPressedKey(null), 120);
      }
    }
  }, [finished, settingsOpen, showKeyboard]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleInput = (e) => {
    const val = e.target.value;
    if (!started && val.length > 0) {
      setStarted(true);
      setStartTime(Date.now());
      setTick(0);
    }
    if (val.length > text.length) return;
    setTyped(val);
    let errCount = 0;
    for (let i = 0; i < val.length; i++) if (val[i] !== text[i]) errCount++;
    setErrors(errCount);
    setAccuracy(val.length > 0 ? Math.round(((val.length - errCount) / val.length) * 100) : 100);
    if (val.length === text.length) {
      setFinished(true);
      const mins = (Date.now() - startTime) / 60000;
      setWpm(Math.round(text.split(" ").length / mins));
    }
  };

  const restart = (e) => {
    e?.stopPropagation?.();
    const next = SAMPLE_TEXTS.filter(t => t !== text)[Math.floor(Math.random() * (SAMPLE_TEXTS.length - 1))]; // ← replace this line
    setText(next);
    setTyped(""); setStarted(false); setFinished(false);
    setStartTime(null); setWpm(0); setAccuracy(100); setErrors(0); setTick(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const elapsed = started && startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

  // Cursor inline style for active character
  const getCursorStyle = () => {
    if (cursorType === "block") return { background: c.accent, color: c.bg };
    if (cursorType === "line") return { borderLeft: `2px solid ${c.accent}`, marginLeft: "-1px" };
    if (cursorType === "underline") return { borderBottom: `2px solid ${c.accent}` };
    if (cursorType === "outline") return { outline: `1.5px solid ${c.accent}`, borderRadius: "2px" };
    return {};
  };

  // UI font is always system sans; only the typing text changes
  const uiFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <div
      onClick={() => !settingsOpen && inputRef.current?.focus()}
      style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: uiFont, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transition: "background 0.3s, color 0.3s", position: "relative", padding: "2rem", userSelect: "none" }}
    >
      <style>{`
        .settings-btn { transition: transform 0.35s cubic-bezier(.34,1.56,.64,1), opacity 0.2s; }
        .settings-btn:hover { transform: rotate(50deg); opacity: 0.6; }

        .key { transition: background 0.07s, transform 0.07s, color 0.07s, box-shadow 0.07s; }
        .key.pressed { background: ${c.accent} !important; color: ${c.bg} !important; transform: translateY(2px) scale(0.9); box-shadow: 0 0px 0 ${c.border} !important; }

        .pill { transition: background 0.14s, color 0.14s, border-color 0.14s; cursor: pointer; user-select: none; }
        .pill:hover { opacity: 0.75; }

        .overlay { animation: fadeIn 0.15s ease; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .popup { animation: popIn 0.22s cubic-bezier(.34,1.4,.64,1); }
        @keyframes popIn { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }

        .github-link { transition: opacity 0.2s, transform 0.2s; display: flex; align-items: center; }
        .github-link:hover { opacity: 0.4; transform: scale(1.12); }

        .restart-btn { transition: opacity 0.2s; cursor: pointer; }
        .restart-btn:hover { opacity: 0.55; }

        .toggle-track { cursor: pointer; transition: background 0.2s; }
        .toggle-thumb { transition: left 0.22s cubic-bezier(.34,1.56,.64,1), background 0.2s; }
      `}</style>

      {/* Settings icon */}
      <button
        className="settings-btn"
        onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }}
        style={{ position: "fixed", top: "1.4rem", right: "1.5rem", background: "none", border: "none", cursor: "pointer", color: c.muted, padding: "4px", display: "flex", lineHeight: 0 }}
      >
        <IconSettings size={20} />
      </button>

      {/* Content */}
      <div style={{ width: "100%", maxWidth: "700px" }}>

        {/* Stats — fixed height so they never cause layout shift */}
        <div style={{ display: "flex", gap: "2rem", marginBottom: "2rem", fontSize: "0.7rem", letterSpacing: "0.1em", color: c.muted, height: "2.2rem", alignItems: "flex-start" }}>
          <StatItem label="ACC" value={`${accuracy}%`} color={accuracy < 90 ? c.error : c.text} />
          <StatItem label="ERR" value={errors} color={errors > 0 ? c.error : c.text} />
          {started && !finished && <StatItem label="TIME" value={`${elapsed}s`} color={c.text} />}
          {finished && <StatItem label="WPM" value={wpm} color={c.success} bold />}
        </div>

        {/* Typing area — fixed min-height to prevent reflow when font changes */}
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            fontSize: "1.3rem",
            lineHeight: "2.4rem",
            letterSpacing: "0.02em",
            cursor: "text",
            fontFamily: font.value,
            // Lock the container size so switching fonts doesn't reflow the layout
            minHeight: "calc(2.4rem * 3)",
          }}
        >
          {text.split("").map((char, i) => {
            const isTyped = i < typed.length;
            const isCursor = i === typed.length && !finished;
            const isWrong = isTyped && typed[i] !== char;
            return (
              <span
                key={i}
                style={{
                  color: isWrong ? c.error : isTyped ? c.accent : c.muted,
                  display: "inline",
                  transition: "color 0.05s",
                  ...(isCursor ? getCursorStyle() : {}),
                }}
              >{char}</span>
            );
          })}
        </div>

        <input ref={inputRef} value={typed} onChange={handleInput} disabled={finished}
          autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0, top: 0 }} />

        {/* Result — fixed height placeholder to prevent jump */}
        <div style={{ marginTop: finished ? "2.5rem" : "0", minHeight: finished ? "3rem" : "0", display: "flex", alignItems: "center" }}>
          {finished && (
            <>
              <div>
                <span style={{ fontSize: "2.6rem", fontWeight: 300, color: c.accent }}>{wpm}</span>
                <span style={{ fontSize: "0.8rem", color: c.muted, marginLeft: "6px" }}>wpm</span>
              </div>
              <div style={{ width: "1px", height: "2rem", background: c.border, margin: "0 1.5rem" }} />
              <div>
                <span style={{ fontSize: "1.6rem", fontWeight: 300, color: c.text }}>{accuracy}%</span>
                <span style={{ fontSize: "0.75rem", color: c.muted, marginLeft: "6px" }}>acc</span>
              </div>
              <button className="restart-btn" onClick={restart} style={{
                marginLeft: "auto", background: "none", border: `1px solid ${c.border}`, color: c.muted,
                padding: "0.45rem 1rem", borderRadius: "5px", fontSize: "0.7rem", letterSpacing: "0.08em",
                fontFamily: uiFont,
              }}>
                restart <IconEnter size={11} />
              </button>
            </>
          )}
        </div>

        {/* Virtual Keyboard */}
        {showKeyboard && (
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
            {KEYBOARD_ROWS.map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: "5px" }}>
                {row.map(k => (
                  <div key={k} className={`key${pressedKey === k ? " pressed" : ""}`} style={{
                    width: "34px", height: "34px", borderRadius: "5px",
                    background: c.fg, border: `1px solid ${c.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.67rem", color: c.muted,
                    boxShadow: `0 2px 0 ${c.border}`,
                    fontFamily: uiFont,
                  }}>{k}</div>
                ))}
              </div>
            ))}
            <div style={{ display: "flex", gap: "5px", marginTop: "3px" }}>
              <div className={`key${pressedKey === " " ? " pressed" : ""}`} style={{
                width: "210px", height: "34px", borderRadius: "5px",
                background: c.fg, border: `1px solid ${c.border}`,
                boxShadow: `0 2px 0 ${c.border}`,
              }} />
            </div>
          </div>
        )}
      </div>

      {/* GitHub */}
      <a href="https://github.com/himal-bhattarai/typer" target="_blank" rel="noreferrer" className="github-link"
        onClick={e => e.stopPropagation()}
        style={{ position: "fixed", bottom: "1.6rem", left: "50%", transform: "translateX(-50%)", color: c.muted, textDecoration: "none" }}
      >
        <IconGithub size={18} />
      </a>

      {/* Settings popup */}
      {settingsOpen && (
        <div className="overlay" onClick={() => setSettingsOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(3px)",
        }}>
          <div className="popup" onClick={e => e.stopPropagation()} style={{
            background: c.fg, borderRadius: "12px", padding: "1.8rem",
            width: "340px", border: `1px solid ${c.border}`, fontFamily: uiFont,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.6rem" }}>
              <span style={{ fontSize: "0.62rem", letterSpacing: "0.14em", color: c.muted }}>SETTINGS</span>
              <button onClick={() => setSettingsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: c.muted, fontSize: "0.95rem", lineHeight: 1, padding: "2px 5px" }}>✕</button>
            </div>

            {/* Theme */}
            <SettingSection label="THEME">
              <div style={{ display: "flex", gap: "6px" }}>
                {[{ val: "light", Icon: IconSun, label: "Light" }, { val: "dark", Icon: IconMoon, label: "Dark" }].map(({ val, Icon, label }) => (
                  <div key={val} className="pill" onClick={() => setTheme(val)} style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "0.35rem 0.85rem", borderRadius: "5px", fontSize: "0.75rem",
                    background: theme === val ? c.accent : c.pill,
                    color: theme === val ? c.bg : c.muted,
                    border: `1px solid ${theme === val ? c.accent : c.border}`,
                  }}>
                    <Icon size={14} />{label}
                  </div>
                ))}
              </div>
            </SettingSection>

            {/* Font */}
            <SettingSection label="FONT">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {FONTS.map(f => (
                  <div key={f.name} className="pill" onClick={() => setFontName(f.name)} style={{
                    padding: "0.35rem 0.8rem", borderRadius: "5px", fontSize: "0.75rem",
                    fontFamily: f.value,
                    background: fontName === f.name ? c.accent : c.pill,
                    color: fontName === f.name ? c.bg : c.muted,
                    border: `1px solid ${fontName === f.name ? c.accent : c.border}`,
                  }}>{f.name}</div>
                ))}
              </div>
            </SettingSection>

            {/* Cursor */}
            <SettingSection label="CURSOR">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {CURSOR_TYPES.map(ct => (
                  <div key={ct} className="pill" onClick={() => setCursorType(ct)} style={{
                    padding: "0.35rem 0.8rem", borderRadius: "5px", fontSize: "0.75rem",
                    background: cursorType === ct ? c.accent : c.pill,
                    color: cursorType === ct ? c.bg : c.muted,
                    border: `1px solid ${cursorType === ct ? c.accent : c.border}`,
                  }}>{ct}</div>
                ))}
              </div>
            </SettingSection>

            {/* Keyboard */}
            <SettingSection label="KEYBOARD" last>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="toggle-track" onClick={() => setShowKeyboard(v => !v)} style={{
                  width: "42px", height: "23px", borderRadius: "12px",
                  background: showKeyboard ? c.accent : c.border, position: "relative",
                }}>
                  <div className="toggle-thumb" style={{
                    position: "absolute", top: "3px", left: showKeyboard ? "22px" : "3px",
                    width: "17px", height: "17px", borderRadius: "50%",
                    background: showKeyboard ? c.bg : c.fg,
                  }} />
                </div>
                <span style={{ fontSize: "0.72rem", color: c.muted, display: "flex", alignItems: "center", gap: "5px" }}>
                  <IconKeyboard size={14} /> show layout
                </span>
              </div>
            </SettingSection>
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, color, bold }) {
  return (
    <div>
      <div style={{ fontSize: "0.55rem", opacity: 0.4, marginBottom: "3px", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ color, fontWeight: bold ? 500 : 400 }}>{value}</div>
    </div>
  );
}

function SettingSection({ label, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : "1.3rem" }}>
      <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", opacity: 0.4, marginBottom: "0.6rem" }}>{label}</div>
      {children}
    </div>
  );
}