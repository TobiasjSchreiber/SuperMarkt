import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { networkManager } from "./NetworkManager";

interface NPCMeshProps {
  npc: {
    id: string;
    name: string;
    x: number;
    z: number;
    rotY?: number;
    state: string;
    color: string;
    activeIcon: string;
    message?: string;
  };
}

export const NPCMesh: React.FC<NPCMeshProps> = ({ npc }) => {
  const meshRef = useRef<THREE.Group>(null);
  const basketRef = useRef<THREE.Mesh>(null);
  const isInitialized = useRef<boolean>(false);

  // Target position vector on floor
  const targetPos = new THREE.Vector3(npc.x, 0, npc.z);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Read raw, fast-changing server position directly to bypass React re-renders
    const room = networkManager.room;
    if (!room) return;
    const npcRaw = room.state.npcs.get(npc.id);
    if (!npcRaw) return;

    // 1. Initialize position on first frame to prevent slide-in LERP from (0,0,0)
    if (!isInitialized.current) {
      meshRef.current.position.set(npcRaw.x, 0, npcRaw.z);
      isInitialized.current = true;
    }

    // 2. Interpolate Position
    targetPos.set(npcRaw.x, 0, npcRaw.z);
    
    // NPC positions tick at 20Hz on server, so LERP factor of 0.12 keeps it smooth
    meshRef.current.position.lerp(targetPos, 0.12);

    // 2. Rotate to face target walking direction
    const movementVec = targetPos.clone().sub(meshRef.current.position);
    // Only rotate if actually moving to prevent snapping
    if (movementVec.lengthSq() > 0.005) {
      const targetAngle = Math.atan2(movementVec.x, movementVec.z);
      let diff = targetAngle - meshRef.current.rotation.y;
      
      // Normalize angle diff to -PI to PI
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      meshRef.current.rotation.y += diff * 0.15;
    } else if (npcRaw.rotY !== undefined) {
      // Standing still: Use server rotation
      let diff = npcRaw.rotY - meshRef.current.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      meshRef.current.rotation.y += diff * 0.1;
    }

    // 3. Bob shopping basket
    const t = state.clock.getElapsedTime();
    if (basketRef.current) {
      basketRef.current.position.y = Math.sin(t * 7) * 0.05 + 0.6;
      basketRef.current.position.z = 0.35 + Math.cos(t * 7) * 0.02;
    }
  });

  return (
    <group ref={meshRef} name={`npc_${npc.id}`}>
      {/* Shadow indicator on floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.22, 0.26, 8]} />
        <meshBasicMaterial color="#ffffff" opacity={0.25} transparent />
      </mesh>

      {/* Main Body Capsule */}
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.2, 0.6, 8, 12]} />
        <meshStandardMaterial color={npc.color} roughness={0.4} metalness={0.05} />
      </mesh>

      {/* Shopper Eyes */}
      <group position={[0, 1.15, 0.16]}>
        <mesh position={[-0.09, 0, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.09, 0, 0.025]}>
          <sphereGeometry args={[0.025, 4, 4]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        
        <mesh position={[0.09, 0, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.09, 0, 0.025]}>
          <sphereGeometry args={[0.025, 4, 4]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>

      {/* Floating Shopping Basket (Bobbing in front of customer) */}
      <mesh ref={basketRef} position={[0, 0.6, 0.35]} castShadow>
        <boxGeometry args={[0.26, 0.16, 0.18]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.6} />
      </mesh>
      {/* Basket handle */}
      <mesh position={[0, 0.72, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.22, 8]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>

      {/* Thought bubble HTML overlay */}
      <Html
        position={[0, 1.8, 0]}
        center
        distanceFactor={6}
        style={{
          pointerEvents: "none"
        }}
      >
        <div 
          style={{
            transform: "scale(0.8)",
            background: "rgba(15, 23, 42, 0.9)",
            border: `1.5px solid rgba(255, 255, 255, 0.15)`,
            borderRadius: "12px",
            padding: "5px 10px",
            color: "#ffffff",
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            fontSize: "11px",
            whiteSpace: "nowrap",
            boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            position: "relative"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>{npc.name}</span>
            <span 
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                padding: "2px 4px",
                fontSize: "12px"
              }}
            >
              {npc.activeIcon}
            </span>
          </div>

          {npc.message && (
            <div 
              style={{
                fontSize: "10px",
                color: "#fda4af",
                fontStyle: "italic",
                padding: "2px 0"
              }}
            >
              "{npc.message}"
            </div>
          )}

          {/* Speech bubble tail pointer */}
          <div 
            style={{
              position: "absolute",
              bottom: "-6px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "0",
              height: "0",
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid rgba(15, 23, 42, 0.9)"
            }}
          />
        </div>
      </Html>
    </group>
  );
};
