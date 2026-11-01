import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, CSSProperties } from 'react'

type Tracks = { backing: AudioBuffer; guitar: AudioBuffer; title: string }
type Playback = { backing: AudioBufferSourceNode; guitar: AudioBufferSourceNode; gain: GainNode; startAt: number; offset: number; id: number }
type Spark = { id: number; x: number; y: number; hue: number }
const lead = 0.075
const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

export default function App() {
  const audioRef = useRef<AudioContext | null>(null)
  const tracksRef = useRef<Tracks | null>(null)
  const playbackRef = useRef<Playback | null>(null)
  const playId = useRef(0)
  const posRef = useRef(0)
  const playingRef = useRef(false)
  const heldPointers = useRef(new Set<number>())
  const heldRef = useRef(false)
  const envelopeRef = useRef({ when: 0, released: 0, hold: 1, fade: 1 })
  const [menu, setMenu] = useState(false)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [held, setHeld] = useState(false)
  const [title, setTitle] = useState('Original demo')
  const [status, setStatus] = useState('Loading demo…')
  const [duration, setDuration] = useState(0)
  const [time, setTime] = useState(0)
  const [level, setLevel] = useState(0)
  const [delay, setDelay] = useState(0)
  const [holdAfterRelease, setHoldAfterRelease] = useState(1)
  const [fade, setFade] = useState(1)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [guitarFile, setGuitarFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [sparks, setSparks] = useState<Spark[]>([])
  const sparkId = useRef(0)

  const audio = () => audioRef.current ?? (audioRef.current = new AudioContext())
  const currentTime = () => {
    const p = playbackRef.current
    return p && audioRef.current ? Math.min(duration, p.offset + Math.max(0, audioRef.current.currentTime - p.startAt)) : posRef.current
  }
  const stop = () => {
    const p = playbackRef.current
    playbackRef.current = null
    playId.current++
    if (!p) return
    for (const source of [p.backing, p.guitar]) {
      source.onended = null
      try { source.stop() } catch { /* already ended */ }
      source.disconnect()
    }
    p.gain.disconnect()
  }
  const clearHold = () => {
    heldPointers.current.clear()
    heldRef.current = false
    setHeld(false)
  }
  const pause = () => {
    if (playingRef.current) posRef.current = currentTime()
    playingRef.current = false
    setPlaying(false)
    setTime(posRef.current)
    setLevel(0)
    clearHold()
    stop()
  }
  const restart = () => { pause(); posRef.current = 0; setTime(0); setStatus('At beginning — press Play') }
  const load = (t: Tracks) => {
    pause()
    tracksRef.current = t
    posRef.current = 0
    setTitle(t.title)
    setDuration(t.backing.duration)
    setTime(0)
    setReady(true)
    setStatus(Math.abs(t.backing.duration - t.guitar.duration) > 0.1 ? 'Loaded: stems have different lengths. Check alignment.' : 'Ready — press Play, then touch anywhere')
  }
  const demo = async () => {
    setBusy(true); setStatus('Loading demo…')
    try {
      const root = import.meta.env.BASE_URL
      const responses = await Promise.all([fetch(`${root}demo-backing.wav`), fetch(`${root}demo-guitar.wav`)])
      if (responses.some(r => !r.ok)) throw Error('Demo audio files missing')
      const buffers = await Promise.all(responses.map(async r => audio().decodeAudioData(await r.arrayBuffer())))
      load({ backing: buffers[0], guitar: buffers[1], title: 'Original demo · 16 sec' })
    } catch (e) { setStatus(`Demo load failed: ${String(e)}`) }
    finally { setBusy(false) }
  }
  const upload = async () => {
    if (!backFile || !guitarFile) return
    setBusy(true); setStatus('Decoding your stems…')
    try {
      const [backing, guitar] = await Promise.all([backFile, guitarFile].map(async f => audio().decodeAudioData(await f.arrayBuffer())))
      load({backing, guitar, title: backFile.name})
      setMenu(false)
    } catch (e) {setStatus(`Unable to load audio: ${String(e)}`)}
    finally {setBusy(false)}
  }
  const play = async () => {
    if (!tracksRef.current || playingRef.current) return
    try {
      const a = audio()
      await a.resume() // iOS requires playback to start from a user interaction
      const t = tracksRef.current
      if (posRef.current >= t.backing.duration - .03) posRef.current = 0
      stop()
      const backing = a.createBufferSource()
      const guitar = a.createBufferSource()
      const gain = a.createGain()
      backing.buffer = t.backing; guitar.buffer = t.guitar
      gain.gain.value = 0
      backing.connect(a.destination)
      guitar.connect(gain).connect(a.destination)
      const startAt = a.currentTime + lead
      const offset = posRef.current
      const id = ++playId.current
      playbackRef.current = { backing, guitar, gain, startAt, offset, id }
      backing.onended = () => {
        if (playbackRef.current?.id !== id) return
        playingRef.current = false; setPlaying(false); clearHold(); setLevel(0)
        posRef.current = 0; setTime(t.backing.duration); stop()
        setStatus('Finished — press Play to repeat')
      }
      // Both sources share exactly the same AudioContext start time AND file offset.
      backing.start(startAt, offset)
      if (offset < guitar.buffer.duration) guitar.start(startAt, offset)
      envelopeRef.current = {when: 0, released: 0, hold: 1, fade: 1}
      playingRef.current = true; setPlaying(true)
      setStatus('Playing — touch the screen to bring in the guitar')
    } catch (e) { setStatus(`Cannot play: ${String(e)}`) }
  }
  const setGainAt = (value: number, when: number) => {
    const p = playbackRef.current
    if (!p) return
    const param = p.gain.gain
    const t = Math.max(when, audio().currentTime)
    param.cancelScheduledValues(audio().currentTime)
    param.setValueAtTime(value, t)
  }
  const touchStart = () => {
    if (!playingRef.current || heldRef.current) return
    heldRef.current = true; setHeld(true)
    const a = audio()
    const when = Math.max(a.currentTime, playbackRef.current?.startAt ?? 0) + delay / 1000
    setGainAt(1, when)
    envelopeRef.current = {when, released: 0, hold: holdAfterRelease, fade}
  }
  const touchEnd = () => {
    if (!heldRef.current) return
    heldRef.current = false; setHeld(false)
    const p = playbackRef.current
    if (!p) return
    const a = audio()
    const when = Math.max(a.currentTime + delay / 1000, envelopeRef.current.when)
    const param = p.gain.gain
    // A short tap holds volume for 1s then fades. Long press remains 100% until released.
    param.cancelScheduledValues(a.currentTime)
    param.setValueAtTime(1, when)
    param.setValueAtTime(1, when + holdAfterRelease)
    param.linearRampToValueAtTime(0, when + holdAfterRelease + fade)
    envelopeRef.current = {when: envelopeRef.current.when, released: when, hold: holdAfterRelease, fade}
  }
  const sparkAt = (x: number, y: number) => {
    const id = ++sparkId.current
    setSparks(old => [...old.slice(-12), {id, x, y, hue: (id * 79) % 360}])
    window.setTimeout(() => setSparks(old => old.filter(s => s.id !== id)), 850)
  }
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    if (!playingRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    heldPointers.current.add(e.pointerId)
    sparkAt(e.clientX, e.clientY)
    touchStart()
  }
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    heldPointers.current.delete(e.pointerId)
    if (!heldPointers.current.size) touchEnd()
  }
  useEffect(() => {
    void demo()
    // Initial demo is loaded only once; tapping Play unlocks AudioContext on iOS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    const id = window.setInterval(() => {
      const p = playbackRef.current
      const a = audioRef.current
      if (!p || !a || !playingRef.current) return
      setTime(Math.min(duration, p.offset + Math.max(0, a.currentTime - p.startAt)))
      const env = envelopeRef.current
      const now = a.currentTime
      let value = 0
      if (now >= env.when && env.when > 0) {
        if (heldRef.current || env.released === 0 || now <= env.released + env.hold) value = 1
        else value = Math.max(0, 1 - (now - env.released - env.hold) / env.fade)
      }
      setLevel(Math.round(value * 100))
    }, 60)
    return () => window.clearInterval(id)
  }, [duration])
  useEffect(() => {
    const safetyRelease = () => { heldPointers.current.clear(); touchEnd() }
    window.addEventListener('blur', safetyRelease)
    document.addEventListener('visibilitychange', safetyRelease)
    return () => {window.removeEventListener('blur', safetyRelease); document.removeEventListener('visibilitychange', safetyRelease)}
  })

  return <div className="app">
    <div className={`stage ${held ? 'is-held' : ''}`} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp} onContextMenu={e => e.preventDefault()} role="button" tabIndex={0} aria-label="Hold or tap to play guitar" onKeyDown={e => {if (e.repeat) return; if(e.code === 'Space' || e.code === 'Enter'){e.preventDefault();touchStart();sparkAt(window.innerWidth/2,window.innerHeight/2)}}} onKeyUp={e => {if(e.code==='Space'||e.code==='Enter')touchEnd()}}>
      <div className="ambient" aria-hidden="true" />
      {sparks.map(s => <div key={s.id} className="spark" style={{left:s.x,top:s.y,'--hue':s.hue} as CSSProperties} aria-hidden="true" />)}
      <div className="center-hint" aria-hidden="true"><div className="wordmark">TAP GUITAR</div><div className="instructions">{!ready ? 'LOADING AUDIO…' : !playing ? 'PRESS PLAY TO BEGIN' : held ? 'HOLDING · GUITAR ON' : 'TOUCH ANYWHERE · HOLD TO SUSTAIN'}</div></div>
      <div className="floor-info" aria-hidden="true"><span>{fmt(time)} / {fmt(duration)}</span><div className="mini-meter"><div style={{width:`${level}%`}} /></div><span>{level}% GUITAR</span></div>
    </div>
    <div className="chrome"><button className="transport" onClick={() => void (playing ? pause() : play())} disabled={!ready || busy} aria-label={playing ? 'Pause' : 'Play'}>{playing ? 'Ⅱ' : '▶'}</button><button className="kebab" onClick={() => setMenu(true)} aria-label="Open settings" aria-expanded={menu}>⋮</button></div>
    {menu && <div className="shade" onPointerDown={e => e.stopPropagation()} onClick={() => setMenu(false)}>
      <aside className="settings" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Settings">
        <div className="settings-head"><h2>Settings</h2><button className="close" onClick={() => setMenu(false)} aria-label="Close settings">×</button></div>
        <p className="song-title">{title}</p><p className="status">{status}</p>
        <div className="actions"><button onClick={() => void (playing ? pause() : play())} disabled={!ready}>{playing ? 'Pause' : 'Play'}</button><button onClick={restart} disabled={!ready}>Restart</button><button onClick={() => void demo()} disabled={busy}>Load demo</button></div>
        <hr />
        <h3>Load your own song</h3>
        <label>Backing (no guitar)<input type="file" accept="audio/*,.wav,.mp3,.m4a" onChange={e => setBackFile(e.target.files?.[0] ?? null)} /></label>
        <label>Guitar stem<input type="file" accept="audio/*,.wav,.mp3,.m4a" onChange={e => setGuitarFile(e.target.files?.[0] ?? null)} /></label>
        <button className="load" disabled={!backFile || !guitarFile || busy} onClick={() => void upload()}>Load selected audio</button>
        <p className="note">Both stems must be aligned from time 0. Files stay on your device.</p>
        <hr />
        <h3>Timing</h3>
        <label>Tap activation delay <b>{delay} ms</b><input type="range" min="0" max="1000" step="10" value={delay} onChange={e => setDelay(+e.target.value)} /></label>
        <label>Hold after release <b>{holdAfterRelease.toFixed(1)} s</b><input type="range" min="0" max="2" step="0.1" value={holdAfterRelease} onChange={e => setHoldAfterRelease(+e.target.value)} /></label>
        <label>Fade duration <b>{fade.toFixed(1)} s</b><input type="range" min="0.1" max="3" step="0.1" value={fade} onChange={e => setFade(+e.target.value)} /></label>
        <p className="note">Holding stays at 100%; releasing starts the hold-and-fade. Delay affects guitar activation, not Bluetooth output latency. Test while parked or as a passenger.</p>
      </aside>
    </div>}
  </div>
}
