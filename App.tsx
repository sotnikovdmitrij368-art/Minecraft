import { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  HelpCircle,
  X,
} from 'lucide-react';
import { BLOCK_IDS, BLOCK_CONFIGS } from './utils/texture';
import { GameCanvas } from './components/GameCanvas';
import { Joystick } from './components/Joystick';
import { Inventory } from './components/Inventory';
import { sound } from './utils/audio';

export default function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [seed, setSeed] = useState(12345);
  const [sensitivity, setSensitivity] = useState(1.5);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Hotbar state: 7 slots
  const [hotbar, setHotbar] = useState<number[]>([
    BLOCK_IDS.GRASS,
    BLOCK_IDS.WOOD,
    BLOCK_IDS.PLANKS,
    BLOCK_IDS.LEAVES,
    BLOCK_IDS.BRICK,
    BLOCK_IDS.GLASS,
    BLOCK_IDS.DIAMOND_ORE,
  ]);
  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState(0);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  // Joystick & Movement States
  const [joystickMove, setJoystickMove] = useState({ x: 0, y: 0 });
  const [isJumping, setIsJumping] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [flyDirection, setFlyDirection] = useState(0); // 1 for up, -1 for down, 0 for still

  // Dynamic statistics
  const [modificationsCount, setModificationsCount] = useState(0);

  // Synchronize fullscreen state changes
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.error(`Fullscreen request failed: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen is not supported on this device/browser');
    }
  };

  const handleStartGame = () => {
    // Play initial sound to enable Web Audio Context
    sound.toggle(isSoundEnabled);
    sound.playBlockPlace();
    setGameStarted(true);
  };

  const handleRandomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 99999) + 1;
    setSeed(newSeed);
    sound.playDigTick();
  };

  const handleResetWorld = () => {
    if (window.confirm('Вы уверены, что хотите сбросить этот мир? Все построенные блоки будут удалены.\n\nAre you sure you want to reset this world? All custom blocks will be deleted.')) {
      localStorage.removeItem(`minecraft_world_mods_${seed}`);
      setModificationsCount(0);
      sound.playBlockBreak();
      // Reload game canvas if playing
      if (gameStarted) {
        setGameStarted(false);
        setTimeout(() => setGameStarted(true), 100);
      }
    }
  };

  const handleUpdateHotbar = (index: number, blockId: number) => {
    const updated = [...hotbar];
    updated[index] = blockId;
    setHotbar(updated);
    sound.playBlockPlace();
  };

  const handleHotbarSelect = (index: number) => {
    setSelectedHotbarIndex(index);
    sound.playDigTick();
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#141414] overflow-hidden select-none touch-none text-white font-mono">
      {!gameStarted ? (
        /* ================= MAIN MENU SCREEN ================= */
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#3c3c3c] to-[#1c1c1c] overflow-y-auto">
          {/* Logo Title */}
          <div className="text-center mt-6 space-y-2">
            <div className="inline-block relative">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-[#bfff00] to-[#55aa00] drop-shadow-[0_4px_0_rgba(0,0,0,0.8)] filter">
                MINECRAFT
              </h1>
              <span className="absolute -bottom-2 -right-4 bg-red-600 text-white text-[9px] md:text-xs font-bold px-1.5 py-0.5 uppercase tracking-widest rotate-12 border-2 border-white shadow-md">
                MOBILE PE
              </span>
            </div>
            <p className="text-xs md:text-sm text-gray-400 font-semibold tracking-widest uppercase">
              3D Crafting Simulator / Симулятор крафта
            </p>
          </div>

          {/* Central configuration dashboard */}
          <div className="w-full max-w-sm bg-black/45 border-4 border-[#2d2d2d] rounded-lg p-5 space-y-5 shadow-2xl backdrop-blur-xs my-4">
            {/* World Seed Controls */}
            <div className="space-y-2">
              <label className="text-xs text-amber-400 font-bold uppercase tracking-wider block">
                World Seed / Сид Мира:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value) || 12345)}
                  className="flex-1 bg-black/60 border-2 border-white/20 rounded-xs px-3 py-1.5 text-center text-sm font-bold tracking-widest text-[#ffff55] focus:outline-hidden focus:border-amber-400"
                />
                <button
                  onClick={handleRandomizeSeed}
                  className="px-3 bg-neutral-700 border-2 border-neutral-500 active:scale-95 transition-all flex items-center justify-center rounded-xs"
                  title="Random Seed"
                >
                  <RotateCcw className="w-4 h-4 text-white" />
                </button>
              </div>
              {modificationsCount > 0 && (
                <div className="text-[10px] text-green-400 flex items-center justify-between mt-1 px-1">
                  <span>Сохранение: {modificationsCount} блоков</span>
                  <button
                    onClick={handleResetWorld}
                    className="text-red-400 hover:text-red-300 underline font-bold active:scale-95"
                  >
                    Сбросить
                  </button>
                </div>
              )}
            </div>

            {/* Slider Settings */}
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-300">
                  <span className="uppercase font-semibold">Look Sensitivity / Обзор:</span>
                  <span className="text-cyan-400 font-bold">{sensitivity}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Sound and Fullscreen buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setIsSoundEnabled(!isSoundEnabled);
                    sound.toggle(!isSoundEnabled);
                  }}
                  className={`py-2 border-2 rounded-xs flex items-center justify-center gap-2 active:scale-95 transition-all text-xs font-bold ${
                    isSoundEnabled
                      ? 'bg-neutral-800 border-emerald-500 text-emerald-400'
                      : 'bg-neutral-900 border-red-800 text-red-500'
                  }`}
                >
                  {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{isSoundEnabled ? 'ЗВУК ON' : 'ЗВУК OFF'}</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="py-2 bg-neutral-800 border-2 border-white/20 active:scale-95 rounded-xs flex items-center justify-center gap-2 text-xs font-bold"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  <span>ЭКРАН</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Help Guide */}
          <div className="max-w-md text-center text-gray-400 space-y-2 text-[10px] leading-relaxed my-2">
            <div className="text-white font-bold mb-1 uppercase tracking-wider text-xs">Управление на телефоне:</div>
            <p>
              👉 <span className="text-white font-semibold">Джойстик слева:</span> Движение игрока
              <br />
              👉 <span className="text-white font-semibold">Правая часть экрана:</span> Поворот камеры (свайп)
              <br />
              👉 <span className="text-[#ffff55] font-bold">Сломать блок:</span> Зажать палец на блоке на 2 секунды
              <br />
              👉 <span className="text-[#55ff55] font-bold">Поставить блок:</span> Короткий быстрый тап по блоку
              <br />
              👉 <span className="text-[#55ffff] font-bold">Режим полета (FLY):</span> Нажмите кнопку "WALK/FLY" для переключения
            </p>
          </div>

          {/* Play Trigger */}
          <button
            onClick={handleStartGame}
            className="w-full max-w-sm py-4 bg-gradient-to-r from-emerald-600 to-green-600 border-b-4 border-green-800 active:border-b-0 active:translate-y-1 active:scale-98 transition-all rounded-md font-bold text-lg text-white shadow-2xl flex items-center justify-center gap-2 tracking-widest mt-2"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>PLAY WORLD / ИГРАТЬ</span>
          </button>

          {/* Footer copyright */}
          <div className="text-[9px] text-gray-600 mt-4 select-none">
            © 2026 Turnkey Voxel Engine. Made with Three.js & Tailwind.
          </div>
        </div>
      ) : (
        /* ================= GAMEPLAY PLAYING SCREEN ================= */
        <div className="absolute inset-0 w-full h-full z-0">
          {/* Main 3D Canvas rendering engine */}
          <GameCanvas
            activeBlockId={hotbar[selectedHotbarIndex]}
            joystickMove={joystickMove}
            isJumping={isJumping}
            isFlying={isFlying}
            onToggleFly={() => setIsFlying(!isFlying)}
            flyDirection={flyDirection}
            sensitivity={sensitivity}
            seed={seed}
            isSoundEnabled={isSoundEnabled}
            onSaveModificationsCount={setModificationsCount}
          />

          {/* Top Control Bar (HUD Menu, Settings, Fullscreen, Help) */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
            {/* Help Button */}
            <button
              onClick={() => {
                setShowHelpModal(true);
                sound.playDigTick();
              }}
              className="w-10 h-10 bg-black/40 border border-white/10 hover:bg-black/60 active:scale-90 rounded-md flex items-center justify-center text-white"
              title="Help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Sound toggle */}
            <button
              onClick={() => {
                setIsSoundEnabled(!isSoundEnabled);
                sound.toggle(!isSoundEnabled);
              }}
              className="w-10 h-10 bg-black/40 border border-white/10 hover:bg-black/60 active:scale-90 rounded-md flex items-center justify-center text-white"
              title="Toggle Sound"
            >
              {isSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 bg-black/40 border border-white/10 hover:bg-black/60 active:scale-90 rounded-md flex items-center justify-center text-white"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Main Menu Button */}
            <button
              onClick={() => {
                setGameStarted(false);
                sound.playBlockPlace();
              }}
              className="px-4 h-10 bg-red-800/80 hover:bg-red-800 border border-red-500/30 active:scale-90 rounded-md flex items-center justify-center font-bold text-xs uppercase tracking-wider text-white"
            >
              MENU
            </button>
          </div>

          {/* Mobile joysticks and action buttons */}
          <Joystick
            onMove={(x, y) => setJoystickMove({ x, y })}
            onJump={setIsJumping}
            isFlying={isFlying}
            onToggleFly={() => setIsFlying(!isFlying)}
            onFlyChange={setFlyDirection}
          />

          {/* Bottom Active Hotbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto select-none">
            <div className="flex items-center gap-1 bg-black/60 p-1.5 border border-white/10 rounded-md shadow-2xl backdrop-blur-xs">
              {hotbar.map((blockId, idx) => {
                const config = BLOCK_CONFIGS[blockId];
                const isSelected = idx === selectedHotbarIndex;

                return (
                  <button
                    key={idx}
                    onClick={() => handleHotbarSelect(idx)}
                    className={`aspect-square w-11 h-11 border-2 rounded-xs flex flex-col items-center justify-center relative p-1 transition-all ${
                      isSelected
                        ? 'bg-[#555555]/80 border-[#ffff55] scale-110 ring-2 ring-[#ffff55]/30'
                        : 'bg-[#333333]/50 border-[#555555]/60 hover:bg-[#444444]/60'
                    }`}
                  >
                    {/* Visual representative block color box */}
                    <div
                      className="w-5 h-5 rounded-xs border border-black/20 shadow-inner"
                      style={{ backgroundColor: config?.color || '#000' }}
                    ></div>
                    <span className="text-[7px] text-[#ffff55] absolute bottom-0.5 right-1">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}

              {/* Edit inventory selector button */}
              <button
                onClick={() => {
                  setIsInventoryOpen(true);
                  sound.playDigTick();
                }}
                className="aspect-square w-11 h-11 bg-neutral-800/80 border-2 border-neutral-600 hover:border-white rounded-xs flex items-center justify-center font-bold text-xs text-amber-400 active:scale-95"
                title="Open Inventory"
              >
                <span>...</span>
              </button>
            </div>
          </div>

          {/* Inventory Manager Popup */}
          <Inventory
            isOpen={isInventoryOpen}
            onClose={() => setIsInventoryOpen(false)}
            hotbar={hotbar}
            selectedHotbarIndex={selectedHotbarIndex}
            onUpdateHotbar={handleUpdateHotbar}
            onSelectHotbarIndex={handleHotbarSelect}
          />

          {/* Help Overlay Modal */}
          {showHelpModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
              <div className="w-full max-w-sm bg-[#2c2c2c] border-4 border-[#1a1a1a] rounded-lg shadow-2xl overflow-hidden flex flex-col text-white">
                <div className="bg-[#3c3c3c] px-4 py-2 border-b-4 border-[#1a1a1a] flex justify-between items-center">
                  <h3 className="font-bold text-amber-400 text-sm">ПОМОЩЬ / GAME CONTROLS</h3>
                  <button
                    onClick={() => {
                      setShowHelpModal(false);
                      sound.playDigTick();
                    }}
                    className="w-6 h-6 flex items-center justify-center bg-red-800 hover:bg-red-700 rounded-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-4 space-y-3 text-xs leading-relaxed">
                  <div>
                    <h4 className="font-bold text-white uppercase text-[11px] border-b border-white/10 pb-0.5 mb-1 text-cyan-400">
                      Разрушение Блоков (Break)
                    </h4>
                    <p className="text-gray-300">
                      Зажмите палец на блоке ровно на <span className="text-white font-semibold">2 секунды</span>. 
                      Появится сетка трещин и блок разрушится! Бедрок сломать нельзя.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase text-[11px] border-b border-white/10 pb-0.5 mb-1 text-emerald-400">
                      Установка Блоков (Place)
                    </h4>
                    <p className="text-gray-300">
                      Быстро нажмите (<span className="text-white font-semibold">короткий тап</span>) по любой 
                      грани блока. Будет установлен выбранный в хотбаре блок.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase text-[11px] border-b border-white/10 pb-0.5 mb-1 text-amber-400">
                      Обзор Камеры (Camera Look)
                    </h4>
                    <p className="text-gray-300">
                      Проведите пальцем (свайп) по правой части экрана, не нажимая на кнопки управления.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase text-[11px] border-b border-white/10 pb-0.5 mb-1 text-indigo-400">
                      Режим Полета (Fly Mode)
                    </h4>
                    <p className="text-gray-300">
                      Нажмите кнопку <span className="text-white font-semibold">WALK/FLY</span> справа. В режиме полета появятся кнопки 
                      со стрелками Вверх и Вниз для легкого перемещения по воздуху!
                    </p>
                  </div>
                  <div className="pt-2 text-[10px] text-gray-400 text-center border-t border-white/10">
                    Все ваши изменения сохраняются автоматически!
                  </div>
                </div>

                <div className="bg-[#212121] px-4 py-2 border-t-4 border-[#1a1a1a] flex justify-end">
                  <button
                    onClick={() => {
                      setShowHelpModal(false);
                      sound.playDigTick();
                    }}
                    className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-sm font-bold text-xs text-white"
                  >
                    ПОНЯТНО
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
