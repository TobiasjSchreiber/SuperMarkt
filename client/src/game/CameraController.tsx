import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { currentInputs } from "./InputManager";
import { networkManager } from "./NetworkManager";

interface CameraControllerProps {
  isFirstPerson: boolean;
  localPlayerId: string;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  isFirstPerson,
  localPlayerId,
}) => {
  const { camera } = useThree();
  
  // Local rotation angles
  const yaw = useRef(Math.PI); // Yaw (horizontal look)
  const pitch = useRef(0);      // Pitch (vertical look)

  // Target values for LERPing when transitioning
  const currentPos = useRef(new THREE.Vector3(0, 15, 10));
  const currentTarget = useRef(new THREE.Vector3(0, 0, 0));

  // Local predicted position for smooth instant client-side movement
  const localPos = useRef(new THREE.Vector3(0, 0, 8));
  const velocityY = useRef(0);
  const isGrounded = useRef(true);
  const hasInitializedPos = useRef(false);

  // 2D Top-Down Camera state (Zoom and Panning)
  const tdZoom = useRef(1.0);
  const tdOffset = useRef(new THREE.Vector2(0, 0));
  const isPanning = useRef(false);

  // Initialize camera position and listeners
  useEffect(() => {
    const gl = camera.parent?.userData.gl || document.querySelector('canvas');
    if (!gl) return;

    const handleWheel = (e: WheelEvent) => {
      if (isFirstPerson) return;
      // Zoom logic: clamp between 0.4x and 2.5x
      const delta = e.deltaY * 0.001;
      tdZoom.current = Math.max(0.4, Math.min(2.5, tdZoom.current + delta));
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Button 1 is middle mouse button
      if (!isFirstPerson && e.button === 1) {
        isPanning.current = true;
        gl.setPointerCapture(e.pointerId);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.button === 1) {
        isPanning.current = false;
        gl.releasePointerCapture(e.pointerId);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isFirstPerson && isPanning.current) {
        // Move offset based on mouse delta, scaled by zoom
        const sensitivity = 0.02 * tdZoom.current;
        tdOffset.current.x -= e.movementX * sensitivity;
        tdOffset.current.y -= e.movementY * sensitivity;
      }
    };

    gl.addEventListener('wheel', handleWheel, { passive: false });
    gl.addEventListener('pointerdown', handlePointerDown);
    gl.addEventListener('pointermove', handlePointerMove);
    gl.addEventListener('pointerup', handlePointerUp);

    camera.position.set(0, 15, 10);
    camera.lookAt(0, 0, 0);

    return () => {
      gl.removeEventListener('wheel', handleWheel);
      gl.removeEventListener('pointerdown', handlePointerDown);
      gl.removeEventListener('pointermove', handlePointerMove);
      gl.removeEventListener('pointerup', handlePointerUp);
    };
  }, [camera, isFirstPerson]);

  useFrame((_state, delta) => {
    // 1. Read raw local player state directly from Colyseus state
    const room = networkManager.room;
    if (!room) return;
    const localPlayerRaw = room.state.players.get(localPlayerId);
    if (!localPlayerRaw) return;

    // Initialize local position once we have player data
    if (!hasInitializedPos.current) {
      localPos.current.set(localPlayerRaw.x, localPlayerRaw.y, localPlayerRaw.z);
      hasInitializedPos.current = true;
    }

    // If in 2D top-down mode, keep local position synchronized with server
    if (!isFirstPerson) {
      localPos.current.set(localPlayerRaw.x, localPlayerRaw.y, localPlayerRaw.z);
    }
    
    const px = localPos.current.x;
    const py = localPos.current.y;
    const pz = localPos.current.z;

    if (isFirstPerson) {
      // 2. 3D First Person camera logic
      // Apply input look deltas to local yaw & pitch
      yaw.current -= currentInputs.lookX;
      pitch.current -= currentInputs.lookY;

      // Reset look deltas after applying them in the frame
      currentInputs.lookX = 0;
      currentInputs.lookY = 0;

      // Clamp pitch to avoid looking upside down (degrees -80 to 80)
      pitch.current = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch.current));

      // Calculate camera looking direction
      const front = new THREE.Vector3(
        Math.sin(yaw.current) * Math.cos(pitch.current),
        Math.sin(pitch.current),
        Math.cos(yaw.current) * Math.cos(pitch.current)
      ).normalize();

      // Camera position: player head level
      const headHeight = 1.6;
      const targetCamPos = new THREE.Vector3(px, py + headHeight, pz);
      
      // Calculate look-at target
      const targetLookPos = targetCamPos.clone().add(front);

      // Smoothly transition camera when switching modes, but snap to target once close to avoid floaty lag
      const dist = currentPos.current.distanceTo(targetCamPos);
      if (dist < 0.1) {
        currentPos.current.copy(targetCamPos);
        currentTarget.current.copy(targetLookPos);
      } else {
        currentPos.current.lerp(targetCamPos, 0.25);
        currentTarget.current.lerp(targetLookPos, 0.25);
      }

      camera.position.copy(currentPos.current);
      camera.lookAt(currentTarget.current);

      // Move player based on inputs relative to camera orientation
      // Calculate flat camera directions for movement (ignoring Y tilt)
      const forward = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current)).normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      // Clamped delta to avoid huge teleportation jumps during framerate hiccups
      const clampedDelta = Math.min(0.1, delta);
      const moveSpeed = (currentInputs.sprint ? 12.0 : 7.0) * clampedDelta;
      
      let nextX = px + (forward.x * (-currentInputs.moveZ) + right.x * currentInputs.moveX) * moveSpeed;
      let nextZ = pz + (forward.z * (-currentInputs.moveZ) + right.z * currentInputs.moveX) * moveSpeed;
      let nextY = py;

      // --- Vertical Physics (Jump & Gravity) ---
      const gravity = -30.0;
      const jumpForce = 10.0;

      if (isGrounded.current && currentInputs.jump) {
        velocityY.current = jumpForce;
        isGrounded.current = false;
      }

      velocityY.current += gravity * clampedDelta;
      nextY += velocityY.current * clampedDelta;

      // --- Enhanced Collision & Platforming ---
      const playerRadius = 0.35;
      const itemSize = 0.55; // Slightly larger for better platforming feel
      const minDist = playerRadius + itemSize;

      let highestFloorBelow = 0;

      room.state.placedItems.forEach((item: any) => {
        const dx = nextX - item.gridX;
        const dz = nextZ - item.gridZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Get height of the item
        let itemHeight = 0.9; // Default height
        if (item.type === "shelf_groceries") itemHeight = 2.0;
        else if (item.type === "pc_terminal") itemHeight = 0.75;
        else if (item.type === "shelf_produce") itemHeight = 0.9;
        else if (item.type === "shelf_frozen") itemHeight = 0.95;
        else if (item.type === "cash_register") itemHeight = 0.9;

        if (dist < minDist) {
          // If our current/next position's feet are above the item's top (with some margin)
          // we can land on it.
          if (py >= itemHeight - 0.2) {
            if (itemHeight > highestFloorBelow) {
              highestFloorBelow = itemHeight;
            }
          } else {
            // Horizontal collision: Push player back if they are below the item height
            const overlap = minDist - dist;
            nextX += (dx / dist) * overlap;
            nextZ += (dz / dist) * overlap;
          }
        }
      });

      // Ground / Platform collision
      if (nextY <= highestFloorBelow) {
        nextY = highestFloorBelow;
        velocityY.current = 0;
        isGrounded.current = true;
      } else {
        isGrounded.current = false;
      }

      // Simple supermarket boundary collisions
      const maxBound = 9.8;
      nextX = Math.max(-maxBound, Math.min(maxBound, nextX));
      nextZ = Math.max(-maxBound, Math.min(maxBound, nextZ));

      localPos.current.set(nextX, nextY, nextZ);

      // Update position on server (throttled/unthrottled)
      // Send yaw.current as player rotation Y
      networkManager.sendMove(nextX, nextY, nextZ, yaw.current, true);
    } else {
      // 3. 2D Top-Down Mode camera logic
      // Calculate positions based on current zoom and panning offset
      const baseViewVector = new THREE.Vector3(0, 16, 8);
      const scaledViewVector = baseViewVector.clone().multiplyScalar(tdZoom.current);
      
      // The offset moves both the target we look at and the camera position
      const targetLookPos = new THREE.Vector3(tdOffset.current.x, 0, tdOffset.current.y);
      const targetCamPos = targetLookPos.clone().add(scaledViewVector);

      // LERP camera for smooth movement
      currentPos.current.lerp(targetCamPos, 0.1);
      currentTarget.current.lerp(targetLookPos, 0.1);

      camera.position.copy(currentPos.current);
      camera.lookAt(currentTarget.current);

      // Ensure local player state has first person = false on server
      if (localPlayerRaw && localPlayerRaw.isFirstPerson) {
        networkManager.sendMove(px, py, pz, localPlayerRaw.rotY, false);
      }
    }

    // Dolly Zoom / dynamic field of view (FOV) transition
    // 2D mode uses narrow fov (35) for flat camera projection.
    // 3D mode uses wider fov (70) for realistic first-person perspective.
    const targetFov = isFirstPerson ? 70 : 35;
    const persCam = camera as THREE.PerspectiveCamera;
    if (persCam.isPerspectiveCamera && Math.abs(persCam.fov - targetFov) > 0.1) {
      persCam.fov = THREE.MathUtils.lerp(persCam.fov, targetFov, 0.08);
      persCam.updateProjectionMatrix();
    }
  });

  return null;
};
