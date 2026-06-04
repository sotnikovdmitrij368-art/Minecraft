import React, { useState, useRef, useEffect } from 'react';
import { Navigation, ArrowUp, ArrowDown } from 'lucide-react';

interface JoystickProps {
  onMove: (moveX: number, moveY: number) => void;
  onJump: (isJumping: boolean) => void;
  isFlying: boolean;
  onToggleFly: () => void;
  onFlyChange: (dir: number) => void; // 1 for up, -1 for down, 0 for stop
}

export const Joystick: React.FC<JoystickProps> = ({
  onMove,
  onJump,
  isFlying,
  onToggleFly,
  onFlyChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchId, setTouchId] = useState<number | null>(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isPressingJump, setIsPressingJump] = useState(false);
  const [isPressingFlyUp, setIsPressingFlyUp] = useState(false);
  const [isPressingFlyDown, setIsPressingFlyDown] = useState(false);

  const JOYSTICK_RADIUS = 50; // Max distance the stick can move

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (touchId !== null) return; // Only track one touch for the joystick
    
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate clamped positions
    let stickX = dx;
    let stickY = dy;
    if (distance > JOYSTICK_RADIUS) {
      stickX = (dx / distance) * JOYSTICK_RADIUS;
      stickY = (dy / distance) * JOYSTICK_RADIUS;
    }

    setTouchId(e.pointerId);
    setStickPos({ x: stickX, y: stickY });
    
    // Normalize values between -1 and 1
    onMove(stickX / JOYSTICK_RADIUS, -stickY / JOYSTICK_RADIUS);
    container.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (touchId === null || e.pointerId !== touchId) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let stickX = dx;
    let stickY = dy;
    if (distance > JOYSTICK_RADIUS) {
      stickX = (dx / distance) * JOYSTICK_RADIUS;
      stickY = (dy / distance) * JOYSTICK_RADIUS;
    }

    setStickPos({ x: stickX, y: stickY });
    onMove(stickX / JOYSTICK_RADIUS, -stickY / JOYSTICK_RADIUS);
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (touchId === null || e.pointerId !== touchId) return;

    setTouchId(null);
    setStickPos({ x: 0, y: 0 });
    onMove(0, 0);

    const container = containerRef.current;
    if (container) {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch (err) {
        // pointer capture release might throw if already released
      }
    }
  };

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => handlePointerMove(e);
    const handleGlobalUp = (e: PointerEvent) => handlePointerUp(e);

    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointercancel', handleGlobalUp);
    };
  }, [touchId]);

  // Handle jump buttons
  const handleJumpStart = () => {
    setIsPressingJump(true);
    onJump(true);
  };

  const handleJumpEnd = () => {
    setIsPressingJump(false);
    onJump(false);
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex justify-between items-end p-6 md:p-12">
      {/* Left side: Joystick */}
      <div className="flex flex-col items-center gap-3 pointer-events-auto">
        <div
          ref={containerRef}
          className="w-32 h-32 rounded-full bg-black/40 border border-white/20 flex items-center justify-center touch-none backdrop-blur-xs relative"
          onPointerDown={handlePointerDown}
        >
          {/* Outer ring notches */}
          <div className="absolute top-1 w-1 h-2 bg-white/20"></div>
          <div className="absolute bottom-1 w-1 h-2 bg-white/20"></div>
          <div className="absolute left-1 w-2 h-1 bg-white/20"></div>
          <div className="absolute right-1 w-2 h-1 bg-white/20"></div>

          {/* Center Stick */}
          <div
            className="w-14 h-14 rounded-full bg-white/70 border-2 border-white shadow-lg absolute transition-all duration-75 flex items-center justify-center"
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
              cursor: 'grab',
            }}
          >
            <div className="w-6 h-6 rounded-full bg-black/20"></div>
          </div>
        </div>
      </div>

      {/* Right side: Action Buttons */}
      <div className="flex flex-col items-end gap-4 pointer-events-auto">
        {/* Flight control buttons if flying */}
        {isFlying && (
          <div className="flex flex-col gap-2 mr-2">
            {/* Fly Up */}
            <button
              onPointerDown={() => {
                setIsPressingFlyUp(true);
                onFlyChange(1);
              }}
              onPointerUp={() => {
                setIsPressingFlyUp(false);
                onFlyChange(0);
              }}
              onPointerCancel={() => {
                setIsPressingFlyUp(false);
                onFlyChange(0);
              }}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white border transition-colors shadow-lg active:scale-95 ${
                isPressingFlyUp
                  ? 'bg-amber-500/80 border-amber-300'
                  : 'bg-black/50 border-white/20 hover:bg-black/60'
              }`}
              title="Fly Up"
            >
              <ArrowUp className="w-7 h-7" />
            </button>

            {/* Fly Down */}
            <button
              onPointerDown={() => {
                setIsPressingFlyDown(true);
                onFlyChange(-1);
              }}
              onPointerUp={() => {
                setIsPressingFlyDown(false);
                onFlyChange(0);
              }}
              onPointerCancel={() => {
                setIsPressingFlyDown(false);
                onFlyChange(0);
              }}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white border transition-colors shadow-lg active:scale-95 ${
                isPressingFlyDown
                  ? 'bg-amber-500/80 border-amber-300'
                  : 'bg-black/50 border-white/20 hover:bg-black/60'
              }`}
              title="Fly Down"
            >
              <ArrowDown className="w-7 h-7" />
            </button>
          </div>
        )}

        {/* Action button row */}
        <div className="flex items-center gap-3">
          {/* Fly Toggle */}
          <button
            onClick={onToggleFly}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border transition-all duration-200 shadow-md ${
              isFlying
                ? 'bg-cyan-600/90 border-cyan-300 text-white font-bold animate-pulse'
                : 'bg-black/40 border-white/10 text-white/70 hover:bg-black/50'
            }`}
            title="Toggle Fly Mode"
          >
            <Navigation className={`w-5 h-5 ${isFlying ? 'rotate-45 text-white' : 'text-white/60'}`} />
            <span className="text-[9px] mt-0.5">{isFlying ? 'FLY' : 'WALK'}</span>
          </button>

          {/* Jump / Up Button */}
          <button
            onPointerDown={handleJumpStart}
            onPointerUp={handleJumpEnd}
            onPointerCancel={handleJumpEnd}
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border text-white font-bold shadow-2xl transition-all select-none active:scale-90 ${
              isPressingJump
                ? 'bg-emerald-600/95 border-emerald-300 scale-95 shadow-inner'
                : 'bg-black/60 border-white/30 backdrop-blur-xs hover:bg-black/75'
            }`}
            style={{ touchAction: 'none' }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-white/40 flex items-center justify-center mb-0.5">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <span className="text-xs uppercase tracking-wider">JUMP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default Joystick;
