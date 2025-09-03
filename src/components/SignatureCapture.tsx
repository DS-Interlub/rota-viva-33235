import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PenTool, RotateCcw, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SignatureCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onSignatureChange: (signatureUrl: string) => void;
  currentSignature: string;
  routeId: string;
  stopId: string;
}

export default function SignatureCapture({ 
  isOpen, 
  onClose, 
  onSignatureChange, 
  currentSignature, 
  routeId, 
  stopId 
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = 200;
        
        // Set drawing styles
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        // Clear canvas
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // If there's an existing signature, try to load it
        if (currentSignature) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setHasSignature(true);
          };
          img.src = currentSignature;
        }
      }
    }
  }, [isOpen, currentSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      toast({
        title: "Erro",
        description: "Por favor, desenhe uma assinatura antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });

      const fileName = `${routeId}/${stopId}/signature-${Date.now()}.png`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);

      onSignatureChange(urlData.publicUrl);

      toast({
        title: "Sucesso",
        description: "Assinatura salva com sucesso!",
      });

      onClose();
    } catch (error) {
      console.error('Erro ao salvar assinatura:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a assinatura.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeSignature = async () => {
    if (!currentSignature) return;

    try {
      // Extract file path from URL
      const urlParts = currentSignature.split('/');
      const fileName = urlParts.slice(-3).join('/'); // Get route/stop/filename.ext
      
      // Delete from storage
      const { error } = await supabase.storage
        .from('signatures')
        .remove([fileName]);

      if (error) throw error;

      onSignatureChange('');
      clearSignature();

      toast({
        title: "Sucesso",
        description: "Assinatura removida com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao remover assinatura:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a assinatura.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Coletar Assinatura</DialogTitle>
          <DialogDescription>
            Desenhe a assinatura do responsável pela entrega
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <canvas
              ref={canvasRef}
              className="w-full h-48 border-2 border-dashed border-gray-300 cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Desenhe a assinatura usando o mouse ou toque na tela
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={clearSignature}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpar
            </Button>
            
            {currentSignature && (
              <Button 
                variant="destructive" 
                onClick={removeSignature}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover Atual
              </Button>
            )}
            
            <Button 
              onClick={saveSignature}
              disabled={!hasSignature || uploading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {uploading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>

          {currentSignature && (
            <div className="text-center">
              <p className="text-sm text-green-600 mb-2">Assinatura atual:</p>
              <img 
                src={currentSignature} 
                alt="Assinatura atual" 
                className="max-h-20 mx-auto border rounded"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}