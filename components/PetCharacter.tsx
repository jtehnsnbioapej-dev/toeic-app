"use client";

import { useEffect, useState } from "react";
import { extractPetColors, ColorPalette } from "@/lib/colorExtract";

export type Emotion = "idle" | "happy" | "excited" | "sad";

interface Props {
  petType: string;
  petImage: string | null;
  emotion: Emotion;
}

const DEFAULT_COLORS: ColorPalette = {
  primary: "rgb(232,192,138)", dark: "rgb(167,138,100)", light: "rgb(255,222,172)",
  hex: "#E8C08A", darkHex: "#A78A64", lightHex: "#FFDEAC",
  r: 232, g: 192, b: 138,
};

const ANIM: Record<Emotion, string> = {
  idle: "anim-idle",
  happy: "anim-happy",
  excited: "anim-excited",
  sad: "anim-sad",
};

export default function PetCharacter({ petType, petImage, emotion }: Props) {
  const [colors, setColors] = useState<ColorPalette>(DEFAULT_COLORS);

  useEffect(() => {
    if (petImage) extractPetColors(petImage).then(setColors);
    else setColors(DEFAULT_COLORS);
  }, [petImage]);

  const isCat = petType === "猫";

  return (
    <>
      <style>{`
        .pet-wrap { display:inline-block; transform-origin: bottom center; }
        .anim-idle  { animation: petFloat  4s   ease-in-out infinite; }
        .anim-happy { animation: petHappy  1.4s ease-in-out 1 forwards; }
        .anim-excited { animation: petExcited 0.9s ease-in-out infinite; }
        .anim-sad   { animation: petSad    2.5s ease-in-out infinite; }

        @keyframes petFloat {
          0%   { transform: perspective(350px) translateY(0px)  rotateX(0deg)  rotateY(0deg); }
          20%  { transform: perspective(350px) translateY(-9px)  rotateX(5deg)  rotateY(10deg); }
          40%  { transform: perspective(350px) translateY(-4px)  rotateX(-3deg) rotateY(-8deg); }
          60%  { transform: perspective(350px) translateY(-11px) rotateX(4deg)  rotateY(7deg); }
          80%  { transform: perspective(350px) translateY(-3px)  rotateX(-4deg) rotateY(-9deg); }
          100% { transform: perspective(350px) translateY(0px)  rotateX(0deg)  rotateY(0deg); }
        }
        @keyframes petHappy {
          0%   { transform: perspective(350px) translateY(0px)   rotateZ(0deg)   scale(1); }
          18%  { transform: perspective(350px) translateY(-26px) rotateZ(-13deg) scale(1.13); }
          36%  { transform: perspective(350px) translateY(-7px)  rotateZ(10deg)  scale(1.07); }
          54%  { transform: perspective(350px) translateY(-20px) rotateZ(-8deg)  scale(1.11); }
          72%  { transform: perspective(350px) translateY(-5px)  rotateZ(6deg)   scale(1.05); }
          100% { transform: perspective(350px) translateY(0px)   rotateZ(0deg)   scale(1); }
        }
        @keyframes petExcited {
          0%,100% { transform: perspective(350px) translateY(0px)   rotateY(0deg)   scale(1); }
          12%  { transform: perspective(350px) translateY(-28px) rotateY(22deg)  scale(1.16); }
          28%  { transform: perspective(350px) translateY(-9px)  rotateY(-18deg) scale(1.09); }
          45%  { transform: perspective(350px) translateY(-24px) rotateY(17deg)  scale(1.14); }
          62%  { transform: perspective(350px) translateY(-7px)  rotateY(-14deg) scale(1.08); }
          78%  { transform: perspective(350px) translateY(-18px) rotateY(12deg)  scale(1.11); }
        }
        @keyframes petSad {
          0%,100% { transform: perspective(350px) translateY(0px) rotateX(0deg)  rotateZ(0deg); }
          30%  { transform: perspective(350px) translateY(7px)  rotateX(14deg) rotateZ(5deg); }
          65%  { transform: perspective(350px) translateY(5px)  rotateX(11deg) rotateZ(-4deg); }
        }
      `}</style>
      <div className="pet-wrap">
        <div className={ANIM[emotion]}>
          {isCat
            ? <CatSVG petImage={petImage} emotion={emotion} colors={colors} />
            : <DogSVG petImage={petImage} emotion={emotion} colors={colors} />}
        </div>
      </div>
    </>
  );
}

/* ─── Dog ─── */
function DogSVG({ petImage, emotion, colors }: { petImage: string | null; emotion: Emotion; colors: ColorPalette }) {
  const { primary, dark, light } = colors;

  const tail =
    emotion === "happy" || emotion === "excited"
      ? "M 154,194 Q 186,158 176,132 Q 166,108 152,122"
      : emotion === "sad"
      ? "M 154,194 Q 172,208 167,228"
      : "M 154,194 Q 180,182 175,160";

  const lBrow =
    emotion === "sad"     ? "M 63,68 Q 77,61 85,69"
    : emotion === "excited" ? "M 63,58 Q 77,51 85,58"
    : emotion === "happy"   ? "M 63,62 Q 77,55 85,62"
    :                         "M 64,65 Q 77,59 85,65";

  const rBrow =
    emotion === "sad"     ? "M 115,69 Q 123,61 137,68"
    : emotion === "excited" ? "M 115,58 Q 123,51 137,58"
    : emotion === "happy"   ? "M 115,62 Q 123,55 137,62"
    :                         "M 115,65 Q 123,59 137,65";

  const blush = (emotion === "happy" || emotion === "excited") ? 0.45 : 0.07;

  return (
    <svg viewBox="0 0 200 242" width="110" height="133" xmlns="http://www.w3.org/2000/svg">
      {/* Tail */}
      <path d={tail} fill="none" stroke={dark} strokeWidth="14" strokeLinecap="round"/>

      {/* Body */}
      <ellipse cx="100" cy="200" rx="54" ry="43" fill={primary}/>

      {/* Paws */}
      <ellipse cx="70"  cy="234" rx="21" ry="11" fill={primary}/>
      <ellipse cx="130" cy="234" rx="21" ry="11" fill={primary}/>

      {/* Ears */}
      <ellipse cx="46"  cy="78" rx="23" ry="41" fill={dark} transform="rotate(-13 46 78)"/>
      <ellipse cx="46"  cy="85" rx="13" ry="29" fill="rgb(255,165,178)" transform="rotate(-13 46 78)" opacity="0.75"/>
      <ellipse cx="154" cy="78" rx="23" ry="41" fill={dark} transform="rotate(13 154 78)"/>
      <ellipse cx="154" cy="85" rx="13" ry="29" fill="rgb(255,165,178)" transform="rotate(13 154 78)" opacity="0.75"/>

      {/* Head */}
      <circle cx="100" cy="100" r="67" fill={primary}/>

      {/* Face (photo or default) */}
      <defs>
        <clipPath id="dog-face-clip">
          <circle cx="100" cy="92" r="50"/>
        </clipPath>
      </defs>

      {petImage ? (
        <image
          href={petImage}
          x="50" y="42" width="100" height="100"
          clipPath="url(#dog-face-clip)"
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <>
          <circle cx="100" cy="92" r="50" fill={light}/>
          <circle cx="80"  cy="86" r="9"  fill="#2D2010"/>
          <circle cx="120" cy="86" r="9"  fill="#2D2010"/>
          <circle cx="83"  cy="83" r="3.5" fill="white"/>
          <circle cx="123" cy="83" r="3.5" fill="white"/>
        </>
      )}

      {/* Expression overlays on photo */}
      {petImage && emotion === "happy" && (
        <>
          <text x="80"  y="94" fontSize="19" textAnchor="middle" opacity="0.9" fill="#FF3070">♥</text>
          <text x="120" y="94" fontSize="19" textAnchor="middle" opacity="0.9" fill="#FF3070">♥</text>
        </>
      )}
      {petImage && emotion === "excited" && (
        <>
          <text x="80"  y="95" fontSize="19" textAnchor="middle" opacity="0.9" fill="#FFB000">★</text>
          <text x="120" y="95" fontSize="19" textAnchor="middle" opacity="0.9" fill="#FFB000">★</text>
          <text x="28"  y="55" fontSize="14" opacity="0.8">✨</text>
          <text x="158" y="50" fontSize="12" opacity="0.8">✨</text>
        </>
      )}
      {petImage && emotion === "sad" && (
        <>
          <ellipse cx="78"  cy="113" rx="5" ry="9" fill="#87CEEB" opacity="0.8"/>
          <ellipse cx="122" cy="113" rx="5" ry="9" fill="#87CEEB" opacity="0.8"/>
        </>
      )}

      {/* Blush */}
      <circle cx="62"  cy="118" r="16" fill="#FF7090" opacity={blush}/>
      <circle cx="138" cy="118" r="16" fill="#FF7090" opacity={blush}/>

      {/* Eyebrows */}
      <path d={lBrow} fill="none" stroke={dark} strokeWidth="3.5" strokeLinecap="round"/>
      <path d={rBrow} fill="none" stroke={dark} strokeWidth="3.5" strokeLinecap="round"/>

      {/* Snout */}
      <ellipse cx="100" cy="150" rx="29" ry="20" fill={light}/>

      {/* Nose */}
      <ellipse cx="100" cy="143" rx="11" ry="8"  fill="#7B2535"/>
      <ellipse cx="100" cy="141" rx="5.5" ry="3" fill="#C06070" opacity="0.45"/>

      {/* Mouth */}
      {emotion === "sad" ? (
        <path d="M 87,163 Q 100,155 113,163" fill="none" stroke="#7B2535" strokeWidth="2.5" strokeLinecap="round"/>
      ) : emotion === "excited" ? (
        <>
          <path d="M 85,159 Q 100,176 115,159" fill="#FF8090" stroke="#7B2535" strokeWidth="2"/>
          <ellipse cx="100" cy="167" rx="10" ry="6" fill="#CC3050" opacity="0.6"/>
        </>
      ) : (
        <path d="M 87,160 Q 100,171 113,160" fill="none" stroke="#7B2535" strokeWidth="2.5" strokeLinecap="round"/>
      )}
    </svg>
  );
}

/* ─── Cat ─── */
function CatSVG({ petImage, emotion, colors }: { petImage: string | null; emotion: Emotion; colors: ColorPalette }) {
  const { primary, dark, light } = colors;

  const tail =
    emotion === "happy" || emotion === "excited"
      ? "M 152,200 Q 184,175 188,145 Q 192,115 177,105"
      : emotion === "sad"
      ? "M 152,200 Q 168,222 163,240"
      : "M 152,200 Q 180,192 185,168 Q 190,148 180,138";

  const lBrow =
    emotion === "sad"     ? "M 65,70 Q 78,63 86,72"
    : emotion === "excited" ? "M 65,60 Q 78,53 86,60"
    : emotion === "happy"   ? "M 65,63 Q 78,57 86,63"
    :                         "M 66,67 Q 78,61 86,67";

  const rBrow =
    emotion === "sad"     ? "M 114,72 Q 122,63 135,70"
    : emotion === "excited" ? "M 114,60 Q 122,53 135,60"
    : emotion === "happy"   ? "M 114,63 Q 122,57 135,63"
    :                         "M 114,67 Q 122,61 135,67";

  const blush = (emotion === "happy" || emotion === "excited") ? 0.38 : 0.05;

  return (
    <svg viewBox="0 0 200 242" width="110" height="133" xmlns="http://www.w3.org/2000/svg">
      {/* Tail */}
      <path d={tail} fill="none" stroke={dark} strokeWidth="12" strokeLinecap="round"/>

      {/* Body */}
      <ellipse cx="100" cy="200" rx="50" ry="43" fill={primary}/>

      {/* Paws */}
      <ellipse cx="72"  cy="234" rx="19" ry="10" fill={primary}/>
      <ellipse cx="128" cy="234" rx="19" ry="10" fill={primary}/>

      {/* Ears */}
      <polygon points="46,80 61,34 80,80"  fill={dark}/>
      <polygon points="52,76 61,44 74,76"  fill="rgb(255,175,190)" opacity="0.8"/>
      <polygon points="120,80 139,34 154,80" fill={dark}/>
      <polygon points="126,76 139,44 148,76" fill="rgb(255,175,190)" opacity="0.8"/>

      {/* Head */}
      <circle cx="100" cy="105" r="64" fill={primary}/>

      {/* Face */}
      <defs>
        <clipPath id="cat-face-clip">
          <circle cx="100" cy="97" r="49"/>
        </clipPath>
      </defs>

      {petImage ? (
        <image
          href={petImage}
          x="51" y="48" width="98" height="98"
          clipPath="url(#cat-face-clip)"
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <>
          <circle cx="100" cy="97" r="49" fill={light}/>
          <ellipse cx="80"  cy="91" rx="10" ry="9"  fill="#4A8040"/>
          <ellipse cx="120" cy="91" rx="10" ry="9"  fill="#4A8040"/>
          <ellipse cx="80"  cy="91" rx="4"  ry="8.5" fill="#1A1010"/>
          <ellipse cx="120" cy="91" rx="4"  ry="8.5" fill="#1A1010"/>
          <circle  cx="83"  cy="87" r="2.5" fill="white"/>
          <circle  cx="123" cy="87" r="2.5" fill="white"/>
        </>
      )}

      {/* Expression overlays */}
      {petImage && emotion === "happy" && (
        <>
          <text x="80"  y="98" fontSize="19" textAnchor="middle" opacity="0.9" fill="#FF3070">♥</text>
          <text x="120" y="98" fontSize="19" textAnchor="middle" opacity="0.9" fill="#FF3070">♥</text>
        </>
      )}
      {petImage && emotion === "excited" && (
        <>
          <text x="80"  y="99" fontSize="19" textAnchor="middle" opacity="0.9" fill="#FFB000">★</text>
          <text x="120" y="99" fontSize="19" textAnchor="middle" opacity="0.9" fill="#FFB000">★</text>
          <text x="26"  y="60" fontSize="13" opacity="0.8">✨</text>
          <text x="158" y="54" fontSize="11" opacity="0.8">✨</text>
        </>
      )}
      {petImage && emotion === "sad" && (
        <>
          <ellipse cx="78"  cy="116" rx="5" ry="9" fill="#87CEEB" opacity="0.8"/>
          <ellipse cx="122" cy="116" rx="5" ry="9" fill="#87CEEB" opacity="0.8"/>
        </>
      )}

      {/* Blush */}
      <circle cx="63"  cy="120" r="15" fill="#FF7090" opacity={blush}/>
      <circle cx="137" cy="120" r="15" fill="#FF7090" opacity={blush}/>

      {/* Eyebrows */}
      <path d={lBrow} fill="none" stroke={dark} strokeWidth="3" strokeLinecap="round"/>
      <path d={rBrow} fill="none" stroke={dark} strokeWidth="3" strokeLinecap="round"/>

      {/* Whiskers */}
      <line x1="52"  y1="147" x2="88"  y2="151" stroke={dark} strokeWidth="1.5" opacity="0.55"/>
      <line x1="50"  y1="155" x2="88"  y2="156" stroke={dark} strokeWidth="1.5" opacity="0.55"/>
      <line x1="112" y1="151" x2="148" y2="147" stroke={dark} strokeWidth="1.5" opacity="0.55"/>
      <line x1="112" y1="156" x2="150" y2="155" stroke={dark} strokeWidth="1.5" opacity="0.55"/>

      {/* Nose */}
      <polygon points="100,145 93,151 107,151" fill="#C06070"/>

      {/* Mouth */}
      {emotion === "sad" ? (
        <path d="M 91,160 Q 100,153 109,160" fill="none" stroke="#7B2535" strokeWidth="2" strokeLinecap="round"/>
      ) : emotion === "excited" ? (
        <>
          <path d="M 89,157 Q 100,171 111,157" fill="#FF8090" stroke="#7B2535" strokeWidth="1.5"/>
        </>
      ) : (
        <>
          <path d="M 100,152 L 92,159" fill="none" stroke="#7B2535" strokeWidth="2" strokeLinecap="round"/>
          <path d="M 100,152 L 108,159" fill="none" stroke="#7B2535" strokeWidth="2" strokeLinecap="round"/>
        </>
      )}
    </svg>
  );
}
