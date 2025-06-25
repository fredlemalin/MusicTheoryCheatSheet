let barreMode = false;
let barreBarElement = null;
let useFlats = false;
let previewMode = false;
let showIntervals = true;

const scaleFormulas = {
  "Major (Ionian)": [0, 2, 4, 5, 7, 9, 11],
  "Dorian": [0, 2, 3, 5, 7, 9, 10],
  "Phrygian": [0, 1, 3, 5, 7, 8, 10],
  "Lydian": [0, 2, 4, 6, 7, 9, 11],
  "Mixolydian": [0, 2, 4, 5, 7, 9, 10],
  "Aeolian (Natural Minor)": [0, 2, 3, 5, 7, 8, 10],
  "Locrian": [0, 1, 3, 5, 6, 8, 10],
  "Major Pentatonic": [0, 2, 4, 7, 9],
  "Minor Pentatonic": [0, 3, 5, 7, 10],
  "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
  "Melodic Minor": [0, 2, 3, 5, 7, 9, 11],
  "Blues": [0, 3, 5, 6, 7, 10]
};


const chordFormulas = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  "maj7": [0, 4, 7, 11],
  "m7": [0, 3, 7, 10],
  "7": [0, 4, 7, 10],
  "dim": [0, 3, 6],
  "aug": [0, 4, 8],
  "sus2": [0, 2, 7],
  "sus4": [0, 5, 7],
  "m7b5": [0, 3, 6, 10],
  "dim7": [0, 3, 6, 9]
};

function getIntervalName(semitone) {
  const names = {
    0: "1",
    1: "b2",
    2: "2",
    3: "b3",
    4: "3",
    5: "4",
    6: "b5",
    7: "5",
    8: "b6",
    9: "6",
    10: "b7",
    11: "7"
  };
  return names[semitone] || "";
}

// === Constants ===
const barreBtn = document.getElementById("toggle-barre");
const chromaticScale = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const fullNotes = [];
for (let o = 1; o <= 6; o++) {
  for (const note of chromaticScale) fullNotes.push(note + o);
}
fullNotes.push("C7");

const pianoboard = document.getElementById("pianoboard");
const fretboardContainer = document.getElementById("fretboard-container");
const canvas = document.getElementById("circle");
const ctx = canvas.getContext("2d");
const whiteKeyWidth = 40;
const blackKeyWidth = 26;
const blackKeyHeight = 110;

function clearFretboard() {
  clearGuitarHighlights();
  clearHighlights();
  showChordName("", "note");
}

// === Tone Synths ===
const reverb = new Tone.Reverb({
  decay: 2.5,    // how long the tail is
  preDelay: 0.01, // delay before reverb starts
  wet: 0.3       // how much reverb is mixed in (0 = dry, 1 = wet)
}).toDestination();

const polySynth = new Tone.PolySynth(Tone.Synth, {
  maxPolyphony: 12,
  volume: -6,
  options: {
    oscillator: {
      type: "sine",
    },
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.3,
      release: 0.5,
    }
  }
}).connect(reverb);

function sanitizeNoteName(note) {
  return note.toUpperCase().replace(/\s/g, "");
}
function desanitizeNoteName(note) {
  return note;
}
async function playNote(note) {
  await Tone.start();
  polySynth.triggerAttackRelease(note, "8n");
}
async function playChord(notesArray) {
  await Tone.start();
  polySynth.triggerAttackRelease(notesArray, "1n");
}
function getChordNotes(root, type) {
  const semitones = chordFormulas[type];
  if (!semitones) return [];

  const baseIndex = fullNotes.findIndex(n => n.startsWith(root) && n.includes("3"));
  return semitones.map(i => fullNotes[baseIndex + i]).filter(Boolean);
}

function showChordName(root, type) {
  const box = document.getElementById("chord-name");
  box.textContent = type === "note"
    ? `Note: ${root}`
    : `${root} ${type.charAt(0).toUpperCase() + type.slice(1)} Chord`;
}
function highlightNotes(noteArray) {
  clearHighlights();
  noteArray.forEach(note => {
    const key = keyMap[sanitizeNoteName(note)];
    if (key) key.classList.add("highlight");
  });
}

function highlightNotes(noteArray) {
  clearHighlights();

  const intervals = ["Root", "3rd", "5th"];
  const intervalMap = {};
  noteArray.forEach((n, i) => {
    intervalMap[sanitizeNoteName(n.replace(/[0-9]/g, ""))] = intervals[i] || "";
  });

  noteArray.forEach(note => {
    const key = keyMap[sanitizeNoteName(note)];
    if (key) {
      key.classList.add("highlight");

      if (showIntervals) {
        const label = document.createElement("span");
        label.className = "interval-label";
        const baseNote = sanitizeNoteName(note.replace(/[0-9]/g, ""));
        label.textContent = intervalMap[baseNote] || "";
        key.appendChild(label);
      }
    }
  });
}

function clearHighlights() {
  for (const key of Object.values(keyMap)) {
    key.classList.remove("highlight");
    const label = key.querySelector(".interval-label");
    if (label) label.remove();
  }
}

function showScaleOnPiano() {
  const root = document.getElementById("piano-root").value;
  const scaleName = document.getElementById("piano-scale").value;
  if (!root || !scaleName) return;

  const intervals = scaleFormulas[scaleName];
  if (!intervals) return;

  const rootIndex = chromaticScale.indexOf(root);
  const scaleNotes = intervals.map(i => chromaticScale[(rootIndex + i) % 12]);

  // Clear all highlights on piano
  clearHighlights();

  // Highlight notes on piano only
  const highlights = [];
  for (let o = 1; o <= 6; o++) {
    for (const note of scaleNotes) {
      const fullNote = note + o;
      if (keyMap[fullNote]) highlights.push(fullNote);
    }
  }

  highlightNotes(highlights);
  showChordName(`${root} ${scaleName}`, "note");
}



function highlightGuitarNotes(noteArray) {
  clearGuitarHighlights();

  const targets = noteArray.map(sanitizeNoteName);

  // Assign interval names
  const intervals = ["Root", "3rd", "5th"];
  const intervalNotes = {};
  targets.forEach((note, i) => {
    intervalNotes[note.replace(/[0-9]/g, "")] = intervals[i] || "";
  });

  fretElements.forEach(string => {
    let matchFound = false;
    string.forEach(fret => {
      const noteName = fret.dataset.note.replace(/[0-9]/g, "");
      if (targets.includes(fret.dataset.note)) {
        if (barreMode || !matchFound) {
          fret.classList.add("highlight");

          if (showIntervals) {
            const label = document.createElement("span");
            label.className = "interval-label";
            label.textContent = intervalNotes[noteName] || "";
            fret.appendChild(label);
          }

          matchFound = true;
        }
      }
    });
  });
}

function clearGuitarHighlights() {
  fretElements.flat().forEach(fret => {
    fret.classList.remove("highlight", "root-note");
    const label = fret.querySelector(".interval-label");
    if (label) label.remove();
  });
}

// === Barre Chord Drawing: Realistic Mode with Labels and Finger ===
function drawBarreChord(root, type) {
  if (barreBarElement) {
    barreBarElement.remove();
    barreBarElement = null;
  }
  document.querySelectorAll(".barre-visual").forEach(el => el.remove());
  document.querySelectorAll(".barre-label").forEach(el => el.remove());


  if (!barreMode) return;

  const chordNotes = getChordNotes(root, type).map(n => sanitizeNoteName(n.replace(/[0-9]/g, "")));
  const positions = [];

  // Collect all notes per string
  fretElements.forEach((string, sIdx) => {
    for (let fret = 0; fret <= 12; fret++) {
      const el = string[fret];
      if (!el) continue;
      const noteName = sanitizeNoteName(el.dataset.note.replace(/[0-9]/g, ""));
      if (chordNotes.includes(noteName)) {
        positions.push({ string: sIdx, fret, el });
        break;
      }
    }
  });

  // Group by fret
  const groupedByFret = {};
  positions.forEach(p => {
    if (!groupedByFret[p.fret]) groupedByFret[p.fret] = [];
    groupedByFret[p.fret].push(p);
  });

  // Try to detect barre across strings at the same fret
  for (const fret in groupedByFret) {
    const group = groupedByFret[fret];
    if (group.length < 2) continue;

    // Are strings continuous?
    const strings = group.map(g => g.string).sort((a, b) => a - b);
    const isContinuous = strings.every((s, i, arr) => i === 0 || s === arr[i - 1] + 1);
    if (!isContinuous) continue;

    // Draw barre bar for realistic continuous strings
    const top = group[0].el.offsetTop;
    const bottom = group[group.length - 1].el.offsetTop + group[0].el.offsetHeight;
    const left = group[0].el.offsetLeft;

    const bar = document.createElement("div");
    bar.className = "barre-visual";
    bar.style.cssText = `
      position: absolute;
      top: ${top}px;
      left: ${left}px;
      height: ${bottom - top}px;
      width: 6px;
      background-color: rgba(255, 117, 4, 0.6);
      border-radius: 3px;
      z-index: 5;
      transition: all 0.2s ease;
    `;

    // Add label for finger number
    const finger = document.createElement("div");
    finger.textContent = "1"; // index finger
    finger.className = "barre-label";
    finger.style.cssText = `
      position: absolute;
      left: ${left + 10}px;
      top: ${top - 4}px;
      font-size: 12px;
      background: #fff;
      color: #000;
      border-radius: 4px;
      padding: 2px 4px;
      font-weight: bold;
      z-index: 6;
    `;

    // Add shape label (E or A)
    let shape = "🎸B"; // fallback for unknown shapes
    if (strings[0] === 0) shape = "🎸E";
    else if (strings[0] === 1) shape = "🎸A";

    const shapeLabel = document.createElement("div");
    shapeLabel.textContent = shape;
    shapeLabel.className = "barre-label";
    shapeLabel.style.cssText = `
      position: absolute;
      left: ${left + 10}px;
      top: ${bottom + 2}px;
      font-size: 11px;
      background: #000;
      color: #ffca28;
      border-radius: 4px;
      padding: 1px 5px;
      z-index: 6;
    `;

    const fretboard = document.getElementById("fretboard");
    fretboard.appendChild(bar);
    fretboard.appendChild(finger);
    fretboard.appendChild(shapeLabel);
  }
}

const volumeSlider = document.getElementById("volume-slider");
volumeSlider.addEventListener("input", e => {
  polySynth.volume.value = parseFloat(e.target.value);
});

// === Piano Setup ===
const keyMap = {};
const whiteKeys = fullNotes.filter(n => !n.includes("#"));
pianoboard.innerHTML = "";
whiteKeys.forEach((whiteNote, i) => {
  const whiteKey = document.createElement("div");
  whiteKey.className = "key white";
  whiteKey.textContent = whiteNote;
  whiteKey.dataset.note = sanitizeNoteName(whiteNote);
  keyMap[sanitizeNoteName(whiteNote)] = whiteKey;
  pianoboard.appendChild(whiteKey);

  const whiteIndex = fullNotes.indexOf(whiteNote);
  const nextNote = fullNotes[whiteIndex + 1];
  if (nextNote && nextNote.includes("#") && nextNote[0] === whiteNote[0]) {
    const blackKey = document.createElement("div");
    blackKey.className = "key black";
    blackKey.dataset.note = sanitizeNoteName(nextNote);
    keyMap[sanitizeNoteName(nextNote)] = blackKey;
    whiteKey.appendChild(blackKey);
  }
});

// === Center the piano on C4 ===
const c4Key = keyMap["C4"];
if (c4Key) {
  const scrollContainer = pianoboard;
  const c4Offset = c4Key.offsetLeft + c4Key.offsetWidth / 2;
  scrollContainer.scrollTo({
    left: c4Offset - scrollContainer.clientWidth / 2,
    behavior: 'smooth'
  });
}

pianoboard.addEventListener("click", async e => {
  const note = e.target.closest(".key")?.dataset.note;
  if (note) {
    await playNote(note);
    highlightNotes([note]);
    highlightGuitarNotes([note]);
    showChordName(note, "note");
  }
});

// === Tuning & Capo Support ===
let capoFret = 0;
let openStrings = ["E4", "B3", "G3", "D3", "A2", "E2"];
const fretElements = [];
// Tuning selector
const tuningSelector = document.getElementById("tuning-selector");
const customTuningInputs = document.getElementById("custom-tuning-inputs");
const applyCustomTuningBtn = document.getElementById("apply-custom-tuning");

// Capo selector
const capoSelector = document.getElementById("capo-selector");

// Re-render fretboard when tuning or capo changes
tuningSelector.addEventListener("change", (e) => {
  const val = e.target.value;
  if (val === "custom") {
    customTuningInputs.style.display = "block";
  } else {
    customTuningInputs.style.display = "none";
    openStrings = val.split(",");
    renderFretboard();
  }
});

applyCustomTuningBtn.addEventListener("click", () => {
  const inputs = [1, 2, 3, 4, 5, 6].map(i => document.getElementById(`custom-string-${i}`).value.trim());
  if (inputs.every(n => /^[A-Ga-g][#b]?\d$/.test(n))) {
    openStrings = inputs;
    renderFretboard();
  } else {
    alert("Invalid tuning format. Use format like E4, G#3, etc.");
  }
});

capoSelector.addEventListener("change", e => {
  capoFret = parseInt(e.target.value);
  renderFretboard();
});

function renderFretboard() {
  fretElements.length = 0;

  const wrapper = document.createElement("div");
  wrapper.className = "fretboard-wrapper";

  const labelCol = document.createElement("div");
  labelCol.className = "fret-labels";

  openStrings.forEach(label => {
    const div = document.createElement("div");
    div.textContent = label;
    labelCol.appendChild(div);
  });

  const fretboard = document.createElement("div");
  fretboard.id = "fretboard";
  wrapper.appendChild(labelCol);
  wrapper.appendChild(fretboard);

  openStrings.forEach((note, sIdx) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    fretElements[sIdx] = [];

    const baseNote = note.slice(0, -1);
    const baseOct = parseInt(note.slice(-1));
    const baseIdx = chromaticScale.indexOf(baseNote);

    for (let fret = 0; fret <= 24; fret++) {
      const noteIdx = (baseIdx + fret + capoFret) % 12;
      const octave = baseOct + Math.floor((baseIdx + fret + capoFret) / 12);
      const full = chromaticScale[noteIdx] + octave;
      const div = document.createElement("div");
      div.textContent = full;
      div.dataset.note = sanitizeNoteName(full);
      div.setAttribute("role", "button");
      div.setAttribute("tabindex", 0);
      row.appendChild(div);
      fretElements[sIdx][fret] = div;
    }
    fretboard.appendChild(row);
  });

  const container = document.getElementById("fretboard-container");
  const fretNumbers = document.createElement("div");
  fretNumbers.className = "fret-numbers";
  for (let i = 0; i <= 24; i++) {
    const num = document.createElement("div");
    num.textContent = i;
    fretNumbers.appendChild(num);
  }

  container.innerHTML = "";
  container.appendChild(fretNumbers);
  container.appendChild(wrapper);

  fretboard.addEventListener("click", async e => {
    const note = e.target.closest("div[data-note]")?.dataset.note;
    if (note) {
      await playNote(note);
      highlightNotes([note]);
      highlightGuitarNotes([note]);
      showChordName(note, "note");
    }
  });
}

renderFretboard();


// === Chord Input Field ===
const input = document.getElementById("chord-input");
input.addEventListener("change", () => {
  const val = input.value.trim().toLowerCase();
  const match = val.match(/^([a-g][#b]?)(maj7|m7b5|dim7|m7|min7|minor|maj|min|m|7|dim|aug|sus2|sus4)?$/i);

  if (!match) return;
  const root = match[1].toUpperCase();
  let type = match[2]?.toLowerCase() || "major";

  // Normalize aliases
  if (type === "m" || type === "min" || type === "minor") type = "minor";
  if (type === "maj") type = "major";
  if (type === "min7") type = "m7";

  const notes = getChordNotes(root, type);
  if (!notes.length) return;

  playChord(notes);
  highlightNotes(notes);
  highlightGuitarNotes(notes);
  showChordName(root, type);
  drawBarreChord(root, type);
});


document.getElementById("scale-selector").addEventListener("change", (e) => {
  const val = e.target.value;
  if (!val) {
    clearHighlights();
    clearGuitarHighlights();
    return;
  }

  const [root, scaleName] = val.split("|");
  const intervals = scaleFormulas[scaleName];
  if (!intervals) return;

  const rootIndex = chromaticScale.indexOf(root);
  const scaleNotes = intervals.map(i => chromaticScale[(rootIndex + i) % 12]);

  clearHighlights();
  clearGuitarHighlights();

  fretElements.forEach(string => {
    string.forEach(fret => {
      const note = fret.dataset.note;
      const baseNote = note.replace(/\d/, "");
      const isRoot = sanitizeNoteName(baseNote) === root;

      if (isRoot || scaleNotes.includes(baseNote)) {
        if (isRoot) {
          fret.classList.add("root-note");
        } else {
          fret.classList.add("highlight");
        }

        // Compute the interval
        const noteIndex = chromaticScale.indexOf(baseNote);
        const intervalOffset = (noteIndex - rootIndex + 12) % 12;
        const intervalIndex = intervals.indexOf(intervalOffset);
        if (intervalIndex !== -1) {
          const label = document.createElement("span");

          // Get interval name
          const intervalText = scaleName.includes("Blues")
            ? ["1", "b3", "4", "b5", "5", "b7"][intervalIndex] || ""
            : getIntervalName(intervals[intervalIndex]);

          // Apply color-coded interval class
          label.className = `interval-label interval-${intervalText.replace("#", "s")}`;
          label.textContent = intervalText;
          if (showIntervals) {
            fret.appendChild(label);
          }
        }
      }
    });
  });
});

document.getElementById("showIntervals").addEventListener("change", (e) => {
  showIntervals = e.target.checked;
  clearFretboard(); // Re-render notes when toggling
  const val = document.getElementById("scale-selector").value;
  if (val) document.getElementById("scale-selector").dispatchEvent(new Event("change"));
});


// === Circle of Fifths ===
const majorKeysSharps = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"];
const majorKeysFlats = ["C", "G", "D", "A", "E", "B", "Gb", "Db", "Ab", "Eb", "Bb", "F"];
const minorKeysSharps = ["Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m", "Fm", "Cm", "Gm", "Dm"];
const minorKeysFlats = ["Am", "Em", "Bm", "F#m", "C#m", "G#m", "Ebm", "Bbm", "Fm", "Cm", "Gm", "Dm"];
const center = canvas.width / 2;
const majorRadius = center - 40;
const minorRadius = majorRadius * 0.6;
const flatToSharp = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
const keyPositions = [];

ctx.translate(center, center);
function drawCircleKeys(keys, radius, isMinor) {
  keys.forEach((key, i) => {
    const angle = (i / keys.length) * 2 * Math.PI - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    keyPositions.push({ x, y, key, isMinor });

    ctx.beginPath();
    ctx.arc(x, y, 20, 0, 2 * Math.PI);
    ctx.fillStyle = isMinor ? "#555" : "#000";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = isMinor ? "14px Arial Italic" : "16px Arial Bold";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(key, x, y);
  });
}

function drawCircleOfFifths() {
  keyPositions.length = 0;

  // Reset transform and clear everything
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset any previous transforms
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Re-center origin
  ctx.translate(center, center);

  const majors = useFlats ? majorKeysFlats : majorKeysSharps;
  const minors = useFlats ? minorKeysFlats : minorKeysSharps;

  drawCircleKeys(majors, majorRadius, false);
  drawCircleKeys(minors, minorRadius, true);
}

// Call this once at the beginning
drawCircleOfFifths();

document.getElementById("sharpFlatToggle").addEventListener("change", e => {
  useFlats = e.target.checked;
  drawCircleOfFifths();
});

document.getElementById("previewMode").addEventListener("change", e => {
  previewMode = e.target.checked;
});

canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left - center;
  const cy = e.clientY - rect.top - center;

  for (const { x, y, key, isMinor } of keyPositions) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < 400) {
      let root = isMinor ? key.slice(0, -1) : key;
      if (!useFlats && flatToSharp[root]) root = flatToSharp[root];
      const type = isMinor ? "minor" : "major";
      const notes = getChordNotes(root, type);
      playChord(notes);
      highlightNotes(notes);
      highlightGuitarNotes(notes);
      showChordName(key, type);
      drawBarreChord(root, type);
      break;
    }
  }
});

canvas.addEventListener("mousemove", e => {
  if (!previewMode) return;

  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left - center;
  const cy = e.clientY - rect.top - center;

  let hovered = false;

  for (const { x, y, key, isMinor } of keyPositions) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < 400) {
      let root = isMinor ? key.slice(0, -1) : key;
      if (!useFlats && flatToSharp[root]) root = flatToSharp[root];
      const type = isMinor ? "minor" : "major";
      const notes = getChordNotes(root, type);

      highlightNotes(notes);
      highlightGuitarNotes(notes);
      showChordName(key, type);
      hovered = true;
      break;
    }
  }

  if (!hovered) {
    clearHighlights();
    clearGuitarHighlights();
    showChordName("", "note");
  }
});

canvas.addEventListener("mouseleave", () => {
  if (previewMode) {
    clearHighlights();
    clearGuitarHighlights();
    showChordName("", "note");
  }
});


barreBtn.addEventListener("click", () => {
  barreMode = !barreMode;
  barreBtn.setAttribute("aria-pressed", barreMode);
  barreBtn.textContent = `Barre Chord Mode: ${barreMode ? "ON" : "OFF"}`;

  const lastChord = document.getElementById("chord-name")?.textContent;
  if (lastChord && lastChord.includes("Chord")) {
    const [root, typeWord] = lastChord.replace("Chord", "").trim().split(" ");
    const type = typeWord?.toLowerCase() === "minor" ? "minor" : "major";
    const notes = getChordNotes(root, type);
    highlightGuitarNotes(notes);
    drawBarreChord(root, type);
  } else {
    if (barreBarElement) {
      barreBarElement.remove();
      barreBarElement = null;
    }
  }
});

function drawTextOnArc(ctx, str, centerX, centerY, radius, startAngle, clockwise = true) {
  const len = str.length;
  const angle = (clockwise ? 1 : -1) * (Math.PI / len);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(startAngle);

  for (let i = 0; i < len; i++) {
    const char = str[i];
    ctx.save();
    ctx.rotate(i * angle);
    ctx.translate(0, -radius);
    ctx.fillText(char, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}


document.getElementById("clear-fretboard").addEventListener("click", () => {
  clearFretboard();
});


function renderPianoKeys() {
  const whiteKeyWidth = 40;
  const blackKeyWidth = 26;

  const chromatic = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const fullNotes = [];
  for (let o = 0; o <= 7; o++) {
    for (let note of chromatic) {
      fullNotes.push(note + o);
    }
  }
  fullNotes.push("C8");

  const pianoContainer = document.getElementById("pianoboard");
  pianoContainer.innerHTML = "";

  const whiteKeyContainer = document.createElement("div");
  whiteKeyContainer.className = "white-keys";

  const blackKeyContainer = document.createElement("div");
  blackKeyContainer.className = "black-keys";

  pianoContainer.appendChild(whiteKeyContainer);
  pianoContainer.appendChild(blackKeyContainer);

  const whiteKeys = [];
  const blackKeyMap = {
    "C#": "C", "D#": "D", "F#": "F", "G#": "G", "A#": "A"
  };

  for (const note of fullNotes) {
    const isBlack = note.includes("#");
    const key = document.createElement("div");
    key.className = "key " + (isBlack ? "black" : "white");
    key.dataset.note = note;

    if (!isBlack) {
      whiteKeys.push({ note, key });
      whiteKeyContainer.appendChild(key);
    } else {
      blackKeyContainer.appendChild(key);
    }
  }

  requestAnimationFrame(() => {
    const allWhite = whiteKeyContainer.querySelectorAll(".key.white");
    const blackKeys = blackKeyContainer.querySelectorAll(".key.black");

    blackKeys.forEach((blackKey) => {
      const note = blackKey.dataset.note;
      const base = note.slice(0, -1);
      const octave = note.slice(-1);
      const leftWhite = blackKeyMap[base] + octave;
      const rightWhite = getNextWhiteNote(base, octave);

      const leftEl = [...allWhite].find(el => el.dataset.note === leftWhite);
      const rightEl = [...allWhite].find(el => el.dataset.note === rightWhite);

      if (leftEl && rightEl) {
        const left = leftEl.offsetLeft;
        const right = rightEl.offsetLeft;
        const center = left + (right - left) / 2 - blackKey.offsetWidth / 2;
        blackKey.style.left = `${center}px`;
      }
    });
  });

  function getNextWhiteNote(note, octave) {
    const order = ["C", "D", "E", "F", "G", "A", "B"];
    const index = order.indexOf(note[0]);
    if (index === -1) return null;
    const next = index + 1 < order.length ? order[index + 1] : "C";
    const nextOctave = next === "C" && note[0] !== "B" ? String(Number(octave) + 1) : octave;
    return next + nextOctave;
  }
}
