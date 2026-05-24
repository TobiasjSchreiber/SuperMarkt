import React from "react";
import { SupermarketGrid } from "./SupermarketGrid";
import { PlayerMesh } from "./PlayerMesh";
import { CameraController } from "./CameraController";
import { NPCMesh } from "./NPCMesh";

interface GameSceneProps {
  isFirstPerson: boolean;
  localPlayerId: string;
  playersState: Map<string, any>;
  placedItemsState: Map<string, any>;
  npcsState: Map<string, any>;
  deliveryBoxesState: Map<string, any>;
  employeesState: Map<string, any>;
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

export const GameScene: React.FC<GameSceneProps> = ({
  isFirstPerson,
  localPlayerId,
  playersState,
  placedItemsState,
  npcsState,
  deliveryBoxesState,
  employeesState,
  selectedCatalogItem,
  onSelectCatalogItem,
  onSelectPlacedId,
  onTargetedShelfChange,
  isMovingItem,
  activePlacedItem,
  onMoveComplete,
}) => {
  return (
    <>
      {/* ... (light components) ... */}
      <ambientLight intensity={0.65} />
      <directionalLight position={[8, 15, 6]} intensity={1.2} castShadow />
      <directionalLight position={[-8, 8, -6]} intensity={0.4} />

      {/* Cyber/Cosy Corner Shop Neon Lights (teal and purple accents) */}
      <pointLight position={[-9.5, 3.0, -9.5]} color="#14b8a6" intensity={1.8} distance={6} decay={1.5} />
      <pointLight position={[9.5, 3.0, -9.5]} color="#8b5cf6" intensity={1.8} distance={6} decay={1.5} />
      <pointLight position={[-9.5, 3.0, 9.5]} color="#8b5cf6" intensity={1.8} distance={6} decay={1.5} />
      <pointLight position={[9.5, 3.0, 9.5]} color="#14b8a6" intensity={1.8} distance={6} decay={1.5} />

      {/* Supermarket Interior Grid & Shelf Meshes */}
      <SupermarketGrid
        isFirstPerson={isFirstPerson}
        placedItems={placedItemsState}
        npcs={npcsState}
        deliveryBoxes={deliveryBoxesState}
        employees={employeesState}
        selectedCatalogItem={selectedCatalogItem}
        onSelectCatalogItem={onSelectCatalogItem}
        onSelectPlacedId={onSelectPlacedId}
        onTargetedShelfChange={onTargetedShelfChange}
        isMovingItem={isMovingItem}
        activePlacedItem={activePlacedItem}
        onMoveComplete={onMoveComplete}
      />

      {/* Render Players */}
      {Array.from(playersState.entries()).map(([id, player]: [string, any]) => (
        <PlayerMesh 
          key={id} 
          player={player} 
          isLocal={id === localPlayerId} 
        />
      ))}

      {/* Render AI NPC Customers */}
      {Array.from(npcsState.entries()).map(([id, npc]: [string, any]) => (
        <NPCMesh 
          key={id} 
          npc={npc} 
        />
      ))}

      {/* Handles Camera movement & Input bindings */}
      <CameraController
        isFirstPerson={isFirstPerson}
        localPlayerId={localPlayerId}
      />
    </>
  );
};
