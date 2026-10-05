import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);
  const maxPanRef = useRef({ x: 0, y: 0 });

  // Calculate base dimensions ensuring image completely covers the CROP_SIZE circle
  const { baseWidth, baseHeight } = useMemo(() => {
    if (!naturalDimensions || naturalDimensions.width === 0 || naturalDimensions.height === 0) {
      return { baseWidth: CROP_SIZE, baseHeight: CROP_SIZE };
    }
    const { width, height } = naturalDimensions;
    // Scale factor so that image covers the entire CROP_SIZE square:
    const scale = Math.max(CROP_SIZE / width, CROP_SIZE / height);
    return {
      baseWidth: width * scale,
      baseHeight: height * scale,
    };
  }, [naturalDimensions]);

  // Scaled dimensions at current zoom
  const displayedWidth = baseWidth * zoom;
  const displayedHeight = baseHeight * zoom;

  // Maximum allowed pan so image edges NEVER cross inside the crop circle:
  const maxPanX = Math.max(0, (displayedWidth - CROP_SIZE) / 2);
  const maxPanY = Math.max(0, (displayedHeight - CROP_SIZE) / 2);

  // Keep ref updated for smooth, event-listener-free drag tracking
  maxPanRef.current = { x: maxPanX, y: maxPanY };

  // Clamped pan values
  const clampedX = Math.min(maxPanX, Math.max(-maxPanX, pan.x));
  const clampedY = Math.min(maxPanY, Math.max(-maxPanY, pan.y));

  // Image top-left in viewport coordinate space (0 to CROP_SIZE)
  const imgLeft = Math.round(CROP_SIZE / 2 - displayedWidth / 2 + clampedX);
  const imgTop = Math.round(CROP_SIZE / 2 - displayedHeight / 2 + clampedY);

  // Reset zoom, pan, and dimensions when a new image is loaded or modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setImageLoaded(false);
      setNaturalDimensions(null);
    }
  }, [isOpen, imageSrc]);

  // Read natural dimensions if image is already cached/complete
  useEffect(() => {
    if (isOpen && imageRef.current?.complete && imageRef.current.naturalWidth) {
      setNaturalDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
      setImageLoaded(true);
    }
  }, [isOpen, imageSrc]);

  // Keep pan strictly inside boundaries whenever zoom decreases
  useEffect(() => {
    setPan((prev) => {
      const clampedPrevX = Math.min(maxPanX, Math.max(-maxPanX, prev.x));
      const clampedPrevY = Math.min(maxPanY, Math.max(-maxPanY, prev.y));
      if (clampedPrevX !== prev.x || clampedPrevY !== prev.y) {
        return { x: clampedPrevX, y: clampedPrevY };
      }
      return prev;
    });
  }, [maxPanX, maxPanY]);

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

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: clampedX,
      initialPanY: clampedY,
    };
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const targetX = dragRef.current.initialPanX + dx;
    const targetY = dragRef.current.initialPanY + dy;
    const maxX = maxPanRef.current.x;
    const maxY = maxPanRef.current.y;

    setPan({
      x: Math.min(maxX, Math.max(-maxX, targetX)),
      y: Math.min(maxY, Math.max(-maxY, targetY)),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.isDragging = false;
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

  // Touch handlers with pinch-to-zoom support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragRef.current = {
        isDragging: true,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialPanX: clampedX,
        initialPanY: clampedY,
      };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      dragRef.current.isDragging = false;
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && dragRef.current.isDragging) {
      const dx = e.touches[0].clientX - dragRef.current.startX;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      const targetX = dragRef.current.initialPanX + dx;
      const targetY = dragRef.current.initialPanY + dy;
      const maxX = maxPanRef.current.x;
      const maxY = maxPanRef.current.y;

      setPan({
        x: Math.min(maxX, Math.max(-maxX, targetX)),
        y: Math.min(maxY, Math.max(-maxY, targetY)),
      });
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / touchStartDistRef.current;
      const newZoom = Math.min(3, Math.max(1, +(touchStartZoomRef.current * scaleFactor).toFixed(2)));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    dragRef.current.isDragging = false;
    touchStartDistRef.current = null;
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

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setNaturalDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setImageLoaded(true);
    }
  };

  const handleCropAndSave = async () => {
    if (!imageRef.current || !naturalDimensions) return;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High quality smoothing for clear profile pictures
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Ratio from displayed px to output canvas px
    const displayToCanvas = OUTPUT_SIZE / CROP_SIZE;

    // Clear canvas
    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Draw the image onto the canvas exactly as positioned in the viewport
    ctx.drawImage(
      img,
      imgLeft * displayToCanvas,
      imgTop * displayToCanvas,
      displayedWidth * displayToCanvas,
      displayedHeight * displayToCanvas
    );

    try {
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
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
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                position: 'absolute',
                left: `${imgLeft}px`,
                top: `${imgTop}px`,
                width: `${displayedWidth}px`,
                height: `${displayedHeight}px`,
                maxWidth: 'none',
                maxHeight: 'none',
                pointerEvents: 'none',
                userSelect: 'none',
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
              disabled={zoom <= 1.01}
              aria-label="Zoom out"
              className="p-1 text-zinc-500 hover:text-zinc-800 disabled:opacity-30 rounded cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              aria-label="Photo zoom slider"
              className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
            />

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3, +(prev + 0.15).toFixed(2)))}
              disabled={zoom >= 2.99}
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
