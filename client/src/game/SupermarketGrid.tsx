import React, { useState, useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { networkManager } from "./NetworkManager";

// --- Sub-components for Mesh Graphics ---

const products = [
  { id: "bread", name: "Brot", category: "shelf_groceries", price: 2, sellPrice: 5, icon: "🍞", color: "#fcd34d" },
  { id: "cereal", name: "Müsli", category: "shelf_groceries", price: 4, sellPrice: 10, icon: "🥣", color: "#fbbf24" },
  { id: "pasta", name: "Pasta", category: "shelf_groceries", price: 3, sellPrice: 8, icon: "🍝", color: "#fde68a" },
  { id: "apple", name: "Äpfel", category: "shelf_produce", price: 1, sellPrice: 3, icon: "🍎", color: "#ef4444" },
  { id: "banana", name: "Bananen", category: "shelf_produce", price: 2, sellPrice: 5, icon: "🍌", color: "#facc15" },
  { id: "tomato", name: "Tomaten", category: "shelf_produce", price: 2, sellPrice: 4, icon: "🍅", color: "#f87171" },
  { id: "pizza", name: "Tiefkühlpizza", category: "shelf_frozen", price: 5, sellPrice: 12, icon: "🍕", color: "#fb923c" },
  { id: "icecream", name: "Eiscreme", category: "shelf_frozen", price: 6, sellPrice: 15, icon: "🍦", color: "#60a5fa" },
  { id: "frozen_veggies", name: "TK-Gemüse", category: "shelf_frozen", price: 4, sellPrice: 9, icon: "🥦", color: "#4ade80" },
];

const ProductMesh: React.FC<{ productId: string, color: string }> = ({ productId, color }) => {
  if (productId === "bread") return (
    <group>
      <mesh castShadow><boxGeometry args={[0.16, 0.08, 0.1]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.04, 0]}><sphereGeometry args={[0.08, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  );
  if (productId === "cereal") return (
    <group>
      <mesh castShadow><boxGeometry args={[0.14, 0.22, 0.06]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0, 0.031]}><planeGeometry args={[0.12, 0.18]} /><meshStandardMaterial color="#fff" emissive={color} emissiveIntensity={0.2} /></mesh>
    </group>
  );
  if (productId === "pasta") return (
    <group>
      <mesh castShadow><cylinderGeometry args={[0.06, 0.06, 0.18, 8]} /><meshStandardMaterial color={color} transparent opacity={0.6} /></mesh>
      <mesh><cylinderGeometry args={[0.04, 0.04, 0.16, 6]} /><meshStandardMaterial color="#fef3c7" /></mesh>
    </group>
  );
  if (productId === "apple") return (
    <group>
      <mesh castShadow><sphereGeometry args={[0.075, 12, 12]} /><meshStandardMaterial color={color} roughness={0.3} /></mesh>
      <mesh position={[0, 0.07, 0]}><boxGeometry args={[0.01, 0.04, 0.01]} /><meshStandardMaterial color="#451a03" /></mesh>
    </group>
  );
  if (productId === "banana") return (
    <group rotation={[0.5, 0, 0.3]}>
      <mesh castShadow><cylinderGeometry args={[0.02, 0.02, 0.2, 6]} rotation={[0, 0, Math.PI / 2]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.04, 0.02]}><cylinderGeometry args={[0.02, 0.02, 0.18, 6]} rotation={[0, 0, Math.PI / 2]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  );
  if (productId === "tomato") return (
    <group>
      <mesh castShadow><sphereGeometry args={[0.075, 12, 12]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.03, 0, 0.015, 5]} /><meshStandardMaterial color="#16a34a" /></mesh>
    </group>
  );
  if (productId === "pizza") return (
    <group>
      <mesh castShadow><boxGeometry args={[0.3, 0.04, 0.3]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.021, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.12, 16]} /><meshStandardMaterial color="#fcd34d" /></mesh>
    </group>
  );
  if (productId === "icecream") return (
    <group>
      <mesh castShadow><cylinderGeometry args={[0.1, 0.08, 0.15, 12]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.08, 0]}><sphereGeometry args={[0.1, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#fff" /></mesh>
    </group>
  );
  if (productId === "frozen_veggies") return (
    <group>
      <mesh castShadow><boxGeometry args={[0.25, 0.12, 0.2]} /><meshStandardMaterial color={color} roughness={1} metalness={0} /></mesh>
      <mesh position={[0, 0, 0.101]}><planeGeometry args={[0.15, 0.08]} /><meshStandardMaterial color="#ffffff" opacity={0.5} transparent /></mesh>
    </group>
  );
  return <mesh castShadow><boxGeometry args={[0.1, 0.1, 0.1]} /><meshStandardMaterial color={color} /></mesh>;
};

export const ShelfGroceries: React.FC<{ stock?: number; maxStock?: number; productId?: string }> = ({ stock = 0, productId }) => {
  const product = products.find(p => p.id === productId);
  const color = product?.color || "#94a3b8";

  return (
    <group>
      {/* Metal Frame Backing */}
      <mesh position={[0, 1.0, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 2.0, 0.05]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
      </mesh>
      
      {/* Side Supports */}
      <mesh position={[-0.43, 1.0, 0]} castShadow>
        <boxGeometry args={[0.04, 2.0, 0.45]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0.43, 1.0, 0]} castShadow>
        <boxGeometry args={[0.04, 2.0, 0.45]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Multiple Shelf Layers */}
      {[0.4, 0.8, 1.2, 1.6].map((y, idx) => (
        <group key={idx} position={[0, y, 0.05]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.82, 0.04, 0.38]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.4} />
          </mesh>
          {/* Price Tag Strip */}
          <mesh position={[0, -0.01, 0.195]}>
            <boxGeometry args={[0.82, 0.05, 0.01]} />
            <meshStandardMaterial color="#14b8a6" emissive="#14b8a6" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}

      {/* Top Signage */}
      <mesh position={[0, 2.05, 0.05]}>
        <boxGeometry args={[0.85, 0.15, 0.05]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0, 2.05, 0.08]}>
        <planeGeometry args={[0.7, 0.1]} />
        <meshStandardMaterial color="#ffffff" emissive="#14b8a6" emissiveIntensity={0.5} transparent opacity={0.9} />
      </mesh>

      {/* Groceries Stock (Visual indication) */}
      {stock > 0 && productId && (
        <group position={[0, 0, 0.12]}>
          {Array.from({ length: Math.min(stock, 12) }).map((_, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const yPos = [0.45, 0.85, 1.25, 1.65][row] || 0.45;
            return (
              <group key={i} position={[col * 0.24 - 0.24, yPos, 0]}>
                <ProductMesh productId={productId} color={color} />
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
};

export const ShelfProduce: React.FC<{ stock?: number; productId?: string }> = ({ stock = 0, productId }) => {
  const product = products.find(p => p.id === productId);
  const color = product?.color || "#16a34a";

  return (
    <group>
      {/* Main Wooden Stand */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.6, 0.9]} />
        <meshStandardMaterial color="#451a03" roughness={1.0} />
      </mesh>
      
      {/* Decorative side panels */}
      <mesh position={[-0.48, 0.4, 0]}>
        <boxGeometry args={[0.02, 0.8, 0.92]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      <mesh position={[0.48, 0.4, 0]}>
        <boxGeometry args={[0.02, 0.8, 0.92]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>

      {/* Two-tier slanted display */}
      {[
        { y: 0.55, z: 0.2, rot: -0.4 },
        { y: 0.85, z: -0.2, rot: -0.4 }
      ].map((tier, idx) => (
        <group key={idx} position={[0, tier.y, tier.z]} rotation={[tier.rot, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.88, 0.1, 0.5]} />
            <meshStandardMaterial color="#92400e" />
          </mesh>
          {/* Front lip to hold produce */}
          <mesh position={[0, 0.05, 0.25]}>
            <boxGeometry args={[0.88, 0.12, 0.02]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        </group>
      ))}

      {/* Produce Stock */}
      {stock > 0 && productId && (
        <group>
          {Array.from({ length: Math.min(stock, 10) }).map((_, i) => {
            const isTopTier = i >= 5;
            const tierIdx = i % 5;
            const yPos = isTopTier ? 0.95 : 0.65;
            const zPos = isTopTier ? -0.2 : 0.25;
            return (
              <group key={i} position={[tierIdx * 0.16 - 0.32, yPos, zPos]}>
                <ProductMesh productId={productId} color={color} />
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
};

export const ShelfFrozen: React.FC<{ stock?: number; productId?: string }> = ({ stock = 0, productId }) => {
  const product = products.find(p => p.id === productId);
  const color = product?.color || "#bae6fd";

  return (
    <group>
      {/* --- Freezer Body (Hollow Construction) --- */}
      {/* Bottom Panel */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[0.95, 0.1, 0.95]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.1} metalness={0.2} />
      </mesh>
      {/* Front Wall */}
      <mesh position={[0, 0.45, 0.45]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.9, 0.05]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.1} metalness={0.2} />
      </mesh>
      {/* Back Wall */}
      <mesh position={[0, 0.45, -0.45]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.9, 0.05]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.1} metalness={0.2} />
      </mesh>
      {/* Left Wall */}
      <mesh position={[-0.45, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.9, 0.85]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.1} metalness={0.2} />
      </mesh>
      {/* Right Wall */}
      <mesh position={[0.45, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.9, 0.85]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.1} metalness={0.2} />
      </mesh>
      
      {/* Interior Floor (slightly raised to hide bottom panel) */}
      <mesh position={[0, 0.11, 0]} receiveShadow>
        <boxGeometry args={[0.85, 0.02, 0.85]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Glowing bottom trim */}
      <mesh position={[0, 0.05, 0.47]}>
        <boxGeometry args={[0.97, 0.08, 0.02]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.8} />
      </mesh>

      {/* Top glass sliding lids & Frame */}
      <group position={[0, 0.9, 0]}>
        {/* Hollow Frame Border */}
        <mesh position={[0, 0, 0.425]}><boxGeometry args={[0.9, 0.05, 0.1]} /><meshStandardMaterial color="#cbd5e1" metalness={0.8} /></mesh>
        <mesh position={[0, 0, -0.425]}><boxGeometry args={[0.9, 0.05, 0.1]} /><meshStandardMaterial color="#cbd5e1" metalness={0.8} /></mesh>
        <mesh position={[0.425, 0, 0]}><boxGeometry args={[0.05, 0.05, 0.9]} /><meshStandardMaterial color="#cbd5e1" metalness={0.8} /></mesh>
        <mesh position={[-0.425, 0, 0]}><boxGeometry args={[0.05, 0.05, 0.9]} /><meshStandardMaterial color="#cbd5e1" metalness={0.8} /></mesh>

        {/* Glass windows */}
        <mesh position={[-0.2, 0.01, 0]}>
          <boxGeometry args={[0.35, 0.01, 0.75]} />
          <meshStandardMaterial color="#bae6fd" transparent opacity={0.3} metalness={0.9} roughness={0} />
        </mesh>
        <mesh position={[0.2, 0.01, 0.1]}>
          <boxGeometry args={[0.35, 0.01, 0.75]} />
          <meshStandardMaterial color="#bae6fd" transparent opacity={0.3} metalness={0.9} roughness={0} />
        </mesh>
      </group>

      {/* Frozen items (ice cream packs / pizza boxes) */}
      {stock > 0 && productId && (
        <group position={[0, 0.2, 0]}>
          {Array.from({ length: Math.min(stock, 8) }).map((_, i) => (
            <group key={i} position={[(i % 2) * 0.3 - 0.15, Math.floor(i / 4) * 0.2, (Math.floor(i / 2) % 2) * 0.3 - 0.15]}>
              <ProductMesh productId={productId} color={color} />
            </group>
          ))}
        </group>
      )}

      {/* Interior light (Cold glow) */}
      <pointLight position={[0, 0.7, 0]} color="#bae6fd" intensity={0.5} distance={1.5} />
    </group>
  );
};


// Cash Register Mesh
export const CashRegister: React.FC = () => (
  <group>
    {/* Checkout desk counter */}
    <mesh position={[-0.15, 0.45, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.5, 0.9, 1.0]} />
      <meshStandardMaterial color="#1e293b" roughness={0.4} />
    </mesh>
    {/* Conveyor belt */}
    <mesh position={[0.15, 0.42, 0]} castShadow>
      <boxGeometry args={[0.1, 0.84, 0.94]} />
      <meshStandardMaterial color="#0f172a" roughness={0.9} />
    </mesh>
    {/* Small cash machine scanner / screen block */}
    <group position={[-0.18, 1.05, 0.1]} rotation={[0, -0.4, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.22, 0.25, 0.22]} />
        <meshStandardMaterial color="#334155" metalness={0.6} />
      </mesh>
      {/* Scanner Screen glowing */}
      <mesh position={[0, 0.04, 0.12]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.16, 0.12, 0.02]} />
        <meshStandardMaterial color="#000000" emissive="#14b8a6" emissiveIntensity={0.8} />
      </mesh>
    </group>
    {/* Scanner glass window */}
    <mesh position={[-0.1, 0.91, -0.2]}>
      <boxGeometry args={[0.15, 0.01, 0.15]} />
      <meshStandardMaterial color="#22d3ee" transparent opacity={0.6} emissive="#22d3ee" emissiveIntensity={0.3} />
    </mesh>
  </group>
);

// PC Terminal Mesh (Modern Desktop)
export const PCTerminal: React.FC = () => (
  <group>
    {/* Desk / Table */}
    <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.0, 0.7, 0.7]} />
      <meshStandardMaterial color="#1e293b" metalness={0.5} />
    </mesh>
    {/* PC Case on floor */}
    <mesh position={[0.3, 0.2, 0.1]} castShadow>
      <boxGeometry args={[0.2, 0.4, 0.5]} />
      <meshStandardMaterial color="#0f172a" emissive="#14b8a6" emissiveIntensity={0.2} />
    </mesh>
    {/* Monitor Stand */}
    <mesh position={[0, 0.75, -0.1]} castShadow>
      <boxGeometry args={[0.1, 0.15, 0.1]} />
      <meshStandardMaterial color="#475569" />
    </mesh>
    {/* Monitor Screen */}
    <group position={[0, 1.05, -0.1]} rotation={[-0.1, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.5, 0.05]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </mesh>
      {/* Glowing Screen Face */}
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.75, 0.45]} />
        <meshStandardMaterial color="#000000" emissive="#14b8a6" emissiveIntensity={0.6} />
      </mesh>
    </group>
    {/* Keyboard on desk */}
    <mesh position={[0, 0.71, 0.15]}>
      <boxGeometry args={[0.5, 0.02, 0.2]} />
      <meshStandardMaterial color="#0f172a" />
    </mesh>
  </group>
);

// Delivery Box Mesh
export const DeliveryBoxMesh: React.FC<{ box: any }> = ({ box }) => {
  const product = products.find(p => p.id === box.productId);
  
  return (
    <group position={[box.x, 0.15, box.z]} name={`delivery_box_${box.id}`}>
      {/* Box Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.3, 0.4]} />
        <meshStandardMaterial color="#92400e" roughness={0.8} />
      </mesh>
      {/* Tape */}
      <mesh position={[0, 0.151, 0]}>
        <boxGeometry args={[0.08, 0.01, 0.41]} />
        <meshStandardMaterial color="#451a03" />
      </mesh>
      {/* Label */}
      <mesh position={[0.251, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.2, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Floating Product Icon */}
      <Html position={[0, 0.4, 0]} center distanceFactor={4}>
        <div style={{ fontSize: "1.2rem", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
          {product?.icon}
        </div>
      </Html>
    </group>
  );
};

// Employee Mesh Component
export const EmployeeMesh: React.FC<{ emp: any }> = ({ emp }) => {
  const meshRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Mesh>(null);
  const rightHandRef = useRef<THREE.Mesh>(null);
  const isInitialized = useRef<boolean>(false);

  // Target position vector on floor
  const targetPos = new THREE.Vector3(emp.x, 0, emp.z);
  
  useFrame((state) => {
    if (!meshRef.current) return;

    if (!isInitialized.current) {
      meshRef.current.position.set(emp.x, 0, emp.z);
      isInitialized.current = true;
    }

    targetPos.set(emp.x, 0, emp.z);
    meshRef.current.position.lerp(targetPos, 0.12);

    const movementVec = targetPos.clone().sub(meshRef.current.position);
    if (movementVec.lengthSq() > 0.005) {
      const targetAngle = Math.atan2(movementVec.x, movementVec.z);
      let diff = targetAngle - meshRef.current.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      meshRef.current.rotation.y += diff * 0.15;
    } else {
      // Standing still: Use server rotation if provided
      let diff = (emp.rotY || 0) - meshRef.current.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      meshRef.current.rotation.y += diff * 0.1;
    }

    const t = state.clock.getElapsedTime();
    if (leftHandRef.current && rightHandRef.current) {
      const isMoving = movementVec.lengthSq() > 0.001;
      const bobFreq = isMoving ? 10 : 3;
      const bobAmp = isMoving ? 0.08 : 0.02;
      
      leftHandRef.current.position.y = Math.sin(t * bobFreq) * bobAmp + 0.9;
      leftHandRef.current.position.z = Math.cos(t * bobFreq) * (bobAmp * 1.5);
      
      rightHandRef.current.position.y = -Math.sin(t * bobFreq) * bobAmp + 0.9;
      rightHandRef.current.position.z = -Math.cos(t * bobFreq) * (bobAmp * 1.5);
    }
  });

  return (
    <group ref={meshRef}>
      {/* Shadow indicator on floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.22, 0.26, 8]} />
        <meshBasicMaterial color={emp.color || "#10b981"} opacity={0.3} transparent />
      </mesh>

      {/* Unified Body capsule (Matches Player/NPC) */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.25, 0.7, 8, 16]} />
        <meshStandardMaterial color={emp.color || "#10b981"} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Employee uniform/vest */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.3, 0.5, 0.28]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>

      {/* Visor / Glasses (Matches Player style) */}
      <group position={[0, 1.25, 0.2]}>
        <mesh castShadow>
          <boxGeometry args={[0.36, 0.12, 0.12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Reflection dots */}
        <mesh position={[0.1, 0.02, 0.07]}>
          <sphereGeometry args={[0.02, 4, 4]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.1, 0.02, 0.07]}>
          <sphereGeometry args={[0.02, 4, 4]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Staff Cap */}
      <group position={[0, 1.48, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.2, 0.22, 0.08, 12]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, -0.02, 0.12]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.28, 0.02, 0.15]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>

      {/* Cute floating hands */}
      <mesh ref={leftHandRef} position={[-0.38, 0.9, 0]} castShadow>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color={emp.color || "#10b981"} roughness={0.5} />
      </mesh>
      <mesh ref={rightHandRef} position={[0.38, 0.9, 0]} castShadow>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color={emp.color || "#10b981"} roughness={0.5} />
      </mesh>
      
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
            transform: "scale(0.8)",
            background: "rgba(16, 185, 129, 0.9)", 
            border: `1.5px solid rgba(255, 255, 255, 0.3)`,
            borderRadius: "6px",
            padding: "3px 8px",
            color: "#ffffff",
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            fontSize: "11px",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <span style={{ fontSize: "10px" }}>👔</span>
          {emp.name || "Mitarbeiter"}
          {emp.task !== "none" && (
            <span style={{ opacity: 0.8, fontSize: "9px", background: "rgba(0,0,0,0.2)", padding: "1px 4px", borderRadius: "3px" }}>
              {emp.task === "register" ? "Kasse" : "Auffüllen"}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
};

const WindowWall: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; length: number; neonColor?: string }> = ({
  position,
  rotation,
  length,
  neonColor = "#14b8a6"
}) => (
  <group position={position} rotation={rotation}>
    {/* Lower wall section */}
    <mesh position={[length / 2, 0.5, 0]} castShadow receiveShadow>
      <boxGeometry args={[length, 1, 0.2]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    {/* Upper wall section */}
    <mesh position={[length / 2, 2.5, 0]} castShadow receiveShadow>
      <boxGeometry args={[length, 1, 0.2]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    {/* Neon Strip between wall and glass (top) */}
    <mesh position={[length / 2, 2.01, 0]}>
      <boxGeometry args={[length, 0.04, 0.22]} />
      <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={0.8} />
    </mesh>
    {/* Neon Strip between wall and glass (bottom) */}
    <mesh position={[length / 2, 0.99, 0]}>
      <boxGeometry args={[length, 0.04, 0.22]} />
      <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={0.8} />
    </mesh>
    {/* Glass window */}
    <mesh position={[length / 2, 1.5, 0]}>
      <boxGeometry args={[length - 0.2, 1, 0.05]} />
      <meshStandardMaterial color="#bae6fd" transparent opacity={0.3} metalness={0.9} roughness={0.1} />
    </mesh>
    {/* Vertical window frames */}
    <mesh position={[0.05, 1.5, 0]}>
      <boxGeometry args={[0.1, 1, 0.22]} />
      <meshStandardMaterial color="#0f172a" />
    </mesh>
    <mesh position={[length - 0.05, 1.5, 0]}>
      <boxGeometry args={[0.1, 1, 0.22]} />
      <meshStandardMaterial color="#0f172a" />
    </mesh>
  </group>
);

const StoreWalls: React.FC = () => (
  <group>
    {/* Back Wall (solid) */}
    <mesh position={[0, 1.5, -10]} castShadow receiveShadow>
      <boxGeometry args={[20, 3, 0.2]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    
    {/* Neon border for back wall */}
    <mesh position={[0, 2.9, -9.89]}>
      <boxGeometry args={[20, 0.05, 0.02]} />
      <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={1.0} />
    </mesh>

    {/* Side Walls (with windows) */}
    {/* Left Wall - Rotated 90 deg, positioned at -10 X */}
    <WindowWall position={[-10, 0, 10]} rotation={[0, Math.PI / 2, 0]} length={20} neonColor="#14b8a6" />
    {/* Right Wall - Rotated -90 deg, positioned at 10 X */}
    <WindowWall position={[10, 0, -10]} rotation={[0, -Math.PI / 2, 0]} length={20} neonColor="#8b5cf6" />
    
    {/* Front Wall with Entrance (Z = 10) */}
    <group position={[0, 0, 10]}>
      {/* Left part of entrance */}
      <mesh position={[-6.5, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[7, 3, 0.2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Right part of entrance */}
      <mesh position={[6.5, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[7, 3, 0.2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Glass above door */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[6, 1, 0.2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Neon Arch for entrance */}
      <mesh position={[0, 2.01, 0.11]}>
        <boxGeometry args={[6, 0.05, 0.05]} />
        <meshStandardMaterial color="#14b8a6" emissive="#14b8a6" emissiveIntensity={1.2} />
      </mesh>
    </group>
  </group>
);

// --- Main Grid Interaction Logic ---

interface SupermarketGridProps {
  isFirstPerson: boolean;
  placedItems: Map<string, any>;
  npcs: Map<string, any>;
  deliveryBoxes: Map<string, any>;
  employees: Map<string, any>;
  selectedCatalogItem: string | null;
  onSelectCatalogItem?: (type: string | null) => void;
  onSelectPlacedId: (id: string | null) => void;
  onTargetedShelfChange?: (
    id: string | null,
    stock?: number,
    maxStock?: number,
    cost?: number,
    label?: string
  ) => void;
  isMovingItem?: boolean;
  activePlacedItem?: any;
  onMoveComplete?: () => void;
}

export const SupermarketGrid: React.FC<SupermarketGridProps> = ({
  isFirstPerson,
  placedItems,
  npcs = new Map(),
  deliveryBoxes = new Map(),
  employees = new Map(),
  selectedCatalogItem,
  onSelectCatalogItem,
  onSelectPlacedId,
  onTargetedShelfChange,
  isMovingItem,
  activePlacedItem,
  onMoveComplete,
}) => {
  const { raycaster, mouse, camera, scene } = useThree();
  const [hoveredCell, setHoveredCell] = useState<{ x: number; z: number } | null>(null);
  const [placementRotation, setPlacementRotation] = useState<number>(0);
  const [isCellOccupied, setIsCellOccupied] = useState<boolean>(false);

  // Track the currently targeted shelf or grid cell for first-person restocking/building
  const lastTargetedId = useRef<string | null>(null);
  const lastTargetedNpcId = useRef<string | null>(null);
  const lastTargetedBoxId = useRef<string | null>(null);
  const fpPlacementCell = useRef<{ x: number; z: number } | null>(null);
  const fpIsCellOccupied = useRef<boolean>(false);

  // Setup click triggers on R button to rotate items during placement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && (selectedCatalogItem || isMovingItem)) {
        setPlacementRotation((prev) => (prev + 1) % 4);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCatalogItem, isMovingItem]);

  // Keyboard listener for first-person interactions (refilling shelves or building on [E])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && isFirstPerson) {
        // Handle Refilling / Payment / PC Activation / Picking up boxes
        const targetId = lastTargetedId.current;
        const boxId = lastTargetedBoxId.current;
        const npcId = lastTargetedNpcId.current;

        if (boxId) {
          networkManager.sendPickUpBox(boxId);
        } else if (targetId) {
          const shelf = placedItems.get(targetId);
          if (shelf) {
            if (shelf.type.startsWith("shelf_") && shelf.stock < shelf.maxStock) {
              networkManager.sendRefillItem(targetId);
            } else if (shelf.type === "pc_terminal" || shelf.type.startsWith("shelf_")) {
              onSelectPlacedId(targetId);
            }
          }
        } else if (npcId) {
          networkManager.sendProcessPayment(npcId);
        } else if (selectedCatalogItem && fpPlacementCell.current && !fpIsCellOccupied.current) {
          // Handle Building in First Person
          networkManager.sendPlaceItem(
            selectedCatalogItem,
            fpPlacementCell.current.x,
            fpPlacementCell.current.z,
            placementRotation
          );
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFirstPerson, placedItems, npcs, selectedCatalogItem, placementRotation]);

  // Compute grid hover position or first-person look targets
  useFrame(() => {
    if (isFirstPerson) {
      // ... (existing first person logic) ...
      // 1. Raycast from camera center (crosshair) to check what player is looking at
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

      // Check for items/npcs/boxes
      const itemsList: THREE.Object3D[] = [];
      scene.traverse((obj) => {
        if (obj.name && (obj.name.startsWith("placed_item_") || obj.name.startsWith("npc_") || obj.name.startsWith("delivery_box_"))) {
          itemsList.push(obj);
        }
      });

      const intersects = raycaster.intersectObjects(itemsList, true);
      let foundId: string | null = null;
      let foundNpcId: string | null = null;
      let foundBoxId: string | null = null;
      let stock = 0;
      let maxStock = 0;
      let cost = 0;
      let label = "";

      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object;
        const hitDistance = intersects[0].distance;

        // Find ancestor group that represents the placed item, NPC, or Box
        while (current && !current.name.startsWith("placed_item_") && !current.name.startsWith("npc_") && !current.name.startsWith("delivery_box_")) {
          current = current.parent;
        }

        if (current && hitDistance < 3.0) {
          if (current.name.startsWith("placed_item_")) {
            const itemId = current.name.replace("placed_item_", "");
            const shelf = placedItems.get(itemId);
            if (shelf && shelf.type.startsWith("shelf_")) {
              foundId = itemId;
              stock = shelf.stock;
              maxStock = shelf.maxStock;

              const missing = maxStock - stock;
              let unitCost = 0;
              if (shelf.type === "shelf_groceries") {
                unitCost = 8;
                label = "Lebensmittelregal";
              } else if (shelf.type === "shelf_produce") {
                unitCost = 12;
                label = "Frischetheke";
              } else if (shelf.type === "shelf_frozen") {
                unitCost = 20;
                label = "Tiefkühltruhe";
              }
              cost = missing * unitCost;
            } else if (shelf && shelf.type === "cash_register") {
              foundId = itemId;
              label = "Kasse";

              // Find first NPC waiting at this specific register
              const waitingNpc = Array.from(npcs.values()).find(npc => 
                npc.state === "waiting_to_pay" && (
                  (Math.abs(npc.targetX - (shelf.gridX + 0.8)) < 1.0 && Math.abs(npc.targetZ - shelf.gridZ) < 1.0) ||
                  (Math.abs(npc.x - (shelf.gridX + 0.8)) < 1.0 && Math.abs(npc.z - shelf.gridZ) < 1.0)
                )
              );
              
              if (waitingNpc) {
                foundNpcId = waitingNpc.id;
                label = "Kasse (Kunde wartet!)";
              }
            } else if (shelf && shelf.type === "pc_terminal") {
              foundId = itemId;
              label = "Management-PC";
            }
          } else if (current.name.startsWith("npc_")) {
            const npcId = current.name.replace("npc_", "");
            const npc = npcs.get(npcId);
            if (npc && npc.state === "waiting_to_pay") {
              foundNpcId = npcId;
              label = `Kunde: ${npc.name}`;
            }
          } else if (current.name.startsWith("delivery_box_")) {
            const boxId = current.name.replace("delivery_box_", "");
            const box = deliveryBoxes.get(boxId);
            if (box) {
              const product = products.find(p => p.id === box.productId);
              foundBoxId = boxId;
              label = `Kiste öffnen: ${box.amount}x ${product?.name || box.productId} [E]`;
            }
          }
        }
      }

      // Check for floor (for placement in first person)
      if (selectedCatalogItem) {
        const floorIntersects = raycaster.intersectObjects(scene.children, true);
        const floorHit = floorIntersects.find((hit) => hit.object.name === "shop_floor");
        if (floorHit && floorHit.distance < 5.0) {
          const clampedX = Math.round(floorHit.point.x);
          const clampedZ = Math.round(floorHit.point.z);
          
          if (!fpPlacementCell.current || fpPlacementCell.current.x !== clampedX || fpPlacementCell.current.z !== clampedZ) {
            fpPlacementCell.current = { x: clampedX, z: clampedZ };
            setHoveredCell({ x: clampedX, z: clampedZ }); // Use state to trigger re-render of preview

            let occupied = false;
            placedItems.forEach((item: any) => {
              if (item.gridX === clampedX && item.gridZ === clampedZ) {
                occupied = true;
              }
            });
            fpIsCellOccupied.current = occupied;
            setIsCellOccupied(occupied);
          }
        } else {
          fpPlacementCell.current = null;
          if (hoveredCell) setHoveredCell(null);
        }
      } else {
        if (hoveredCell) setHoveredCell(null);
      }

      if (foundId !== lastTargetedId.current || foundNpcId !== lastTargetedNpcId.current || foundBoxId !== lastTargetedBoxId.current) {
        lastTargetedId.current = foundId;
        lastTargetedNpcId.current = foundNpcId;
        lastTargetedBoxId.current = foundBoxId;
        if (onTargetedShelfChange) {
          onTargetedShelfChange(foundId || foundBoxId, stock, maxStock, cost, label);
        }
      }
    } 
    // 2D Placement mode logic (New placement OR Moving)
    else if (selectedCatalogItem || isMovingItem) {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      const floorHit = intersects.find((hit) => hit.object.name === "shop_floor");

      if (floorHit) {
        // Snap to grid (1x1 units)
        const clampedX = Math.round(floorHit.point.x);
        const clampedZ = Math.round(floorHit.point.z);
        setHoveredCell({ x: clampedX, z: clampedZ });

        // Check if this cell is occupied or hits a wall
        let occupied = false;
        
        // Wall check
        const maxBound = 9;
        if (Math.abs(clampedX) > maxBound || Math.abs(clampedZ) > maxBound) {
          occupied = true;
        }

        placedItems.forEach((item: any) => {
          // If we are moving, we don't collide with ourselves
          if (isMovingItem && activePlacedItem && item.id === activePlacedItem.id) return;
          
          if (item.gridX === clampedX && item.gridZ === clampedZ) {
            occupied = true;
          }
        });
        setIsCellOccupied(occupied);
      }
    } else {
      if (hoveredCell !== null) setHoveredCell(null);
    }
  });

  // Handle floor clicks to place shelves or select them for removal
  const handlePointerDown = (e: any) => {
    e.stopPropagation();

    // Right click deselects building/moving item
    if (e.button === 2) {
      if (selectedCatalogItem) onSelectCatalogItem?.(null);
      if (isMovingItem) onMoveComplete?.();
      return;
    }

    // Moving Mode: Clicking places the item at new location
    if (!isFirstPerson && isMovingItem && activePlacedItem && hoveredCell) {
      if (!isCellOccupied) {
        networkManager.sendMoveItem(
          activePlacedItem.id,
          hoveredCell.x,
          hoveredCell.z,
          placementRotation
        );
        onMoveComplete?.();
      }
      return;
    }

    // 2D Placement mode: Clicking places item
    if (!isFirstPerson && selectedCatalogItem && hoveredCell) {
      if (!isCellOccupied) {
        networkManager.sendPlaceItem(
          selectedCatalogItem,
          hoveredCell.x,
          hoveredCell.z,
          placementRotation
        );
      }
    } 
    // 2D Select Mode: Clicking placed item moves player there and selects it
    else if (!isFirstPerson && !selectedCatalogItem) {
      // Find item or floor under mouse
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      // 1. Check for items first
      const itemHit = intersects.find(hit => {
        let curr: THREE.Object3D | null = hit.object;
        while (curr) {
          if (curr.name && (curr.name.startsWith("placed_item_") || curr.name.startsWith("delivery_box_"))) return true;
          curr = curr.parent;
        }
        return false;
      });

      if (itemHit) {
        let current: THREE.Object3D | null = itemHit.object;
        while (current && !current.name.startsWith("placed_item_") && !current.name.startsWith("delivery_box_")) {
          current = current.parent;
        }
        if (current) {
          if (current.name.startsWith("placed_item_")) {
            const itemId = current.name.replace("placed_item_", "");
            const item = placedItems.get(itemId);
            
            if (item) {
              // MOVE PLAYER TO ITEM
              const targetX = item.gridX;
              const targetZ = item.gridZ + 0.8; 
              networkManager.sendMoveTo(targetX, targetZ);
              
              // If it's a cash register, try to checkout waiting NPCs
              if (item.type === "cash_register") {
                const waitingNpc = Array.from(npcs.values()).find(npc => 
                  npc.state === "waiting_to_pay" && (
                    (Math.abs(npc.targetX - (item.gridX + 0.8)) < 1.0 && Math.abs(npc.targetZ - item.gridZ) < 1.0) ||
                    (Math.abs(npc.x - (item.gridX + 0.8)) < 1.0 && Math.abs(npc.z - item.gridZ) < 1.0)
                  )
                );
                
                if (waitingNpc) {
                  networkManager.sendProcessPayment(waitingNpc.id);
                  onSelectPlacedId(null);
                  return;
                }
              }
              
              onSelectPlacedId(itemId);
              setPlacementRotation(item.rotation);
            }
          } else if (current.name.startsWith("delivery_box_")) {
            const boxId = current.name.replace("delivery_box_", "");
            const box = deliveryBoxes.get(boxId);
            if (box) {
              const targetX = box.x;
              const targetZ = box.z;
              networkManager.sendMoveTo(targetX, targetZ);
              
              // Only pick up if very close or after walking there (handled by server pickUpBox logic too)
              networkManager.sendPickUpBox(boxId);
              onSelectPlacedId(null);
            }
          }
        }
      } 
      // 2. If no item hit, check for floor click to MOVE ONLY
      else {
        const floorHit = intersects.find(hit => hit.object.name === "shop_floor");
        if (floorHit) {
          networkManager.sendMoveTo(floorHit.point.x, floorHit.point.z);
        }
        onSelectPlacedId(null);
      }
    }
  };

  // Convert placement rotation number to angle in radians
  const getRotationAngle = (rot: number) => {
    return rot * (Math.PI / 2);
  };

  // Helper to render shelf component by type
  const renderShelfMesh = (type: string, stock?: number, maxStock?: number, productId?: string) => {
    switch (type) {
      case "shelf_groceries": return <ShelfGroceries stock={stock} maxStock={maxStock} productId={productId} />;
      case "shelf_produce": return <ShelfProduce stock={stock} productId={productId} />;
      case "shelf_frozen": return <ShelfFrozen stock={stock} productId={productId} />;
      case "cash_register": return <CashRegister />;
      case "pc_terminal": return <PCTerminal />;
      default: return null;
    }
  };

  return (
    <group onPointerDown={handlePointerDown}>
      {/* 1. Ground Shop Floor Mesh */}
      <mesh 
        name="shop_floor" 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Futuristic neon grid overlay on the floor */}
      {!isFirstPerson && (
        <gridHelper 
          args={[20, 20, "#14b8a6", "rgba(20, 184, 166, 0.08)"]} 
          position={[0, 0.02, 0]} 
        />
      )}

      {/* 3D Store Walls with Windows & Entrance Doors */}
      <StoreWalls />

      {/* Delivery Boxes */}
      {Array.from(deliveryBoxes.entries()).map(([id, box]: [string, any]) => (
        <DeliveryBoxMesh key={id} box={box} />
      ))}

      {/* Employees */}
      {Array.from(employees.entries()).map(([id, emp]: [string, any]) => (
        <EmployeeMesh key={id} emp={emp} />
      ))}

      {/* 2. Placed Shop Items */}
      {Array.from(placedItems.entries()).map(([id, item]: [string, any]) => {
        // If we are moving THIS item, hide it at its original position
        if (isMovingItem && activePlacedItem && id === activePlacedItem.id) return null;

        return (
          <group 
            key={id}
            name={`placed_item_${id}`}
            position={[item.gridX, 0, item.gridZ]}
            rotation={[0, getRotationAngle(item.rotation), 0]}
          >
            {renderShelfMesh(item.type, item.stock, item.maxStock, item.productId)}
          </group>
        );
      })}

      {/* 3. Placement Preview Box (visible when placing or moving) */}
      {((selectedCatalogItem || (isMovingItem && activePlacedItem)) && hoveredCell) && (
        <group 
          position={[hoveredCell.x, 0.02, hoveredCell.z]}
          rotation={[0, getRotationAngle(placementRotation), 0]}
        >
          {/* Glowing Preview Box Frame */}
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.92, 0.8, 0.82]} />
            <meshBasicMaterial 
              color={isCellOccupied ? "#ef4444" : "#10b981"} 
              wireframe 
              transparent 
              opacity={0.6} 
              />
          </mesh>
          
          {/* Phantom preview of the shelf item */}
          <group>
            {renderShelfMesh(
              selectedCatalogItem || activePlacedItem.type, 
              selectedCatalogItem ? 0 : activePlacedItem.stock, 
              selectedCatalogItem ? 0 : activePlacedItem.maxStock, 
              selectedCatalogItem ? "" : activePlacedItem.productId
            )}
          </group>

          {/* Key tooltip over preview item to rotate */}
          <mesh position={[0, 1.4, 0]}>
            <planeGeometry args={[0.4, 0.2]} />
            <meshBasicMaterial color="#000" transparent opacity={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
};
