import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileText, Download, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ImportExcelProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  type: 'customers' | 'drivers' | 'vehicles';
}

export default function ImportExcel({ isOpen, onClose, onImportComplete, type }: ImportExcelProps) {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{success: number, errors: string[]}>({success: 0, errors: []});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const templates = {
    customers: {
      headers: ['Nome do Cliente', 'Endereço', 'Cidade', 'Estado', 'CEP', 'Telefone', 'E-mail', 'É transportadora'],
      example: ['Cliente Exemplo', 'Rua Exemplo, 123', 'São Paulo', 'SP', '01234-567', '(11) 98765-4321', 'cliente@exemplo.com', 'N'],
      dbMapping: {
        'Nome do Cliente': 'name',
        'Endereço': 'address',
        'Cidade': 'city',
        'Estado': 'state',
        'CEP': 'zip_code',
        'Telefone': 'phone',
        'E-mail': 'email',
        'É transportadora': 'is_transporter'
      }
    },
    drivers: {
      headers: ['Nome', 'E-mail', 'Telefone', 'CNH'],
      example: ['João Silva', 'joao@email.com', '(11) 98765-4321', '12345678901'],
      dbMapping: {
        'Nome': 'name',
        'E-mail': 'email',
        'Telefone': 'phone',
        'CNH': 'license_number'
      }
    },
    vehicles: {
      headers: ['Placa', 'Marca', 'Modelo', 'Ano', 'KM Atual'],
      example: ['ABC-1234', 'Ford', 'Transit', '2020', '50000'],
      dbMapping: {
        'Placa': 'plate',
        'Marca': 'brand',
        'Modelo': 'model',
        'Ano': 'year',
        'KM Atual': 'km_current'
      }
    }
  };

  const downloadTemplate = () => {
    const template = templates[type];
    const wb = XLSX.utils.book_new();
    const wsData = [template.headers, template.example];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, getTypeName());
    XLSX.writeFile(wb, `modelo_${getTypeName().toLowerCase()}.xlsx`);
  };

  const parseCSV = (text: string): string[][] => {
    const linesRaw = text.split(/\r?\n/).filter(line => line.trim());
    if (linesRaw.length === 0) return [];

    // Detect delimiter based on header line (Excel PT-BR often uses ';')
    const headerLine = linesRaw[0];
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    return linesRaw.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          // Handle escaped quotes within quoted fields
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; continue; }
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result;
    });
  };

  const validateData = (data: string[][], headers: string[], dbMapping: any): {valid: any[], errors: string[]} => {
    const valid = [];
    const errors = [];
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length !== headers.length) {
        errors.push(`Linha ${i + 1}: Número incorreto de colunas (esperado: ${headers.length}, encontrado: ${row.length})`);
        continue;
      }

      const item: any = {};
      let hasError = false;

      for (let j = 0; j < headers.length; j++) {
        const displayHeader = headers[j];
        const dbField = dbMapping[displayHeader];
        const value = row[j]?.trim();

        // Validações específicas por campo do banco
        if (dbField === 'name' || dbField === 'address' || dbField === 'plate') {
          if (!value) {
            errors.push(`Linha ${i + 1}: ${displayHeader} é obrigatório`);
            hasError = true;
          } else {
            item[dbField] = value;
          }
        } else if (dbField === 'email') {
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push(`Linha ${i + 1}: E-mail inválido`);
            hasError = true;
          } else {
            item[dbField] = value || null;
          }
        } else if (dbField === 'year' || dbField === 'km_current') {
          if (value) {
            const num = parseInt(value);
            if (isNaN(num)) {
              errors.push(`Linha ${i + 1}: ${displayHeader} deve ser um número`);
              hasError = true;
            } else {
              item[dbField] = num;
            }
          } else {
            item[dbField] = dbField === 'km_current' ? 0 : null;
          }
        } else if (dbField === 'is_transporter') {
          item[dbField] = value.toUpperCase() === 'S' || value.toLowerCase() === 'sim' || value === '1' || value.toLowerCase() === 'true';
        } else {
          item[dbField] = value || null;
        }
      }

      if (!hasError) {
        valid.push(item);
      }
    }

    return { valid, errors };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'csv' && ext !== 'xlsx') {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo Excel (.xlsx) ou CSV.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setResults({success: 0, errors: []});

    try {
      let data: any[][] = [];
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'xlsx') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        data = aoa.map(row => row.map(cell => (cell === undefined || cell === null) ? '' : String(cell)));
      } else {
        const text = await file.text();
        data = parseCSV(text);
      }
      
      if (data.length < 2) {
        throw new Error('Arquivo vazio ou só contém cabeçalho');
      }

      const template = templates[type];
      const { valid, errors } = validateData(data, template.headers, template.dbMapping);

      if (valid.length === 0) {
        setResults({success: 0, errors});
        return;
      }

      // Insert valid records
      let successCount = 0;
      const insertErrors = [...errors];

      for (const item of valid) {
        try {
          const { error } = await supabase
            .from(type)
            .insert([item]);

          if (error) throw error;
          successCount++;
        } catch (error: any) {
          insertErrors.push(`Erro ao inserir ${item.name || item.plate}: ${error.message}`);
        }
      }

      setResults({success: successCount, errors: insertErrors});

      if (successCount > 0) {
        toast({
          title: "Importação concluída",
          description: `${successCount} registro(s) importado(s) com sucesso!`,
        });
        onImportComplete();
      }

    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getTypeName = () => {
    switch (type) {
      case 'customers': return 'Clientes';
      case 'drivers': return 'Motoristas';
      case 'vehicles': return 'Veículos';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar {getTypeName()}</DialogTitle>
          <DialogDescription>
            Importe múltiplos registros usando um arquivo CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template download */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">1. Baixe o modelo</h4>
            <p className="text-sm text-blue-700 mb-3">
              Use nosso modelo para garantir a formatação correta
            </p>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar modelo Excel
            </Button>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <h4 className="font-medium">2. Selecione o arquivo</h4>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar seu arquivo Excel (.xlsx) ou CSV
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Processando...' : 'Selecionar Arquivo'}
                </Button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Results */}
          {(results.success > 0 || results.errors.length > 0) && (
            <div className="space-y-3">
              <h4 className="font-medium">Resultado da Importação</h4>
              
              {results.success > 0 && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-green-800 text-sm">
                    ✅ {results.success} registro(s) importado(s) com sucesso
                  </p>
                </div>
              )}

              {results.errors.length > 0 && (
                <div className="bg-red-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-red-800 text-sm font-medium">
                        {results.errors.length} erro(s) encontrado(s):
                      </p>
                      {results.errors.map((error, index) => (
                        <p key={index} className="text-red-700 text-xs">
                          • {error}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Instruções:</strong>
            </p>
            <ul className="text-xs text-gray-600 mt-1 space-y-1">
              <li>• Use o modelo fornecido para garantir a formatação correta</li>
              <li>• Campos obrigatórios devem ser preenchidos</li>
              <li>• Prefira a planilha Excel modelo; se usar CSV, verifique o delimitador (vírgula ou ponto e vírgula)</li>
              <li>• Para textos com vírgula, coloque entre aspas</li>
            </ul>
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