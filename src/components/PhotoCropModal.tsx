import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';
import { SpecularButton } from './ui/SpecularButton';

interface PhotoCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => Promise<void> | void;
  isSaving?: boolean;
}

const CROP_SIZE = 260; // Size of the circular crop viewport in px
const OUTPUT_SIZE = 400; // Output square image resolution
const COVER_PADDING = 24; // Extra padding ensuring the image always covers circle with safety cushion

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
  const [isSnapping, setIsSnapping] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ x: 0, y: 0 });
  panRef.current = pan;

  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);
  const snapTimeoutRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Calculate base dimensions ensuring image covers the circle with a smooth elastic safety cushion
  const { baseWidth, baseHeight } = useMemo(() => {
    if (!naturalDimensions || naturalDimensions.width === 0 || naturalDimensions.height === 0) {
      return { baseWidth: CROP_SIZE + COVER_PADDING, baseHeight: CROP_SIZE + COVER_PADDING };
    }
    const { width, height } = naturalDimensions;
    // Scale factor so that image covers the entire CROP_SIZE square with a soft edge cushion:
    const scale = Math.max((CROP_SIZE + COVER_PADDING) / width, (CROP_SIZE + COVER_PADDING) / height);
    return {
      baseWidth: width * scale,
      baseHeight: height * scale,
    };
  }, [naturalDimensions]);

  // Scaled dimensions at current zoom
  const displayedWidth = baseWidth * zoom;
  const displayedHeight = baseHeight * zoom;

  // Absolute hard limit where an edge could ever reach the circle viewport:
  const absoluteMaxX = Math.max(0, (displayedWidth - CROP_SIZE) / 2);
  const absoluteMaxY = Math.max(0, (displayedHeight - CROP_SIZE) / 2);

  // Resting limits where the photo smoothly settles (leaving room for elastic cushioning at the edges)
  const cushionX = Math.min(16, Math.max(4, absoluteMaxX * 0.2));
  const cushionY = Math.min(16, Math.max(4, absoluteMaxY * 0.2));
  const restMaxX = Math.max(0, absoluteMaxX - cushionX);
  const restMaxY = Math.max(0, absoluteMaxY - cushionY);

  // Smooth rubber-band formula with zero dead-zone
  const calculateDampedPan = useCallback(
    (targetX: number, targetY: number) => {
      let x = targetX;
      let y = targetY;

      // Elastic dampening on X axis
      if (targetX > restMaxX) {
        const overflow = targetX - restMaxX;
        const room = Math.max(0, absoluteMaxX - restMaxX);
        const damped = (1 - 1 / (overflow * 0.04 + 1)) * room;
        x = restMaxX + damped;
      } else if (targetX < -restMaxX) {
        const overflow = -targetX - restMaxX;
        const room = Math.max(0, absoluteMaxX - restMaxX);
        const damped = (1 - 1 / (overflow * 0.04 + 1)) * room;
        x = -restMaxX - damped;
      }

      // Elastic dampening on Y axis
      if (targetY > restMaxY) {
        const overflow = targetY - restMaxY;
        const room = Math.max(0, absoluteMaxY - restMaxY);
        const damped = (1 - 1 / (overflow * 0.04 + 1)) * room;
        y = restMaxY + damped;
      } else if (targetY < -restMaxY) {
        const overflow = -targetY - restMaxY;
        const room = Math.max(0, absoluteMaxY - restMaxY);
        const damped = (1 - 1 / (overflow * 0.04 + 1)) * room;
        y = -restMaxY - damped;
      }

      return { x, y };
    },
    [restMaxX, restMaxY, absoluteMaxX, absoluteMaxY]
  );

  // Smooth snap-back when releasing past resting bounds
  const snapBackIfNeeded = useCallback(() => {
    const curX = panRef.current.x;
    const curY = panRef.current.y;
    const clampedX = Math.min(restMaxX, Math.max(-restMaxX, curX));
    const clampedY = Math.min(restMaxY, Math.max(-restMaxY, curY));

    if (Math.abs(clampedX - curX) > 0.5 || Math.abs(clampedY - curY) > 0.5) {
      setIsSnapping(true);
      setPan({ x: clampedX, y: clampedY });
      panRef.current = { x: clampedX, y: clampedY };
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = window.setTimeout(() => {
        setIsSnapping(false);
      }, 300);
    }
  }, [restMaxX, restMaxY]);

  // Reset zoom, pan, and dimensions when a new image is loaded or modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      panRef.current = { x: 0, y: 0 };
      setImageLoaded(false);
      setNaturalDimensions(null);
      setIsSnapping(false);
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

  // Keep pan comfortably inside boundaries whenever zoom changes
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, +newZoom.toFixed(2)));
    setZoom(clampedZoom);

    const nextDisplayedWidth = baseWidth * clampedZoom;
    const nextDisplayedHeight = baseHeight * clampedZoom;
    const nextAbsMaxX = Math.max(0, (nextDisplayedWidth - CROP_SIZE) / 2);
    const nextAbsMaxY = Math.max(0, (nextDisplayedHeight - CROP_SIZE) / 2);
    const nextCushionX = Math.min(16, Math.max(4, nextAbsMaxX * 0.2));
    const nextCushionY = Math.min(16, Math.max(4, nextAbsMaxY * 0.2));
    const nextRestMaxX = Math.max(0, nextAbsMaxX - nextCushionX);
    const nextRestMaxY = Math.max(0, nextAbsMaxY - nextCushionY);

    setPan((prev) => {
      const nextX = Math.min(nextRestMaxX, Math.max(-nextRestMaxX, prev.x));
      const nextY = Math.min(nextRestMaxY, Math.max(-nextRestMaxY, prev.y));
      panRef.current = { x: nextX, y: nextY };
      return { x: nextX, y: nextY };
    });
  };

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

  // Mouse Drag handlers with silky response and zero dead-zone
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    setIsSnapping(false);

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: panRef.current.x,
      initialPanY: panRef.current.y,
    };
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      let targetX = dragRef.current.initialPanX + dx;
      let targetY = dragRef.current.initialPanY + dy;

      // Prevent dead zone by capping overscroll distance so reversing direction responds instantly
      const maxOvershootX = 40;
      const maxOvershootY = 40;
      if (targetX > restMaxX + maxOvershootX) {
        dragRef.current.startX = e.clientX - (restMaxX + maxOvershootX - dragRef.current.initialPanX);
        targetX = restMaxX + maxOvershootX;
      } else if (targetX < -restMaxX - maxOvershootX) {
        dragRef.current.startX = e.clientX - (-restMaxX - maxOvershootX - dragRef.current.initialPanX);
        targetX = -restMaxX - maxOvershootX;
      }

      if (targetY > restMaxY + maxOvershootY) {
        dragRef.current.startY = e.clientY - (restMaxY + maxOvershootY - dragRef.current.initialPanY);
        targetY = restMaxY + maxOvershootY;
      } else if (targetY < -restMaxY - maxOvershootY) {
        dragRef.current.startY = e.clientY - (-restMaxY - maxOvershootY - dragRef.current.initialPanY);
        targetY = -restMaxY - maxOvershootY;
      }

      const nextPan = calculateDampedPan(targetX, targetY);
      panRef.current = nextPan;

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        setPan(nextPan);
      });
    },
    [calculateDampedPan, restMaxX, restMaxY]
  );

  const handleMouseUp = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    dragRef.current.isDragging = false;
    setIsDragging(false);
    snapBackIfNeeded();
  }, [snapBackIfNeeded]);

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

  // Touch handlers with smooth pinch-to-zoom and dead-zone-free panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
      setIsSnapping(false);

      dragRef.current = {
        isDragging: true,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialPanX: panRef.current.x,
        initialPanY: panRef.current.y,
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
      let targetX = dragRef.current.initialPanX + dx;
      let targetY = dragRef.current.initialPanY + dy;

      const maxOvershootX = 40;
      const maxOvershootY = 40;
      if (targetX > restMaxX + maxOvershootX) {
        dragRef.current.startX = e.touches[0].clientX - (restMaxX + maxOvershootX - dragRef.current.initialPanX);
        targetX = restMaxX + maxOvershootX;
      } else if (targetX < -restMaxX - maxOvershootX) {
        dragRef.current.startX = e.touches[0].clientX - (-restMaxX - maxOvershootX - dragRef.current.initialPanX);
        targetX = -restMaxX - maxOvershootX;
      }

      if (targetY > restMaxY + maxOvershootY) {
        dragRef.current.startY = e.touches[0].clientY - (restMaxY + maxOvershootY - dragRef.current.initialPanY);
        targetY = restMaxY + maxOvershootY;
      } else if (targetY < -restMaxY - maxOvershootY) {
        dragRef.current.startY = e.touches[0].clientY - (-restMaxY - maxOvershootY - dragRef.current.initialPanY);
        targetY = -restMaxY - maxOvershootY;
      }

      const nextPan = calculateDampedPan(targetX, targetY);
      panRef.current = nextPan;

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        setPan(nextPan);
      });
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / touchStartDistRef.current;
      handleZoomChange(touchStartZoomRef.current * scaleFactor);
    }
  };

  const handleTouchEnd = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    dragRef.current.isDragging = false;
    touchStartDistRef.current = null;
    setIsDragging(false);
    snapBackIfNeeded();
  };

  // Wheel zoom with gentle increments
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    handleZoomChange(zoom + delta);
  };

  const handleReset = () => {
    setIsSnapping(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    snapTimeoutRef.current = window.setTimeout(() => {
      setIsSnapping(false);
    }, 300);
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

    // Use clamped resting pan ensuring the output crop has zero borders
    const finalPanX = Math.min(restMaxX, Math.max(-restMaxX, panRef.current.x));
    const finalPanY = Math.min(restMaxY, Math.max(-restMaxY, panRef.current.y));

    // Centered base position + clamped pan
    const imgLeft = (CROP_SIZE - displayedWidth) / 2 + finalPanX;
    const imgTop = (CROP_SIZE - displayedHeight) / 2 + finalPanY;

    // Clear canvas
    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Draw the image onto the canvas exactly as framed in the viewport
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
              Drag to reposition smoothly, use zoom to adjust
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
        <div className="p-5 flex flex-col items-center bg-white">
          <div
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            className={`relative overflow-hidden select-none bg-white rounded-full border-4 border-white shadow-[0_2px_12px_rgba(0,0,0,0.12)] touch-none transition-shadow duration-150 ${
              isDragging ? 'cursor-grabbing shadow-[0_4px_20px_rgba(0,0,0,0.18)]' : 'cursor-grab'
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
                left: `${(CROP_SIZE - displayedWidth) / 2}px`,
                top: `${(CROP_SIZE - displayedHeight) / 2}px`,
                width: `${displayedWidth}px`,
                height: `${displayedHeight}px`,
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
                transition: isSnapping ? 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)' : 'none',
                willChange: 'transform',
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
            Circle shows how your photo will appear
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
              onClick={() => handleZoomChange(zoom - 0.15)}
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
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              aria-label="Photo zoom slider"
              className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
            >
            </input>

            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.15)}
              disabled={zoom >= 2.99}
              aria-label="Zoom in"
              className="p-1 text-zinc-500 hover:text-zinc-800 disabled:opacity-30 rounded cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-100 bg-white">
          <button
            type="button"
            id="btn-cancel-crop"
            onClick={onClose}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-[4px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <SpecularButton
            type="button"
            id="btn-save-cropped-photo"
            size="sm"
            radius={4}
            onClick={handleCropAndSave}
            disabled={isSaving || !imageLoaded}
            className="px-3.5 py-1.5 text-xs font-medium text-white flex items-center justify-center gap-1.5 shadow-xs min-w-[90px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Photo</span>
            )}
          </SpecularButton>
        </div>
      </div>
    </div>
  );
}
