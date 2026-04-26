"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { extractPetColors, ColorPalette } from "@/lib/colorExtract";

export type Emotion = "idle" | "happy" | "excited" | "sad";

interface Props {
  petType: string;
  petImage: string | null;
  emotion: Emotion;
  size?: number;
}

const DEFAULT_COLORS: ColorPalette = {
  primary: "rgb(232,192,138)", dark: "rgb(158,131,94)", light: "rgb(255,221,170)",
  hex: "#E8C08A", darkHex: "#9E8360", lightHex: "#FFDAAA",
  r: 232, g: 192, b: 138,
};

/* ───── Dog 3D ───── */
function DogMesh({ petImage, emotion, colors }: { petImage: string | null; emotion: Emotion; colors: ColorPalette }) {
  const group = useRef<THREE.Group>(null!);
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!petImage) return;
    const loader = new THREE.TextureLoader();
    loader.load(petImage, (t) => { t.needsUpdate = true; setTex(t); });
  }, [petImage]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    const g = group.current;

    // Reset scale
    g.scale.setScalar(1);

    if (emotion === "idle") {
      g.position.y = Math.sin(t * 1.4) * 0.1;
      g.rotation.y = Math.sin(t * 0.75) * 0.18;
      g.rotation.z = Math.sin(t * 0.9) * 0.04;
    } else if (emotion === "happy") {
      g.position.y = Math.abs(Math.sin(t * 3.8)) * 0.38;
      g.rotation.z = Math.sin(t * 3.2) * 0.2;
      g.rotation.y = Math.sin(t * 2.1) * 0.28;
      g.scale.setScalar(1 + Math.abs(Math.sin(t * 3.8)) * 0.06);
    } else if (emotion === "excited") {
      g.position.y = Math.abs(Math.sin(t * 5.5)) * 0.5;
      g.rotation.y = t * 2.8;
      g.scale.setScalar(1 + Math.sin(t * 7) * 0.08);
    } else if (emotion === "sad") {
      g.position.y = -Math.abs(Math.sin(t * 0.9)) * 0.08 - 0.05;
      g.rotation.x = 0.22;
      g.rotation.z = Math.sin(t * 0.55) * 0.07;
    }
  });

  const { hex, darkHex, lightHex } = colors;

  return (
    <group ref={group}>
      {/* Body */}
      <mesh position={[0, -0.62, 0]} scale={[0.88, 0.72, 0.78]}>
        <sphereGeometry args={[0.72, 32, 32]} />
        <meshStandardMaterial color={hex} roughness={0.82} metalness={0.0} />
      </mesh>

      {/* Paws */}
      {[[-0.38, -1.12, 0.22], [0.38, -1.12, 0.22]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} scale={[0.58, 0.27, 0.48]}>
          <sphereGeometry args={[0.42, 16, 16]} />
          <meshStandardMaterial color={hex} roughness={0.85} />
        </mesh>
      ))}

      {/* Left ear (floppy) */}
      <mesh position={[-0.78, 0.22, 0.04]} rotation={[0.28, 0.1, -0.22]} scale={[0.31, 0.68, 0.27]}>
        <sphereGeometry args={[0.62, 20, 20]} />
        <meshStandardMaterial color={darkHex} roughness={0.88} />
      </mesh>
      <mesh position={[-0.76, 0.2, 0.12]} rotation={[0.28, 0.1, -0.22]} scale={[0.18, 0.5, 0.15]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial color="#FFB0C0" roughness={0.9} />
      </mesh>

      {/* Right ear (floppy) */}
      <mesh position={[0.78, 0.22, 0.04]} rotation={[0.28, -0.1, 0.22]} scale={[0.31, 0.68, 0.27]}>
        <sphereGeometry args={[0.62, 20, 20]} />
        <meshStandardMaterial color={darkHex} roughness={0.88} />
      </mesh>
      <mesh position={[0.76, 0.2, 0.12]} rotation={[0.28, -0.1, 0.22]} scale={[0.18, 0.5, 0.15]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial color="#FFB0C0" roughness={0.9} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.78, 48, 48]} />
        <meshStandardMaterial color={hex} roughness={0.72} />
      </mesh>

      {/* Face photo disc */}
      {tex && (
        <mesh position={[0, 0.2, 0.75]}>
          <circleGeometry args={[0.56, 64]} />
          <meshStandardMaterial map={tex} roughness={0.45} />
        </mesh>
      )}

      {/* Default face (no photo) */}
      {!tex && (
        <>
          <mesh position={[-0.27, 0.34, 0.7]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#1A0A08" roughness={0.15} />
          </mesh>
          <mesh position={[0.27, 0.34, 0.7]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#1A0A08" roughness={0.15} />
          </mesh>
          <mesh position={[-0.24, 0.37, 0.76]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[0.3, 0.37, 0.76]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </>
      )}

      {/* Emotion overlays on photo */}
      {tex && emotion === "happy" && (
        <>
          <mesh position={[-0.23, 0.36, 0.77]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#FF1060" emissive="#FF1060" emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[0.23, 0.36, 0.77]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#FF1060" emissive="#FF1060" emissiveIntensity={0.7} />
          </mesh>
        </>
      )}
      {tex && emotion === "excited" && (
        <>
          <mesh position={[-0.23, 0.36, 0.77]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1.0} />
          </mesh>
          <mesh position={[0.23, 0.36, 0.77]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1.0} />
          </mesh>
          {/* Sparkles */}
          {[[-1.1, 0.7, 0], [1.1, 0.5, 0], [0, 1.1, 0]].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1.2} />
            </mesh>
          ))}
        </>
      )}
      {tex && emotion === "sad" && (
        <>
          <mesh position={[-0.23, 0.18, 0.76]} scale={[0.55, 1.2, 0.55]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0.23, 0.18, 0.76]} scale={[0.55, 1.2, 0.55]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={0.85} />
          </mesh>
        </>
      )}

      {/* Snout */}
      <mesh position={[0, -0.08, 0.7]} scale={[0.56, 0.4, 0.34]}>
        <sphereGeometry args={[0.52, 24, 24]} />
        <meshStandardMaterial color={lightHex} roughness={0.82} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, -0.01, 0.96]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial color="#3A1020" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Mouth */}
      {emotion === "sad" ? (
        <>
          <mesh position={[-0.12, -0.22, 0.86]} rotation={[0, 0, 0.4]} scale={[0.5, 0.18, 0.3]}>
            <torusGeometry args={[0.15, 0.03, 8, 16, Math.PI * 0.7]} />
            <meshStandardMaterial color="#7B2535" />
          </mesh>
          <mesh position={[0.12, -0.22, 0.86]} rotation={[0, 0, -0.4]} scale={[0.5, 0.18, 0.3]}>
            <torusGeometry args={[0.15, 0.03, 8, 16, Math.PI * 0.7]} />
            <meshStandardMaterial color="#7B2535" />
          </mesh>
        </>
      ) : emotion === "excited" ? (
        <mesh position={[0, -0.2, 0.86]} scale={[0.7, 0.5, 0.4]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color="#FF6080" roughness={0.5} />
        </mesh>
      ) : (
        <mesh position={[0, -0.2, 0.88]} rotation={[Math.PI, 0, 0]} scale={[0.65, 0.2, 0.3]}>
          <torusGeometry args={[0.18, 0.035, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#7B2535" />
        </mesh>
      )}
    </group>
  );
}

/* ───── Cat 3D ───── */
function CatMesh({ petImage, emotion, colors }: { petImage: string | null; emotion: Emotion; colors: ColorPalette }) {
  const group = useRef<THREE.Group>(null!);
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!petImage) return;
    const loader = new THREE.TextureLoader();
    loader.load(petImage, (t) => { t.needsUpdate = true; setTex(t); });
  }, [petImage]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    const g = group.current;
    g.scale.setScalar(1);

    if (emotion === "idle") {
      g.position.y = Math.sin(t * 1.2) * 0.09;
      g.rotation.y = Math.sin(t * 0.65) * 0.14;
    } else if (emotion === "happy") {
      g.position.y = Math.abs(Math.sin(t * 3.5)) * 0.34;
      g.rotation.z = Math.sin(t * 2.8) * 0.18;
      g.scale.setScalar(1 + Math.abs(Math.sin(t * 3.5)) * 0.05);
    } else if (emotion === "excited") {
      g.position.y = Math.abs(Math.sin(t * 5)) * 0.44;
      g.rotation.y = t * 2.5;
      g.scale.setScalar(1 + Math.sin(t * 6.5) * 0.07);
    } else if (emotion === "sad") {
      g.position.y = -0.08;
      g.rotation.x = 0.18;
      g.rotation.z = Math.sin(t * 0.5) * 0.06;
    }
  });

  const { hex, darkHex } = colors;

  return (
    <group ref={group}>
      {/* Body */}
      <mesh position={[0, -0.58, 0]} scale={[0.82, 0.74, 0.74]}>
        <sphereGeometry args={[0.72, 32, 32]} />
        <meshStandardMaterial color={hex} roughness={0.82} />
      </mesh>

      {/* Paws */}
      {[[-0.34, -1.08, 0.22], [0.34, -1.08, 0.22]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} scale={[0.52, 0.25, 0.44]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color={hex} roughness={0.85} />
        </mesh>
      ))}

      {/* Left ear (pointy) */}
      <mesh position={[-0.56, 0.82, 0.08]} rotation={[0.1, 0, -0.32]} scale={[0.24, 0.55, 0.2]}>
        <coneGeometry args={[1, 2, 4, 1]} />
        <meshStandardMaterial color={darkHex} roughness={0.88} />
      </mesh>
      <mesh position={[-0.55, 0.78, 0.14]} rotation={[0.1, 0, -0.32]} scale={[0.13, 0.35, 0.1]}>
        <coneGeometry args={[1, 2, 4, 1]} />
        <meshStandardMaterial color="#FFB0C0" roughness={0.9} />
      </mesh>

      {/* Right ear (pointy) */}
      <mesh position={[0.56, 0.82, 0.08]} rotation={[0.1, 0, 0.32]} scale={[0.24, 0.55, 0.2]}>
        <coneGeometry args={[1, 2, 4, 1]} />
        <meshStandardMaterial color={darkHex} roughness={0.88} />
      </mesh>
      <mesh position={[0.55, 0.78, 0.14]} rotation={[0.1, 0, 0.32]} scale={[0.13, 0.35, 0.1]}>
        <coneGeometry args={[1, 2, 4, 1]} />
        <meshStandardMaterial color="#FFB0C0" roughness={0.9} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.74, 48, 48]} />
        <meshStandardMaterial color={hex} roughness={0.72} />
      </mesh>

      {/* Face photo */}
      {tex && (
        <mesh position={[0, 0.18, 0.71]}>
          <circleGeometry args={[0.53, 64]} />
          <meshStandardMaterial map={tex} roughness={0.45} />
        </mesh>
      )}

      {/* Default face */}
      {!tex && (
        <>
          <mesh position={[-0.25, 0.3, 0.67]} scale={[0.62, 1, 0.52]}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshStandardMaterial color="#3A7030" roughness={0.2} />
          </mesh>
          <mesh position={[0.25, 0.3, 0.67]} scale={[0.62, 1, 0.52]}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshStandardMaterial color="#3A7030" roughness={0.2} />
          </mesh>
          <mesh position={[-0.25, 0.3, 0.75]} scale={[0.22, 0.92, 0.22]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial color="#0A0808" />
          </mesh>
          <mesh position={[0.25, 0.3, 0.75]} scale={[0.22, 0.92, 0.22]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial color="#0A0808" />
          </mesh>
        </>
      )}

      {/* Emotion overlays */}
      {tex && emotion === "happy" && (
        <>
          <mesh position={[-0.21, 0.32, 0.74]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#FF1060" emissive="#FF1060" emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[0.21, 0.32, 0.74]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#FF1060" emissive="#FF1060" emissiveIntensity={0.7} />
          </mesh>
        </>
      )}
      {tex && emotion === "excited" && (
        <>
          <mesh position={[-0.21, 0.32, 0.74]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1.0} />
          </mesh>
          <mesh position={[0.21, 0.32, 0.74]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1.0} />
          </mesh>
        </>
      )}
      {tex && emotion === "sad" && (
        <>
          <mesh position={[-0.21, 0.16, 0.73]} scale={[0.55, 1.2, 0.55]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0.21, 0.16, 0.73]} scale={[0.55, 1.2, 0.55]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={0.85} />
          </mesh>
        </>
      )}

      {/* Nose */}
      <mesh position={[0, 0.0, 0.87]} scale={[1.3, 0.85, 0.6]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#C06070" roughness={0.4} />
      </mesh>

      {/* Whiskers */}
      {[[-0.8, 0.02, 0.72], [-0.78, -0.08, 0.7], [0.8, 0.02, 0.72], [0.78, -0.08, 0.7]].map(([x, y, z], i) => (
        <mesh key={i} position={[x * 0.5, y, z]} rotation={[0, 0, i < 2 ? 0.1 - i * 0.05 : -(0.1 - (i - 2) * 0.05)]}>
          <cylinderGeometry args={[0.012, 0.005, Math.abs(x), 4]} />
          <meshStandardMaterial color={colors.darkHex} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ───── Scene wrapper ───── */
function Scene({ petType, petImage, emotion, colors }: { petType: string; petImage: string | null; emotion: Emotion; colors: ColorPalette }) {
  const isCat = petType === "猫";
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[2.5, 4, 5]} intensity={1.3} castShadow />
      <pointLight position={[-3, -1, -3]} intensity={0.3} color="#FFE8D0" />
      <pointLight position={[0, 3, 2]} intensity={0.2} color="#E0F0FF" />
      <Suspense fallback={null}>
        {isCat
          ? <CatMesh petImage={petImage} emotion={emotion} colors={colors} />
          : <DogMesh petImage={petImage} emotion={emotion} colors={colors} />}
      </Suspense>
    </>
  );
}

/* ───── Main export ───── */
export default function Pet3DCharacter({ petType, petImage, emotion, size = 120 }: Props) {
  const [colors, setColors] = useState<ColorPalette>(DEFAULT_COLORS);

  useEffect(() => {
    if (petImage) extractPetColors(petImage).then(setColors);
    else setColors(DEFAULT_COLORS);
  }, [petImage]);

  return (
    <Canvas
      camera={{ position: [0, 0, 3.2], fov: 48 }}
      style={{ width: size, height: Math.round(size * 1.3), background: "transparent" }}
      gl={{ alpha: true, antialias: true }}
    >
      <Scene petType={petType} petImage={petImage} emotion={emotion} colors={colors} />
    </Canvas>
  );
}
