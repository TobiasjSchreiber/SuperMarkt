import React, { useEffect, useRef, useState } from "react";

export interface InputState {
  moveX: number; // -1 to 1
  moveZ: number; // -1 to 1
  lookX: number; // mouse delta X or right side touch drag delta
  lookY: number; // mouse delta Y or right side touch drag delta
  sprint: boolean;
  jump: boolean;
}

// Global input reference for 60fps R3F access
export const currentInputs = {
  moveX: 0,
  moveZ: 0,
  lookX: 0,
  lookY: 0,
  sprint: false,
  jump: false,
};

interface InputManagerProps {
  isFirstPerson: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const InputManager: React.FC<InputManagerProps> = ({ isFirstPerson, canvasRef }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [touchingLeft, setTouchingLeft] = useState(false);

  // Joystick state refs
  const leftStartPos = useRef({ x: 0, y: 0 });
  const [leftKnobPos, setLeftKnobPos] = useState({ x: 0, y: 0 });
  
  // Right side touch camera dragging state
  const rightLastPos = useRef({ x: 0, y: 0 });
  const rightTouchId = useRef<number | null>(null);

  // Keyboard state
  const keys = useRef<{ [key: string]: boolean }>({});

  // Release pointer lock when disabling first person (e.g. opening UI)
  useEffect(() => {
    if (!isFirstPerson && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [isFirstPerson]);

  useEffect(() => {
    // Detect mobile touch
    const checkMobile = () => {
      setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Keyboard Listeners
  useEffect(() => {

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.current[k] = true;
      if (e.key === "Shift") keys.current["shift"] = true;
      updateKeyboardInputs();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.current[k] = false;
      if (e.key === "Shift") keys.current["shift"] = false;
      updateKeyboardInputs();
    };

    const updateKeyboardInputs = () => {
      let x = 0;
      let z = 0;

      if (keys.current["w"] || keys.current["arrowup"]) z -= 1;
      if (keys.current["s"] || keys.current["arrowdown"]) z += 1;
      if (keys.current["a"] || keys.current["arrowleft"]) x -= 1;
      if (keys.current["d"] || keys.current["arrowright"]) x += 1;

      currentInputs.moveX = x;
      currentInputs.moveZ = z;
      currentInputs.sprint = !!keys.current["shift"];
      currentInputs.jump = !!keys.current[" "];
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Mouse move handler for camera lock (PC)
  useEffect(() => {
    if (!isFirstPerson) {
      currentInputs.lookX = 0;
      currentInputs.lookY = 0;
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvasRef.current) {
        // Sensitivity factor
        const sensitivity = 0.0025;
        currentInputs.lookX += e.movementX * sensitivity;
        currentInputs.lookY += e.movementY * sensitivity;
      }
    };

    const handlePointerLockChange = () => {
      if (document.pointerLockElement !== canvasRef.current) {
        currentInputs.lookX = 0;
        currentInputs.lookY = 0;
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, [isFirstPerson, canvasRef]);

  // Click Canvas to lock pointer on PC
  useEffect(() => {
    if (!isFirstPerson || !canvasRef.current) return;

    const handleCanvasClick = () => {
      if (canvasRef.current && document.pointerLockElement !== canvasRef.current) {
        canvasRef.current.requestPointerLock();
      }
    };

    const canvas = canvasRef.current;
    canvas.addEventListener("click", handleCanvasClick);
    return () => canvas.removeEventListener("click", handleCanvasClick);
  }, [isFirstPerson, canvasRef]);

  // No longer need decay interval since look inputs are cleanly consumed and reset in R3F loop

  // Mobile Touch Joysticks
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchList = e.changedTouches;
    const width = window.innerWidth;

    for (let i = 0; i < touchList.length; i++) {
      const touch = touchList[i];
      // Left side: movement joystick
      if (touch.clientX < width / 2 && !touchingLeft) {
        setTouchingLeft(true);
        leftStartPos.current = { x: touch.clientX, y: touch.clientY };
        setLeftKnobPos({ x: 0, y: 0 });
      } 
      // Right side: camera look swipe
      else if (touch.clientX >= width / 2 && rightTouchId.current === null && isFirstPerson) {
        rightTouchId.current = touch.identifier;
        rightLastPos.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchList = e.touches;
    const width = window.innerWidth;

    for (let i = 0; i < touchList.length; i++) {
      const touch = touchList[i];

      // Left side movement
      if (touch.clientX < width / 2 && touchingLeft) {
        const dx = touch.clientX - leftStartPos.current.x;
        const dy = touch.clientY - leftStartPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 50; // max joystick range in pixels

        let moveX = dx;
        let moveY = dy;

        if (dist > maxDist) {
          moveX = (dx / dist) * maxDist;
          moveY = (dy / dist) * maxDist;
        }

        setLeftKnobPos({ x: moveX, y: moveY });

        // Update global variables
        currentInputs.moveX = moveX / maxDist;
        currentInputs.moveZ = moveY / maxDist;
      } 
      // Right side looking
      else if (touch.identifier === rightTouchId.current && isFirstPerson) {
        const dx = touch.clientX - rightLastPos.current.x;
        const dy = touch.clientY - rightLastPos.current.y;
        const sensitivity = 0.008;

        currentInputs.lookX += dx * sensitivity;
        currentInputs.lookY += dy * sensitivity;

        rightLastPos.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchList = e.changedTouches;
    const width = window.innerWidth;

    for (let i = 0; i < touchList.length; i++) {
      const touch = touchList[i];

      if (touch.clientX < width / 2 && touchingLeft) {
        setTouchingLeft(false);
        setLeftKnobPos({ x: 0, y: 0 });
        currentInputs.moveX = 0;
        currentInputs.moveZ = 0;
      } else if (touch.identifier === rightTouchId.current) {
        rightTouchId.current = null;
      }
    }
  };

  // Do not render joystick overlay if not mobile
  if (!isMobile) {
    if (isFirstPerson) {
      return (
        <div className="instructions-banner">
          <span>🎮 <strong>WASD / Pfeiltasten</strong> zum Bewegen</span>
          <span>•</span>
          <span>🖱️ <strong>Klick</strong> zum Umschauen sperren (ESC zum Entsperren)</span>
        </div>
      );
    }
    return null;
  }

  // On mobile, only show the overlay in first-person mode to allow movement.
  // In 2D mode, we want touches to pass through to the 3D canvas for selection/placement.
  if (!isFirstPerson) return null;

  return (
    <div 
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 5,
        pointerEvents: "auto",
        userSelect: "none"
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Left movement joystick */}
      {touchingLeft && (
        <div 
          className="joystick-container"
          style={{
            left: `${leftStartPos.current.x - 70}px`,
            top: `${leftStartPos.current.y - 70}px`,
            position: "fixed",
            transform: "scale(0.85)"
          }}
        >
          <div 
            className="joystick-knob"
            style={{
              transform: `translate(${leftKnobPos.x}px, ${leftKnobPos.y}px)`
            }}
          />
        </div>
      )}

      {/* Right camera look info area (subtle indicator) */}
      {isFirstPerson && (
        <>
          <div 
            style={{
              position: "absolute",
              bottom: "100px",
              right: "40px",
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(20, 184, 166, 0.4)",
              border: "2px solid rgba(20, 184, 166, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              color: "white",
              pointerEvents: "auto",
              touchAction: "none"
            }}
            onTouchStart={(e) => { e.stopPropagation(); currentInputs.jump = true; }}
            onTouchEnd={(e) => { e.stopPropagation(); currentInputs.jump = false; }}
          >
            ⬆️
          </div>
          <div 
            style={{
              position: "absolute",
              bottom: "20px",
              right: "20px",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              background: "rgba(0,0,0,0.5)",
              padding: "4px 8px",
              borderRadius: "4px",
              pointerEvents: "none"
            }}
          >
            Rechte Seite ziehen zum Umschauen 🔄
          </div>
        </>
      )}
    </div>
  );
};
