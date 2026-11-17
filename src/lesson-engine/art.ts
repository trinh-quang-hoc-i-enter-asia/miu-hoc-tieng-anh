// Thư viện hình vẽ SVG (trả về chuỗi SVG). Nhân vật có 4 nét mặt, tay vẫy và miệng cử động
// khi nói; các hiệu ứng này điều khiển bằng class CSS trong src/app/kid.css.
import type { Mood, PicKey } from "@/lib/content-keys";

export const INK = "#23254D";
const st = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;

export type Pose = { x?: number; y?: number; s?: number; flip?: boolean; cls?: string; mood?: Mood; who?: string };
export type PupLook = Pose & { fur?: string; ear?: string; shirt?: string };
export type CatLook = Pose & { fur?: string };

function arms(fur: string): string {
  return `<g class="arm-down"><ellipse cx="27" cy="-42" rx="8" ry="15" transform="rotate(-18 27 -42)" fill="${fur}" ${st}/></g>
  <g class="arm-up"><ellipse cx="36" cy="-66" rx="8" ry="17" transform="rotate(32 36 -66)" fill="${fur}" ${st}/></g>
  <ellipse cx="-27" cy="-42" rx="8" ry="15" transform="rotate(18 -27 -42)" fill="${fur}" ${st}/>`;
}

/** Bốn nét mặt: bình thường, vui, đói, buồn ngủ. ey = cao độ mắt, my = cao độ miệng. */
function faces(ey: number, my: number, flip?: boolean): string {
  const eye = (x: number) =>
    `<ellipse cx="${x}" cy="${ey}" rx="4.5" ry="5.5" fill="${INK}"/><circle cx="${x + 1.5}" cy="${ey - 2}" r="1.6" fill="#fff"/>`;
  const arc = (x: number, up: boolean) =>
    `<path d="M${x - 6},${ey + (up ? 2 : -1)} q6,${up ? -9 : 7} 12,0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  const z = (x: number, y: number, size: number) =>
    flip
      ? `<text transform="translate(${x} ${y}) scale(-1 1)" text-anchor="end" font-size="${size}">z</text>`
      : `<text x="${x}" y="${y}" font-size="${size}">z</text>`;
  return `
  <g class="face f-neutral">${eye(-13)}${eye(13)}<ellipse class="mouth" cx="0" cy="${my}" rx="5" ry="4.5" fill="#7A2136"/></g>
  <g class="face f-happy">${arc(-13, true)}${arc(13, true)}
    <path class="mouth open" d="M-9,${my - 4} Q0,${my + 12} 9,${my - 4} Z" fill="#7A2136" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></g>
  <g class="face f-hungry">${eye(-13)}${eye(13)}
    <path d="M-20,${ey - 9} l10,-4 M20,${ey - 9} l-10,-4" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse class="mouth open" cx="0" cy="${my}" rx="6" ry="4.5" fill="#7A2136"/>
    <ellipse cx="0" cy="${my + 5}" rx="4" ry="4.5" fill="#FF8FA3" stroke="${INK}" stroke-width="1.5"/>
    <path d="M10,${my + 2} q4,8 0,11 q-4,-3 0,-11z" fill="#8FD3FF" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M-46,-46 l6,5 l-6,5 l6,5 M46,-46 l-6,5 l6,5 l-6,5" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g class="face f-sleepy">${arc(-13, false)}${arc(13, false)}
    <ellipse class="mouth open" cx="0" cy="${my}" rx="5" ry="6" fill="#7A2136"/>
    <g font-weight="800" fill="#fff" stroke="${INK}" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${z(36, -122, 17)}${z(48, -138, 24)}</g>
  </g>`;
}

function open(o: Pose, who: string): string {
  const s = o.s || 1;
  return `<g class="char ${o.cls || ""}" data-who="${who}" data-mood="${o.mood || "neutral"}" data-x="${o.x || 0}" transform="translate(${o.x || 0} ${o.y || 0}) scale(${o.flip ? -s : s} ${s})">`;
}

export function cat(o: CatLook = {}): string {
  const F = o.fur || "#F6A245";
  return (
    open(o, o.who || "miu") +
    `
  <path d="M-22,-24 C-58,-22 -62,-62 -46,-74" fill="none" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>
  <path d="M-22,-24 C-58,-22 -62,-62 -46,-74" fill="none" stroke="${F}" stroke-width="11" stroke-linecap="round"/>
  ${arms(F)}
  <ellipse cx="0" cy="-36" rx="30" ry="34" fill="${F}" ${st}/>
  <ellipse cx="0" cy="-28" rx="17" ry="21" fill="#FFE9C7"/>
  <ellipse cx="-14" cy="-5" rx="13" ry="8" fill="${F}" ${st}/><ellipse cx="14" cy="-5" rx="13" ry="8" fill="${F}" ${st}/>
  <polygon points="-31,-106 -27,-140 -6,-122" fill="${F}" ${st}/><polygon points="31,-106 27,-140 6,-122" fill="${F}" ${st}/>
  <polygon points="-25,-113 -24,-130 -13,-121" fill="#FF9E8A"/><polygon points="25,-113 24,-130 13,-121" fill="#FF9E8A"/>
  <circle cx="0" cy="-92" r="34" fill="${F}" ${st}/>
  <path d="M-8,-123 v9 M0,-125 v11 M8,-123 v9" stroke="#00000033" stroke-width="4" stroke-linecap="round"/>
  <path d="M-25,-66 Q0,-53 25,-66 L23,-55 Q0,-43 -23,-55 Z" fill="#FF5A4E" ${st}/>
  <path d="M9,-52 l7,17 l-11,2 l-4,-16 Z" fill="#FF5A4E" ${st}/>
  <circle cx="-23" cy="-83" r="6" fill="#FF9E8A" opacity=".75"/><circle cx="23" cy="-83" r="6" fill="#FF9E8A" opacity=".75"/>
  <path d="M-4,-88 h8 l-4,5 Z" fill="#E8567A" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M-25,-82 l-19,-4 M-25,-78 l-19,3 M25,-82 l19,-4 M25,-78 l19,3" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
  ${faces(-96, -76, o.flip)}
  </g>`
  );
}

export function pup(o: PupLook = {}): string {
  const F = o.fur || "#EBCBA0";
  const E = o.ear || "#9A6240";
  const shirt = o.shirt || "#4C8DF6";
  return (
    open(o, o.who || "ben") +
    `
  <path d="M-24,-22 C-44,-24 -48,-40 -44,-50" fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>
  <path d="M-24,-22 C-44,-24 -48,-40 -44,-50" fill="none" stroke="${F}" stroke-width="9" stroke-linecap="round"/>
  ${arms(F)}
  <ellipse cx="0" cy="-36" rx="30" ry="34" fill="${shirt}" ${st}/>
  <ellipse cx="-14" cy="-5" rx="13" ry="8" fill="${F}" ${st}/><ellipse cx="14" cy="-5" rx="13" ry="8" fill="${F}" ${st}/>
  <circle cx="0" cy="-92" r="33" fill="${F}" ${st}/>
  <circle cx="13" cy="-98" r="11" fill="${E}" opacity=".45"/>
  <ellipse cx="-33" cy="-92" rx="11" ry="25" transform="rotate(14 -33 -92)" fill="${E}" ${st}/>
  <ellipse cx="33" cy="-92" rx="11" ry="25" transform="rotate(-14 33 -92)" fill="${E}" ${st}/>
  <ellipse cx="0" cy="-79" rx="17" ry="13" fill="#FFF6E6"/>
  <ellipse cx="0" cy="-87" rx="6.5" ry="4.5" fill="${INK}"/>
  ${faces(-99, -74, o.flip)}
  </g>`
  );
}

/** Nền cảnh: bầu trời, mặt trời, mây, đồi, cỏ. Lớp .eve và .night đổi màu bằng CSS. */
export function bg(): string {
  return `<rect class="sky" width="400" height="300" fill="#BFE4FF"/>
  <g class="nstars" fill="#FFF4D6"><circle cx="40" cy="36" r="3"/><circle cx="150" cy="26" r="2.5"/><circle cx="235" cy="58" r="3"/><circle cx="285" cy="24" r="2.5"/><circle cx="380" cy="110" r="2.5"/><circle cx="20" cy="120" r="2.5"/></g>
  <circle class="sun" cx="345" cy="52" r="26" fill="#FFCB3C" ${st}/>
  <path class="cloud" d="M52,78 a16,16 0 0 1 28,-12 a21,21 0 0 1 38,6 a14,14 0 0 1 -2,27 h-58 a13,13 0 0 1 -6,-21z" fill="#fff" ${st}/>
  <path class="hill" d="M-5,215 Q90,160 190,205 T405,195 V305 H-5Z" fill="#8ED6A0" ${st}/>
  <path class="ground" d="M-5,246 Q200,228 405,246 V305 H-5Z" fill="#5FC28A" ${st}/>`;
}

export function house(): string {
  return `<rect x="14" y="128" width="120" height="132" fill="#FFF4D6" ${st}/>
  <polygon points="4,132 74,70 144,132" fill="#FF5A4E" ${st}/>
  <rect x="50" y="176" width="46" height="84" rx="6" fill="#9A6240" ${st}/><circle cx="86" cy="220" r="3.5" fill="#FFCB3C"/>
  <rect x="104" y="150" width="20" height="20" rx="3" fill="#BFE4FF" ${st}/>`;
}

// ---------- Đồ vật ----------
const at = (x: number, y: number, s = 1) => `transform="translate(${x} ${y}) scale(${s})"`;

export function balloon(x: number, y: number, c: string): string {
  return `<g ${at(x, y)}><path d="M0,22 q-7,16 1,34" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
  <ellipse rx="16" ry="20" fill="${c}" ${st}/><path d="M-4,25 h8 l-4,-6z" fill="${c}" ${st}/></g>`;
}
export function fish(x: number, y: number, s?: number): string {
  return `<g ${at(x, y, s)}><polygon points="12,0 28,-11 28,11" fill="#4C8DF6" ${st}/><ellipse rx="18" ry="11" fill="#4C8DF6" ${st}/>
  <circle cx="-9" cy="-2" r="2.2" fill="${INK}"/><path d="M-1,-5 q5,5 0,10" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/></g>`;
}
export function bowl(x: number, y: number, s?: number, full?: boolean): string {
  return `<g ${at(x, y, s)}>${full ? `<g transform="rotate(-18)">${fish(2, -7, 0.85)}</g>` : ""}<path d="M-24,0 h48 l-7,18 h-34z" fill="#FF5A4E" ${st}/></g>`;
}
export function pillow(x: number, y: number, s?: number): string {
  return `<g ${at(x, y, s)}><rect x="-28" y="-15" width="56" height="30" rx="13" fill="#fff" ${st}/>
  <path d="M-14,-6 v12 M0,-6 v12 M14,-6 v12" stroke="#8FB8F6" stroke-width="4" stroke-linecap="round"/></g>`;
}
export function ball(x: number, y: number, s?: number): string {
  return `<g ${at(x, y, s)}><circle r="18" fill="#FFCB3C"/>
  <path d="M-16,-7 q16,-9 32,0" fill="none" stroke="#FF5A4E" stroke-width="5"/><path d="M-16,7 q16,9 32,0" fill="none" stroke="#4C8DF6" stroke-width="5"/>
  <circle r="18" fill="none" ${st}/></g>`;
}

/** Đồ vật đặt trong cảnh tình huống, gọi theo `kind` trong cấu hình bước. */
export function propSvg(kind: string): string {
  if (kind === "balloons") return balloon(170, 128, "#F27BA5") + balloon(236, 128, "#3DBE8B");
  if (kind === "bowls") return bowl(184, 274, 0.72) + bowl(224, 274, 0.72);
  return "";
}

// ---------- Thẻ hình vuông 200x200 ----------
const pic = (inner: string) => `<svg viewBox="0 0 200 200" aria-hidden="true">${inner}</svg>`;

const PICS: Record<PicKey, () => string> = {
  hello: () =>
    pic(`<rect width="200" height="200" fill="#BFE4FF"/>
    <circle cx="160" cy="36" r="18" fill="#FFCB3C" ${st}/>
    <path d="M-5,152 Q100,130 205,152 V205 H-5Z" fill="#5FC28A" ${st}/>
    ${cat({ x: 60, y: 178, s: 0.72, cls: "hi" })}${pup({ x: 142, y: 178, s: 0.72, flip: true, cls: "hi" })}`),
  bye: () =>
    pic(`<rect width="200" height="200" fill="#FDB590"/>
    <circle cx="96" cy="128" r="30" fill="#FF7A59" ${st}/>
    <path d="M-5,138 Q100,116 205,138 V205 H-5Z" fill="#3F8C72" ${st}/>
    <path d="M84,200 Q128,172 152,150" fill="none" stroke="#FFE1B8" stroke-width="13" stroke-linecap="round"/>
    ${pup({ x: 158, y: 150, s: 0.42, flip: true, cls: "hi" })}${cat({ x: 56, y: 188, s: 0.78, cls: "hi" })}`),
  miu: () => pic(`<rect width="200" height="200" fill="#FFCB3C"/>${cat({ x: 100, y: 194, s: 1.2, cls: "hi" })}`),
  ben: () => pic(`<rect width="200" height="200" fill="#BFE4FF"/>${pup({ x: 100, y: 194, s: 1.2, cls: "hi" })}`),
  happy: () =>
    pic(`<rect width="200" height="200" fill="#BFE4FF"/>
    <path d="M-5,160 Q100,140 205,160 V205 H-5Z" fill="#5FC28A" ${st}/>
    ${balloon(141, 42, "#F27BA5")}${cat({ x: 90, y: 188, s: 1.08, cls: "hi", mood: "happy" })}`),
  hungry: () =>
    pic(`<rect width="200" height="200" fill="#FFE9C7"/>
    <path d="M-5,162 H205 V205 H-5Z" fill="#F2C48D" ${st}/>
    <circle cx="160" cy="42" r="29" fill="#fff" ${st}/><circle cx="134" cy="78" r="5.5" fill="#fff" ${st}/><circle cx="126" cy="90" r="3.5" fill="#fff" ${st}/>
    ${fish(158, 42, 0.95)}${bowl(164, 176, 0.9)}${cat({ x: 80, y: 190, s: 1.05, mood: "hungry" })}`),
  sleepy: () =>
    pic(`<rect width="200" height="200" fill="#3B3F7A"/>
    <circle cx="174" cy="30" r="16" fill="#FFF4D6" ${st}/>
    <g fill="#FFF4D6"><circle cx="26" cy="30" r="3"/><circle cx="72" cy="18" r="2.5"/><circle cx="112" cy="46" r="2.5"/><circle cx="184" cy="92" r="2.5"/></g>
    <path d="M-5,162 Q100,146 205,162 V205 H-5Z" fill="#2F6B66" ${st}/>
    ${pillow(158, 178, 1)}${cat({ x: 80, y: 190, s: 1.05, mood: "sleepy" })}`),
  "item-fish": () => pic(`<rect width="200" height="200" fill="#FFFDF6"/>${bowl(100, 112, 2.9, true)}`),
  "item-pillow": () => pic(`<rect width="200" height="200" fill="#FFFDF6"/>${pillow(100, 100, 2.7)}`),
  "item-ball": () => pic(`<rect width="200" height="200" fill="#FFFDF6"/>${ball(100, 100, 3.6)}`),
};

export function picSvg(key: string): string {
  return (PICS as Record<string, () => string>)[key]?.() ?? pic(`<rect width="200" height="200" fill="#FFFDF6"/>`);
}

// ---------- Ảnh đại diện của bé ----------
const AVATARS: Record<string, () => string> = {
  miu: () => cat({ x: 100, y: 194, s: 1.2, cls: "hi" }),
  ben: () => pup({ x: 100, y: 194, s: 1.2, cls: "hi" }),
  kem: () => cat({ x: 100, y: 194, s: 1.2, cls: "hi", fur: "#F3DFC1" }),
  xam: () => cat({ x: 100, y: 194, s: 1.2, cls: "hi", fur: "#B8BACB" }),
  den: () => pup({ x: 100, y: 194, s: 1.2, cls: "hi", fur: "#6A6672", ear: "#2F2C36", shirt: "#F27BA5" }),
  nau: () => pup({ x: 100, y: 194, s: 1.2, cls: "hi", fur: "#C98F5A", ear: "#7A4A2A", shirt: "#3DBE8B" }),
};
const AVATAR_BG: Record<string, string> = {
  miu: "#FFCB3C", ben: "#BFE4FF", kem: "#FFD6E0", xam: "#CDEBD3", den: "#FFE3A8", nau: "#D9D2FF",
};

export function avatarSvg(key: string): string {
  const k = key in AVATARS ? key : "miu";
  return pic(`<rect width="200" height="200" fill="${AVATAR_BG[k]}"/>${AVATARS[k]()}`);
}

/** Hình nền cho huy hiệu phần thưởng và nhãn dán. */
export function badgeSvg(key: string): string {
  return picSvg(key);
}

export const ICONS = {
  next: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  sound: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5l5 4v-13l-5 4z" fill="currentColor"/><path d="M16 9a4.5 4.5 0 0 1 0 6M18.6 6.4a8.5 8.5 0 0 1 0 11.2"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>`,
  again: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.4-5.3"/><path d="M5 4.5v4.8h4.8"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
  parent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/></svg>`,
  star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="#FFCB3C" stroke="#23254D" stroke-width="2" stroke-linejoin="round"/></svg>`,
  stickers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 16.4 6.8 19.3l1-5.9L3.5 9.2l5.9-.8z"/></svg>`,
};
