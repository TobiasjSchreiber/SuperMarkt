import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { networkManager } from "./NetworkManager";

interface PlayerMeshProps {
  player: {
    id: string;
    name: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    color: string;
    isFirstPerson: boolean;
    ping: number;
    holdingBoxId?: string;
  };
  isLocal: boolean;
}

export const PlayerMesh: React.FC<PlayerMeshProps> = ({ player, isLocal }) => {
  const meshRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Mesh>(null);
  const rightHandRef = useRef<THREE.Mesh>(null);
  const [holdingBox, setHoldingBox] = React.useState<any>(null);

  // Position interpolation state
  const targetPos = new THREE.Vector3(player.x, player.y, player.z);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Read raw, fast-changing server position directly to bypass React re-renders
    const room = networkManager.room;
    if (!room) return;
    const playerRaw = room.state.players.get(player.id);
    if (!playerRaw) return;

    // Sync holding state
    if (playerRaw.holdingBoxId) {
       const box = room.state.deliveryBoxes.get(playerRaw.holdingBoxId);
       if (box && (!holdingBox || holdingBox.id !== box.id)) {
         setHoldingBox({ id: box.id, productId: box.productId });
       }
    } else if (holdingBox) {
       setHoldingBox(null);
    }

    // 1. Interpolation (LERP) of position and rotation
    targetPos.set(playerRaw.x, playerRaw.y, playerRaw.z);
    
    // For local player, movement is immediately applied by input script to eliminate latency,
    // so we interpolate slightly faster. For remote players, we interpolate to smooth out network ticks.
    const lerpFactor = isLocal ? 0.35 : 0.12;
    meshRef.current.position.lerp(targetPos, lerpFactor);

    // Smooth rotation interpolation
    // Using simple angle LERP
    let diff = playerRaw.rotY - meshRef.current.rotation.y;
    // Normalize to -PI to PI to ensure shortest path rotation
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    meshRef.current.rotation.y += diff * lerpFactor;

    // 2. Animate hands to bob if moving
    const speed = isLocal ? 
      Math.sqrt(Math.pow(player.x - targetPos.x, 2) + Math.pow(player.z - targetPos.z, 2)) : 
      0.05; // just animate slightly or check position changes
      
    const t = state.clock.getElapsedTime();
    if (leftHandRef.current && rightHandRef.current) {
      // Bob hands dynamically based on speed
      const bobFreq = speed > 0.01 ? 10 : 3;
      const bobAmp = speed > 0.01 ? 0.09 : 0.02;
      leftHandRef.current.position.y = Math.sin(t * bobFreq) * bobAmp + 0.9;
      leftHandRef.current.position.z = Math.cos(t * bobFreq) * (bobAmp * 1.5);
      
      rightHandRef.current.position.y = -Math.sin(t * bobFreq) * bobAmp + 0.9;
      rightHandRef.current.position.z = -Math.cos(t * bobFreq) * (bobAmp * 1.5);
    }
  });

  // Hide body of local player in first person view so it doesn't clip the camera
  const shouldHideBody = isLocal && player.isFirstPerson;

  return (
    <group ref={meshRef}>
      {/* 3D Character geometry */}
      {!shouldHideBody && (
        <>
          <group>
            {/* Shadow indicator on floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <ringGeometry args={[0.3, 0.35, 16]} />
              <meshBasicMaterial color={player.color} opacity={0.6} transparent />
            </mesh>

            {/* Bobbing Body capsule */}
            <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
              <capsuleGeometry args={[0.25, 0.7, 8, 16]} />
              <meshStandardMaterial color={player.color} roughness={0.3} metalness={0.1} />
            </mesh>

            {/* Carrying Box Visuals */}
            {holdingBox && (
              <group position={[0, 0.85, 0.4]}>
                <mesh castShadow>
                  <boxGeometry args={[0.5, 0.3, 0.4]} />
                  <meshStandardMaterial color="#92400e" roughness={0.8} />
                </mesh>
                <Html position={[0, 0.35, 0]} center distanceFactor={4}>
                  <div style={{ fontSize: "1.2rem", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
                    📦
                  </div>
                </Html>
              </group>
            )}

            {/* Cute Face: Glasses / Visor */}
            <group position={[0, 1.25, 0.2]}>
              {/* Sunglasses / Visor box */}
              <mesh castShadow>
                <boxGeometry args={[0.36, 0.12, 0.12]} />
                <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
              </mesh>
              {/* White reflection dots */}
              <mesh position={[0.1, 0.02, 0.07]}>
                <sphereGeometry args={[0.02, 4, 4]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[-0.1, 0.02, 0.07]}>
                <sphereGeometry args={[0.02, 4, 4]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>

            {/* Cute floating hands */}
            <mesh ref={leftHandRef} position={[-0.38, 0.9, 0]} castShadow>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color={player.color} roughness={0.5} />
            </mesh>
            <mesh ref={rightHandRef} position={[0.38, 0.9, 0]} castShadow>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color={player.color} roughness={0.5} />
            </mesh>

            {/* Small modern tech backpack */}
            <mesh position={[0, 0.9, -0.22]} castShadow>
              <boxGeometry args={[0.24, 0.45, 0.12]} />
              <meshStandardMaterial color="#334155" roughness={0.6} />
            </mesh>
          </group>

          {/* Floating 2D HTML Nametag */}
          <Html
            position={[0, 1.9, 0]}
            center
            distanceFactor={6}
            style={{
              pointerEvents: "none"
            }}
          >
            <div 
              style={{
                transform: "scale(0.85)",
                background: "rgba(15, 23, 42, 0.8)",
                border: `1.5px solid ${player.color}`,
                borderRadius: "6px",
                padding: "4px 8px",
                color: "#ffffff",
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                fontSize: "12px",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {/* Avatar color bullet */}
              <span 
                style={{
                  width: "8px",
                  height: "8px",
                  background: player.color,
                  borderRadius: "50%",
                  boxShadow: `0 0 6px ${player.color}`
                }}
              />
              {player.name} {isLocal && <span style={{ color: "var(--color-primary)", fontSize: "10px" }}>(Du)</span>}
              {player.ping > 0 && <span style={{ opacity: 0.5, fontSize: "9px" }}>{player.ping}ms</span>}
            </div>
          </Html>
        </>
      )}
    </group>
  );
};
