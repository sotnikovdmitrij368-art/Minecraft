import React from 'react';
import { BLOCK_CONFIGS, BLOCK_IDS } from '../utils/texture';
import { X } from 'lucide-react';

interface InventoryProps {
  isOpen: boolean;
  onClose: () => void;
  hotbar: number[];
  selectedHotbarIndex: number;
  onUpdateHotbar: (index: number, blockId: number) => void;
  onSelectHotbarIndex: (index: number) => void;
}

export const Inventory: React.FC<InventoryProps> = ({
  isOpen,
  onClose,
  hotbar,
  selectedHotbarIndex,
  onUpdateHotbar,
  onSelectHotbarIndex,
}) => {
  if (!isOpen) return null;

  // List of all placeable block types (excluding Air and Water, as placing water might need special behavior or can be allowed)
  const allBlocks = Object.values(BLOCK_CONFIGS).filter(
    (b) => b.id !== BLOCK_IDS.AIR
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      {/* Wooden/Stone style inventory panel */}
      <div className="w-full max-w-md bg-[#2c2c2c] border-4 border-[#1a1a1a] rounded-lg shadow-2xl overflow-hidden flex flex-col font-mono text-white">
        {/* Header */}
        <div className="bg-[#3c3c3c] px-4 py-3 border-b-4 border-[#1a1a1a] flex justify-between items-center">
          <h2 className="text-lg font-bold tracking-wider text-[#ffff55]">INVENTORY / ИНВЕНТАРЬ</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-[#8f1a1a] hover:bg-[#bd2222] border-2 border-[#571010] active:scale-90 rounded-sm"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto max-h-[60vh] space-y-4">
          <p className="text-xs text-gray-300 text-center leading-relaxed">
            Select a hotbar slot below, then click any block in the inventory grid to assign it.
            <br />
            <span className="text-[#55ffff]">Выберите слот быстрой панели, затем нажмите на блок.</span>
          </p>

          {/* Hotbar configurator */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Hotbar Slots:</h3>
            <div className="grid grid-cols-7 gap-2 bg-[#1e1e1e] p-2 border-2 border-[#121212] rounded-md justify-center">
              {hotbar.map((blockId, idx) => {
                const config = BLOCK_CONFIGS[blockId];
                const isSelected = idx === selectedHotbarIndex;

                return (
                  <button
                    key={idx}
                    onClick={() => onSelectHotbarIndex(idx)}
                    className={`aspect-square w-full border-2 rounded-sm flex flex-col items-center justify-center relative p-1 transition-all ${
                      isSelected
                        ? 'bg-[#555555] border-[#ffff55] scale-105 ring-2 ring-[#ffff55]/50'
                        : 'bg-[#333333] border-[#555555] hover:bg-[#444444]'
                    }`}
                  >
                    {/* Render colored block box representative */}
                    <div
                      className="w-6 h-6 rounded-xs border shadow-inner border-black/20"
                      style={{ backgroundColor: config?.color || '#000' }}
                    ></div>
                    <span className="text-[9px] text-[#ffff55] absolute bottom-0 right-1">{idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid of all blocks */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available Blocks:</h3>
            <div className="grid grid-cols-4 gap-3 bg-[#1e1e1e] p-3 border-2 border-[#121212] rounded-md overflow-y-auto max-h-[220px]">
              {allBlocks.map((block) => (
                <button
                  key={block.id}
                  onClick={() => onUpdateHotbar(selectedHotbarIndex, block.id)}
                  className="aspect-square bg-[#333333] border-2 border-[#555555] hover:border-white active:scale-95 transition-all p-2 flex flex-col items-center justify-between rounded-sm"
                >
                  <div
                    className="w-8 h-8 rounded-xs shadow-md border border-black/30 flex-shrink-0"
                    style={{ backgroundColor: block.color }}
                  ></div>
                  <span className="text-[9px] text-center truncate w-full text-gray-200 mt-1" title={block.name}>
                    {block.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#212121] px-4 py-3 border-t-4 border-[#1a1a1a] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#4c8f1a] hover:bg-[#62b522] border-2 border-[#2b5210] active:scale-95 rounded-sm font-bold text-sm tracking-wide text-white"
          >
            DONE / ГОТОВО
          </button>
        </div>
      </div>
    </div>
  );
};
export default Inventory;
