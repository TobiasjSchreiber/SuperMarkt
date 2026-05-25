import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { networkManager } from "./NetworkManager";
import { getSideLabelTexture, getTopLabelTexture } from "./SupermarketGrid";

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

const products = [
  { id: "bread", icon: "🍞" },
  { id: "cereal", icon: "🥣" },
  { id: "pasta", icon: "🍝" },
  { id: "apple", icon: "🍎" },
  { id: "banana", icon: "🍌" },
  { id: "tomato", icon: "🍅" },
  { id: "pizza", icon: "🍕" },
  { id: "icecream", icon: "🍦" },
  { id: "frozen_veggies", icon: "🥦" },
  { id: "ak47", icon: "🔫" },
];

export const PlayerMesh: React.FC<PlayerMeshProps> = ({ player, isLocal }) => {
  const meshRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Mesh>(null);
  const rightHandRef = useRef<THREE.Mesh>(null);
  const [holdingBox, setHoldingBox] = useState<any>(null);
  const [holdingAK47, setHoldingAK47] = useState(false);

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

    // Sync AK-47 holding state
    if (playerRaw.holdingAK47 !== holdingAK47) {
      setHoldingAK47(playerRaw.holdingAK47);
    }

    // 1. Interpolation (LERP) of position and rotation
    targetPos.set(playerRaw.x, playerRaw.y, playerRaw.z);
    
    const lerpFactor = isLocal ? 0.35 : 0.12;
    meshRef.current.position.lerp(targetPos, lerpFactor);

    // Smooth rotation
    let diff = playerRaw.rotY - meshRef.current.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    meshRef.current.rotation.y += diff * lerpFactor;

    // 2. Animate hands
    const speed = isLocal ? 
      Math.sqrt(Math.pow(player.x - targetPos.x, 2) + Math.pow(player.z - targetPos.z, 2)) : 
      0.05;
      
    const t = state.clock.getElapsedTime();
    if (leftHandRef.current && rightHandRef.current) {
      const bobFreq = speed > 0.01 ? 10 : 3;
      const bobAmp = speed > 0.01 ? 0.09 : 0.02;
      leftHandRef.current.position.y = Math.sin(t * bobFreq) * bobAmp + 0.9;
      leftHandRef.current.position.z = Math.cos(t * bobFreq) * (bobAmp * 1.5);
      
      rightHandRef.current.position.y = -Math.sin(t * bobFreq) * bobAmp + 0.9;
      rightHandRef.current.position.z = -Math.cos(t * bobFreq) * (bobAmp * 1.5);
    }
  });

  const shouldHideBody = isLocal && player.isFirstPerson;

  return (
    <group ref={meshRef}>
      {/* 1. Character Body (hidden for local player in FP) */}
      {!shouldHideBody && (
        <>
          {/* Shadow */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.3, 0.35, 16]} />
            <meshBasicMaterial color={player.color} opacity={0.6} transparent />
          </mesh>

          {/* Body */}
          <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
            <capsuleGeometry args={[0.25, 0.7, 8, 16]} />
            <meshStandardMaterial color={player.color} roughness={0.3} metalness={0.1} />
          </mesh>

          {/* Face */}
          <group position={[0, 1.25, 0.2]}>
            <mesh castShadow>
              <boxGeometry args={[0.36, 0.12, 0.12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
            </mesh>
            <mesh position={[0.1, 0.02, 0.07]}>
              <sphereGeometry args={[0.02, 4, 4]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-0.1, 0.02, 0.07]}>
              <sphereGeometry args={[0.02, 4, 4]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>

          {/* Hands */}
          <mesh ref={leftHandRef} position={[-0.38, 0.9, 0]} castShadow>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={player.color} roughness={0.5} />
          </mesh>
          <mesh ref={rightHandRef} position={[0.38, 0.9, 0]} castShadow>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={player.color} roughness={0.5} />
          </mesh>

          {/* Backpack */}
          <mesh position={[0, 0.9, -0.22]} castShadow>
            <boxGeometry args={[0.24, 0.45, 0.12]} />
            <meshStandardMaterial color="#334155" roughness={0.6} />
          </mesh>

          {/* Nametag */}
          <Html position={[0, 1.9, 0]} center distanceFactor={6}>
            <div style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: `1.5px solid ${player.color}`,
                borderRadius: "6px",
                padding: "4px 8px",
                color: "#ffffff",
                fontFamily: "sans-serif",
                fontWeight: 600,
                fontSize: "12px",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
              <span style={{ width: "8px", height: "8px", background: player.color, borderRadius: "50%" }} />
              {player.name} {isLocal && <span style={{ color: "#14b8a6", fontSize: "10px" }}>(Du)</span>}
            </div>
          </Html>
        </>
      )}

      {/* 2. Carrying Box (Always shown if existing) */}
      {holdingBox && (
        <group position={isLocal && player.isFirstPerson ? [0, 1.1, 0.5] : [0, 0.85, 0.4]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.3, 0.4]} />
            <meshStandardMaterial color="#92400e" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.151, 0]}>
            <boxGeometry args={[0.08, 0.01, 0.41]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
          <mesh position={[0.251, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.25, 0.18]} />
            <meshStandardMaterial map={getSideLabelTexture(products.find(p => p.id === holdingBox.productId), 0, holdingBox.id || "BOX")} roughness={0.9} />
          </mesh>
          <mesh position={[0.13, 0.151, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.18, 0.14]} />
            <meshStandardMaterial map={getTopLabelTexture(products.find(p => p.id === holdingBox.productId))} roughness={0.9} />
          </mesh>
        </group>
      )}

      {/* 3. AK-47 Weapon (Always shown if holding) */}
      {holdingAK47 && (
        <group position={isLocal && player.isFirstPerson ? [0.3, 1.0, 0.6] : [0.25, 0.75, 0.3]} rotation={[0, 0, 0]}>
          {/* Stock (brown wood) */}
          <mesh position={[-0.15, 0, -0.2]} castShadow>
            <boxGeometry args={[0.06, 0.08, 0.25]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {/* Receiver body (dark metal) */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.06, 0.1, 0.5]} />
            <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Barrel (long dark cylinder) */}
          <mesh position={[0, 0.02, 0.38]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.25, 8]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.9} />
          </mesh>
          {/* Magazine (curved box) */}
          <mesh position={[0, -0.12, 0.05]} rotation={[0.15, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 0.16, 0.08]} />
            <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.7} />
          </mesh>
          {/* Grip */}
          <mesh position={[0, -0.1, -0.08]} rotation={[0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 0.12, 0.05]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          {/* Front sight */}
          <mesh position={[0, 0.07, 0.35]} castShadow>
            <boxGeometry args={[0.02, 0.04, 0.02]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
};
