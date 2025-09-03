import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Upload, X, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PhotoCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotosChange: (photos: string[]) => void;
  currentPhotos: string[];
  routeId: string;
  stopId: string;
}

export default function PhotoCapture({ 
  isOpen, 
  onClose, 
  onPhotosChange, 
  currentPhotos, 
  routeId, 
  stopId 
}: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newPhotos = [...currentPhotos];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Erro",
            description: "Por favor, selecione apenas arquivos de imagem.",
            variant: "destructive",
          });
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Erro",
            description: "A imagem deve ter no máximo 5MB.",
            variant: "destructive",
          });
          continue;
        }

        const fileName = `${routeId}/${stopId}/${Date.now()}-${i}.${file.name.split('.').pop()}`;

        const { data, error } = await supabase.storage
          .from('delivery-photos')
          .upload(fileName, file);

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('delivery-photos')
          .getPublicUrl(fileName);

        newPhotos.push(urlData.publicUrl);
      }

      onPhotosChange(newPhotos);
      toast({
        title: "Sucesso",
        description: `${files.length} foto(s) adicionada(s) com sucesso!`,
      });
    } catch (error) {
      console.error('Erro ao fazer upload das fotos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload das fotos.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (photoUrl: string, index: number) => {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/');
      const fileName = urlParts.slice(-3).join('/'); // Get route/stop/filename.ext
      
      // Delete from storage
      const { error } = await supabase.storage
        .from('delivery-photos')
        .remove([fileName]);

      if (error) throw error;

      // Remove from array
      const updatedPhotos = currentPhotos.filter((_, i) => i !== index);
      onPhotosChange(updatedPhotos);

      toast({
        title: "Sucesso",
        description: "Foto removida com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a foto.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fotos da Entrega</DialogTitle>
          <DialogDescription>
            Adicione fotos para documentar a entrega
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={uploading}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Enviando...' : 'Selecionar Fotos'}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Photo grid */}
          {currentPhotos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {currentPhotos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(photo, index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {currentPhotos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Image className="h-12 w-12 mb-2" />
              <p>Nenhuma foto adicionada</p>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p>• Máximo 5MB por foto</p>
            <p>• Formatos aceitos: JPG, PNG, WebP</p>
          </div>
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