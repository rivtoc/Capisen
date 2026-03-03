import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Minus, Plus, X, Check } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Exporter en carré 512×512 max
  const size = Math.min(pixelCrop.width, pixelCrop.height, 512);
  canvas.width = size;
  canvas.height = size;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.92);
  });
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface AvatarCropModalProps {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

const AvatarCropModal = ({ imageSrc, onConfirm, onCancel }: AvatarCropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [confirming, setConfirming] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setConfirming(true);
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
    onConfirm(blob);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Recadrer la photo</h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Zone de crop */}
        <div className="relative bg-black" style={{ height: 320 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle: { border: "2px solid rgba(255,255,255,0.8)" },
            }}
          />
        </div>

        {/* Zoom */}
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs text-muted-foreground mb-2.5">Zoom</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Minus size={14} />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-foreground h-1 cursor-pointer"
            />
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-border text-foreground rounded-xl hover:bg-muted/40 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-foreground text-background rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {confirming ? (
              <span className="w-3.5 h-3.5 border-2 border-background/40 border-t-background rounded-full animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropModal;
