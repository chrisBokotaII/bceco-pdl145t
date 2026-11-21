import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenTool } from 'lucide-react';

interface SignaturePadProps {
  value: string;
  agentName: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  agentName,
  onChange,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (value && value.startsWith('data:image/')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    }
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const pt = getPoint(e);
    ctx.strokeStyle = '#0F2544';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!drawing || disabled) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    onChange('');
  };

  const handleCertifySignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(24, 108);
    ctx.lineTo(496, 108);
    ctx.stroke();
    ctx.fillStyle = '#0F2544';
    ctx.font = 'italic 26px Georgia, serif';
    ctx.fillText(agentName || 'Agent Enquêteur Terrain', 32, 82);
    ctx.fillStyle = '#475569';
    ctx.font = '12px monospace';
    ctx.fillText(`Signé électroniquement le ${new Date().toLocaleDateString('fr-FR')}`, 32, 128);
    onChange(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-2">
      <div className="border border-slate-300 rounded-md overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={520}
          height={150}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full h-36 touch-none block ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-crosshair'}`}
        />
      </div>
      {!disabled && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500">
            Tracez votre signature au doigt ou à la souris dans le cadre ci-dessus.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCertifySignature}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
            >
              <PenTool className="w-3.5 h-3.5" />
              Apposer signature certifiée
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
            >
              <Eraser className="w-3.5 h-3.5" />
              Effacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
