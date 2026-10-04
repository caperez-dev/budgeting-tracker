import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Loader2 } from 'lucide-react';

interface PhotoCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => Promise<void> | void;
  isSaving?: boolean;
}

const CROP_SIZE = 260; // Size of the circular crop viewport in px
const OUTPUT_SIZE = 400; // Output square image resolution

export function PhotoCropModal({
  isOpen,
  imageSrc,
  onClose,
  onSave,
  isSaving = false,
}: PhotoCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom & pan when image changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setImageLoaded(false);
    }
  }, [isOpen, imageSrc]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch handlers for mobile/trackpad drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCropAndSave = async () => {
    if (!imageRef.current || !imageLoaded) return;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate crop
    // Container display dimensions of the image:
    // Natural aspect ratio:
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // Determine base scale (cover CROP_SIZE):
    const scaleBase = Math.max(CROP_SIZE / naturalWidth, CROP_SIZE / naturalHeight);
    const displayedWidth = naturalWidth * scaleBase * zoom;
    const displayedHeight = naturalHeight * scaleBase * zoom;

    // Center of crop area in displayed coordinates:
    const centerDisplayX = CROP_SIZE / 2;
    const centerDisplayY = CROP_SIZE / 2;

    // Top-left of image relative to container center:
    const imgLeft = centerDisplayX - displayedWidth / 2 + pan.x;
    const imgTop = centerDisplayY - displayedHeight / 2 + pan.y;

    // Ratio from displayed px to output canvas px:
    const displayToCanvas = OUTPUT_SIZE / CROP_SIZE;

    // Clear canvas
    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Draw image onto canvas transformed:
    ctx.save();
    ctx.drawImage(
      img,
      imgLeft * displayToCanvas,
      imgTop * displayToCanvas,
      displayedWidth * displayToCanvas,
      displayedHeight * displayToCanvas
    );
    ctx.restore();

    try {
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      await onSave(croppedDataUrl);
    } catch (err) {
      console.error('Failed to export cropped photo', err);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-crop-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-[8px] border border-zinc-200 shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
          <div>
            <h3 id="photo-crop-title" className="text-sm font-semibold text-zinc-900">
              Crop Profile Photo
            </h3>
            <p className="text-[11px] text-zinc-500">
              Drag to reposition, use zoom to adjust
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close crop modal"
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop Viewport */}
        <div className="p-5 flex flex-col items-center bg-zinc-950/5">
          <div
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            className={`relative overflow-hidden select-none bg-zinc-900 rounded-full shadow-inner cursor-grab active:cursor-grabbing border-2 border-white ring-1 ring-zinc-300 ${
              isDragging ? 'cursor-grabbing' : ''
            }`}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={() => setImageLoaded(true)}
              draggable={false}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                maxWidth: 'none',
                maxHeight: 'none',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none',
              }}
            />

            {/* Subtle grid guide */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>
          </div>

          <span className="text-[11px] text-zinc-400 mt-2">
            Circle indicates how your photo will appear
          </span>
        </div>

        {/* Zoom & Positioning Controls */}
        <div className="px-5 py-3 border-t border-zinc-100 bg-white space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span className="font-medium text-[11px]">Zoom</span>
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 cursor-pointer"
              title="Reset position and zoom"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(1, +(prev - 0.15).toFixed(2)))}
              disabled={zoom <= 1}
              aria-label="Zoom out"
              className="p-1 text-zinc-500 hover:text-zinc-800 disabled:opacity-30 rounded cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              aria-label="Photo zoom slider"
              className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
            />

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3, +(prev + 0.15).toFixed(2)))}
              disabled={zoom >= 3}
              aria-label="Zoom in"
              className="p-1 text-zinc-500 hover:text-zinc-800 disabled:opacity-30 rounded cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
          <button
            type="button"
            id="btn-cancel-crop"
            onClick={onClose}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-[4px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-save-cropped-photo"
            onClick={handleCropAndSave}
            disabled={isSaving || !imageLoaded}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-[4px] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
