"use client";

import { useEffect, useState } from "react";
import { extractPetColors, ColorPalette } from "@/lib/colorExtract";

export type Emotion = "idle" | "happy" | "excited" | "sad";

interface Props {
  petType: string;
  petImage: string | null;
  emotion: Emotion;
}

const P = 90; // photo diameter px

const DEFAULT: ColorPalette = {
  primary: "rgb(232,192,138)", dark: "rgb(167,138,100)", light: "rgb(255,222,172)",
  hex: "#E8C08A", darkHex: "#A78A64", lightHex: "#FFDEAC",
  r: 232, g: 192, b: 138,
};

function earPad(type: string) {
  if (type === "猫") return 44;
  if (type === "うさぎ") return 68;
  if (type === "ハムスター") return 28;
  return 20;
}

export default function PetPhotoCharacter({ petType, petImage, emotion }: Props) {
  const [colors, setColors] = useState<ColorPalette>(DEFAULT);

  useEffect(() => {
    if (petImage) extractPetColors(petImage).then(setColors);
    else setColors(DEFAULT);
  }, [petImage]);

  const ep = earPad(petType);
  const W = P + 44;

  const cls = { idle: "pp-idle", happy: "pp-happy", excited: "pp-excited", sad: "pp-sad" }[emotion];

  return (
    <>
      <style>{`
        .pp-base { transform-origin: bottom center; display: inline-block; }
        .pp-idle    { animation: ppIdle 4s ease-in-out infinite; }
        .pp-happy   { animation: ppHappy 1.6s ease-in-out forwards; }
        .pp-excited { animation: ppExcited 0.9s ease-in-out infinite; }
        .pp-sad     { animation: ppSad 2.8s ease-in-out infinite; }

        @keyframes ppIdle {
          0%   { transform: perspective(520px) translateY(0px)   rotateX(0deg)   rotateY(0deg)   rotateZ(0deg); }
          18%  { transform: perspective(520px) translateY(-12px) rotateX(8deg)   rotateY(17deg)  rotateZ(2deg); }
          42%  { transform: perspective(520px) translateY(-5px)  rotateX(-5deg)  rotateY(-14deg) rotateZ(-2deg); }
          63%  { transform: perspective(520px) translateY(-14px) rotateX(7deg)   rotateY(15deg)  rotateZ(1deg); }
          84%  { transform: perspective(520px) translateY(-4px)  rotateX(-6deg)  rotateY(-11deg) rotateZ(-3deg); }
          100% { transform: perspective(520px) translateY(0px)   rotateX(0deg)   rotateY(0deg)   rotateZ(0deg); }
        }
        @keyframes ppHappy {
          0%   { transform: perspective(520px) translateY(0)     rotateZ(0deg)   scale(1);    filter:brightness(1); }
          16%  { transform: perspective(520px) translateY(-38px) rotateZ(-19deg) scale(1.22); filter:brightness(1.12); }
          32%  { transform: perspective(520px) translateY(-9px)  rotateZ(15deg)  scale(1.09); filter:brightness(1.06); }
          50%  { transform: perspective(520px) translateY(-30px) rotateZ(-13deg) scale(1.18); filter:brightness(1.1); }
          68%  { transform: perspective(520px) translateY(-6px)  rotateZ(10deg)  scale(1.07); filter:brightness(1.04); }
          84%  { transform: perspective(520px) translateY(-18px) rotateZ(-7deg)  scale(1.11); filter:brightness(1.06); }
          100% { transform: perspective(520px) translateY(0)     rotateZ(0deg)   scale(1);    filter:brightness(1); }
        }
        @keyframes ppExcited {
          0%,100% { transform: perspective(520px) translateY(0)     rotateY(0deg)   rotateZ(0deg)    scale(1);    filter:brightness(1) saturate(1); }
          11%  { transform: perspective(520px) translateY(-36px) rotateY(29deg)  rotateZ(-13deg)  scale(1.23); filter:brightness(1.15) saturate(1.2); }
          26%  { transform: perspective(520px) translateY(-11px) rotateY(-23deg) rotateZ(11deg)   scale(1.12); filter:brightness(1.06) saturate(1.1); }
          42%  { transform: perspective(520px) translateY(-32px) rotateY(25deg)  rotateZ(-10deg)  scale(1.2);  filter:brightness(1.13) saturate(1.2); }
          58%  { transform: perspective(520px) translateY(-9px)  rotateY(-20deg) rotateZ(9deg)    scale(1.1);  filter:brightness(1.05) saturate(1.1); }
          74%  { transform: perspective(520px) translateY(-27px) rotateY(21deg)  rotateZ(-8deg)   scale(1.17); filter:brightness(1.1) saturate(1.15); }
          88%  { transform: perspective(520px) translateY(-5px)  rotateY(-13deg) rotateZ(5deg)    scale(1.05); filter:brightness(1.02) saturate(1); }
        }
        @keyframes ppSad {
          0%,100% { transform:perspective(520px) translateY(5px) rotateX(23deg) rotateZ(0deg);  filter:brightness(0.88) saturate(0.75); }
          35%  { transform:perspective(520px) translateY(10px) rotateX(28deg) rotateZ(9deg);  filter:brightness(0.85) saturate(0.7); }
          70%  { transform:perspective(520px) translateY(8px)  rotateX(25deg) rotateZ(-7deg); filter:brightness(0.86) saturate(0.72); }
        }

        .pp-heart  { animation: ppHeartPop 0.75s ease-in-out infinite; }
        .pp-heart2 { animation: ppHeartPop 0.75s ease-in-out 0.18s infinite; }
        @keyframes ppHeartPop {
          0%,100% { transform:scale(1); }
          50%     { transform:scale(1.4); }
        }

        .pp-o1 { animation: ppOrbit1 1.25s linear infinite; position:absolute; }
        .pp-o2 { animation: ppOrbit2 1.25s linear infinite 0.42s; position:absolute; }
        .pp-o3 { animation: ppOrbit3 1.65s linear infinite 0.18s; position:absolute; }
        @keyframes ppOrbit1 {
          from { transform:rotate(0deg)    translateX(56px) rotate(0deg); }
          to   { transform:rotate(360deg)  translateX(56px) rotate(-360deg); }
        }
        @keyframes ppOrbit2 {
          from { transform:rotate(120deg)  translateX(60px) rotate(-120deg); }
          to   { transform:rotate(480deg)  translateX(60px) rotate(-480deg); }
        }
        @keyframes ppOrbit3 {
          from { transform:rotate(240deg)  translateX(58px) rotate(-240deg); }
          to   { transform:rotate(-120deg) translateX(58px) rotate(120deg); }
        }

        .pp-tear {
          position:absolute; width:7px; height:12px;
          border-radius:50% 50% 60% 60% / 38% 38% 72% 72%;
          background:#87CEEB; opacity:0;
          animation:ppTear 1.7s ease-in infinite;
        }
        @keyframes ppTear {
          0%  { opacity:0;   transform:translateY(0); }
          12% { opacity:0.9; }
          90% { opacity:0.6; }
          100%{ opacity:0;   transform:translateY(30px); }
        }
      `}</style>

      <div style={{ display: "inline-block", position: "relative", width: W }}>
        <div className={`pp-base ${cls}`}>

          {/* ── Ears ── */}
          {petType === "猫" ? (
            <div style={{ position: "relative", height: ep - 4, marginBottom: 4 }}>
              {/* left */}
              <div style={{ position:"absolute", left:22+2, bottom:0, width:0, height:0, borderLeft:"19px solid transparent", borderRight:"19px solid transparent", borderBottom:`${ep-4}px solid ${colors.darkHex}`, transform:"rotate(-10deg)", transformOrigin:"bottom center" }}/>
              <div style={{ position:"absolute", left:22+8, bottom:4, width:0, height:0, borderLeft:"11px solid transparent", borderRight:"11px solid transparent", borderBottom:`${(ep-4)*0.62}px solid #FFB0C8`, transform:"rotate(-10deg)", transformOrigin:"bottom center", opacity:0.85 }}/>
              {/* right */}
              <div style={{ position:"absolute", right:22+2, bottom:0, width:0, height:0, borderLeft:"19px solid transparent", borderRight:"19px solid transparent", borderBottom:`${ep-4}px solid ${colors.darkHex}`, transform:"rotate(10deg)", transformOrigin:"bottom center" }}/>
              <div style={{ position:"absolute", right:22+8, bottom:4, width:0, height:0, borderLeft:"11px solid transparent", borderRight:"11px solid transparent", borderBottom:`${(ep-4)*0.62}px solid #FFB0C8`, transform:"rotate(10deg)", transformOrigin:"bottom center", opacity:0.85 }}/>
            </div>
          ) : petType === "うさぎ" ? (
            <div style={{ position:"relative", height:ep-4, marginBottom:4 }}>
              {/* left */}
              <div style={{ position:"absolute", left:22+8, bottom:0, width:24, height:ep+12, borderRadius:"50%", background:colors.darkHex, transform:"rotate(-9deg)", transformOrigin:"bottom center" }}/>
              <div style={{ position:"absolute", left:22+13, bottom:6, width:13, height:ep+4, borderRadius:"50%", background:"#FFB0C8", transform:"rotate(-9deg)", transformOrigin:"bottom center", opacity:0.8 }}/>
              {/* right */}
              <div style={{ position:"absolute", right:22+8, bottom:0, width:24, height:ep+12, borderRadius:"50%", background:colors.darkHex, transform:"rotate(9deg)", transformOrigin:"bottom center" }}/>
              <div style={{ position:"absolute", right:22+13, bottom:6, width:13, height:ep+4, borderRadius:"50%", background:"#FFB0C8", transform:"rotate(9deg)", transformOrigin:"bottom center", opacity:0.8 }}/>
            </div>
          ) : petType === "ハムスター" ? (
            <div style={{ position:"relative", height:ep-4, marginBottom:4 }}>
              <div style={{ position:"absolute", left:22+4, bottom:-8, width:30, height:30, borderRadius:"50%", background:colors.darkHex }}/>
              <div style={{ position:"absolute", right:22+4, bottom:-8, width:30, height:30, borderRadius:"50%", background:colors.darkHex }}/>
            </div>
          ) : (
            /* Dog: floppy ears on sides, no extra top space */
            <div style={{ height: ep }} />
          )}

          {/* ── Photo ── */}
          <div style={{ position:"relative" }}>
            {/* Dog floppy ears (on sides) */}
            {petType !== "猫" && petType !== "うさぎ" && petType !== "ハムスター" && (
              <>
                <div style={{ position:"absolute", left:-10, top:8, width:30, height:58, borderRadius:"50%", background:`linear-gradient(160deg,${colors.hex},${colors.darkHex})`, transform:"rotate(-20deg)", transformOrigin:"top center", zIndex:1, boxShadow:"2px 3px 8px rgba(0,0,0,0.18)" }}/>
                <div style={{ position:"absolute", right:-10, top:8, width:30, height:58, borderRadius:"50%", background:`linear-gradient(20deg,${colors.hex},${colors.darkHex})`, transform:"rotate(20deg)", transformOrigin:"top center", zIndex:1, boxShadow:"-2px 3px 8px rgba(0,0,0,0.18)" }}/>
              </>
            )}

            {/* Photo circle */}
            <div style={{
              width:P, height:P, borderRadius:"50%", overflow:"hidden",
              border:`4px solid ${colors.darkHex}`,
              boxShadow:`0 6px 22px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.14), inset 0 -3px 10px rgba(0,0,0,0.1), 0 0 0 2px ${colors.hex}`,
              position:"relative", zIndex:2, margin:"0 auto",
            }}>
              {petImage
                ? <img src={petImage} alt="pet" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <div style={{ width:"100%", height:"100%", background:`radial-gradient(circle at 35% 35%,${colors.lightHex},${colors.hex})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>🐾</div>
              }
            </div>

            {/* Expression overlays */}
            {emotion === "happy" && (
              <>
                <div className="pp-heart" style={{ position:"absolute", left:P*0.17, top:P*0.33, fontSize:19, zIndex:3, color:"#FF1060" }}>♥</div>
                <div className="pp-heart2" style={{ position:"absolute", right:P*0.17, top:P*0.33, fontSize:19, zIndex:3, color:"#FF1060" }}>♥</div>
              </>
            )}
            {emotion === "excited" && (
              <>
                <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", zIndex:4, width:0, height:0 }}>
                  <span className="pp-o1" style={{ fontSize:13 }}>✨</span>
                  <span className="pp-o2" style={{ fontSize:11 }}>⭐</span>
                  <span className="pp-o3" style={{ fontSize:12 }}>✨</span>
                </div>
                <div style={{ position:"absolute", left:P*0.16, top:P*0.3, fontSize:18, zIndex:3 }}>⭐</div>
                <div style={{ position:"absolute", right:P*0.16, top:P*0.3, fontSize:18, zIndex:3 }}>⭐</div>
              </>
            )}
            {emotion === "sad" && (
              <>
                <div className="pp-tear" style={{ left:P*0.3, top:P*0.52, animationDelay:"0s", zIndex:3 }} />
                <div className="pp-tear" style={{ right:P*0.3, top:P*0.52, animationDelay:"0.75s", zIndex:3 }} />
              </>
            )}
          </div>

          {/* ── Body ── */}
          <div style={{
            width:P*0.68, height:P*0.32,
            borderRadius:"0 0 50% 50% / 0 0 100% 100%",
            background:`radial-gradient(ellipse at 38% 28%,${colors.lightHex},${colors.hex})`,
            margin:"-5px auto 0",
            boxShadow:"0 4px 12px rgba(0,0,0,0.13)",
            zIndex:2, position:"relative",
          }}/>

        </div>
      </div>
    </>
  );
}
