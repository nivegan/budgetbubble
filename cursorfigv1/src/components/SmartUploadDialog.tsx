import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, XCircle, Upload, ArrowRight, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { projectId } from '../utils/supabase/info';

// Simple CSV parser
function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    // Basic CSV parsing, handles commas inside quotes
    const cells = [];
    let inQuote = false;
    let cell = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    cells.push(cell.trim());
    return cells;
  });
}

interface SmartUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  householdId: string;
  isPersonalView: boolean;
  accessToken: string;
  type: 'transactions' | 'holdings';
}

export function SmartUploadDialog({
  open,
  onClose,
  onSuccess,
  householdId,
  isPersonalView,
  accessToken,
  type,
}: SmartUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Result
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Column mapping state
  const [mapping, setMapping] = useState<any>({});
  
  const transactionFields = [
    { key: 'date', label: 'Date', required: true },
    { key: 'description', label: 'Description', required: true },
    { key: 'withdrawal', label: 'Withdrawal', required: false },
    { key: 'deposit', label: 'Deposit', required: false },
  ];
  
  const holdingFields = [
    { key: 'name', label: 'Name/Symbol', required: true },
    { key: 'quantity', label: 'Quantity', required: true },
    { key: 'avgPrice', label: 'Average Price', required: true },
    { key: 'ltp', label: 'Current Price (LTP)', required: false },
    { key: 'type', label: 'Type (e.g., stock)', required: false },
  ];
  
  const fieldsToMap = type === 'transactions' ? transactionFields : holdingFields;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);
      setFileContent(rows);

      // Find header row (simple heuristic: first row with > 2 non-empty cells)
      let headerRowIndex = rows.findIndex(row => row.filter(cell => cell).length > 2);
      if (headerRowIndex === -1) headerRowIndex = 0;
      
      const fileHeaders = rows[headerRowIndex].map((h, i) => h.trim() || `Column ${i + 1}`);
      const filePreview = rows.slice(headerRowIndex + 1, headerRowIndex + 6);
      
      setHeaders(fileHeaders);
      setPreview(filePreview);

      // Auto-detect mapping
      const newMapping: any = {};
      const lowerCaseHeaders = fileHeaders.map(h => h.toLowerCase());

      for (const field of fieldsToMap) {
        let found = '';
        if (type === 'transactions') {
          if (field.key === 'date') found = fileHeaders[lowerCaseHeaders.findIndex(h => h.includes('date') && !h.includes('value'))] || fileHeaders[lowerCaseHeaders.findIndex(h => h.includes('date'))];
          if (field.key === 'description') found = fileHeaders[lowerCaseHeaders.findIndex(h => h.includes('remark') || h.includes('description'))];
          if (field.key === 'withdrawal') found = fileHeaders[lowerCaseHeaders.findIndex(h => h.includes('withdrawal') || h.includes('debit'))];
          if (field.key === 'deposit') found = fileHeaders[lowerCaseHeaders.findIndex(h => h.includes('deposit') || h.includes('credit'))];
        } else {
          if (field.key === 'name') found = fileHeaders[lowerCaseHeaders.findIndex(h => h.includes('symbol') || h.includes('name') || h.includes('scrip'))];
          if (field.key === 'quantity') found = fileHeaders[lowerCaseHeaders.findIndex(h => h.includes('quantity') || h.includes('qty'))];
          if (field.key === 'avgPrice') found = fileHeaders[lowerCaseHeaders.findIndex(h => h.includes('avg') && h.includes('price'))];
          if (field.key === 'ltp') found = fileHeaders[lowerCaseHeaders.findIndex(h => h.includes('ltp') || h.includes('current') || h.includes('closing'))];
          if (field.key === 'type') found = fileHeaders[lowerCaseHeaders.findIndex(h => h.includes('type') || h.includes('instrument'))];
        }
        if (found) {
          newMapping[field.key] = found;
        }
      }
      
      setMapping(newMapping);
      setStep(2); // Move to mapping step
    } catch (error) {
      console.error('File read error:', error);
      alert('Failed to read file. Please ensure it is a valid CSV file.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    // Validate mapping
    for (const field of fieldsToMap) {
      if (field.required && !mapping[field.key]) {
        alert(`Please map the required field: ${field.label}`);
        return;
      }
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('householdId', householdId);
      formData.append('personalView', String(isPersonalView));
      formData.append('type', type);
      formData.append('mapping', JSON.stringify(mapping)); // Send the user's mapping
      formData.append('autoDetectHeaders', 'false'); // We are providing the mapping
      formData.append('dedupe', 'true');

      const endpoint = type === 'transactions' 
        ? '/transactions/smart-upload' 
        : '/holdings/upload';

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ecf79a0e${endpoint}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setResult(data);
      setStep(3); // Move to result step
      
      if (data.successCount > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setFileContent([]);
    setHeaders([]);
    setPreview([]);
    setMapping({});
    setResult(null);
    setLoading(false);
    setStep(1);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetDialog}>
      <DialogContent className="bg-[#3d5a80] border-[#577189] text-white max-w-4xl">
        
        {/* Step 1: Upload */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Upload {type === 'transactions' ? 'Transactions' : 'Holdings'}</DialogTitle>
              <DialogDescription className="text-[#c1d3e0]">Step 1 of 2: Select a CSV or XLS file</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert className="bg-[#69d2bb]/10 border-[#69d2bb]/50">
                <AlertDescription className="text-[#69d2bb]">
                  We will help you map the columns from your file in the next step.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <label className="text-[#c1d3e0]">Select File</label>
                <Input
                  type="file"
                  accept=".csv,.xls,.xlsx" // Still accept XLS, but parsing works best for CSV
                  onChange={handleFileSelect}
                  className="bg-[#34495e] border-[#577189] text-white"
                  disabled={loading}
                />
                <p className="text-xs text-[#a7b8c5]">
                  Supports CSV, XLS, and XLSX (beta) formats
                </p>
              </div>
              {loading && <div className="text-center text-slate-300">Processing file...</div>}
            </div>
          </>
        )}

        {/* Step 2: Map Columns */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Map Columns</DialogTitle>
              <DialogDescription className="text-[#c1d3e0]">Step 2 of 2: Match your file's columns to our fields.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fieldsToMap.map(field => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-[#c1d3e0]">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <Select 
                      value={mapping[field.key] || ''} 
                      onValueChange={(value) => setMapping((prev: any) => ({ ...prev, [field.key]: value }))}
                    >
                      <SelectTrigger className="bg-[#34495e] border-[#577189] text-white">
                        <SelectValue placeholder="Select a column..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#34495e] border-[#577189]">
                        <SelectItem value="">-- Skip --</SelectItem>
                        {headers.map((header, idx) => (
                          <SelectItem key={idx} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <h4 className="text-slate-300 pt-4">Data Preview</h4>
              <div className="overflow-x-auto max-h-60 border border-slate-700 rounded">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      {headers.map((h, i) => (
                        <TableHead key={i} className="text-slate-300">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i} className="border-slate-700">
                        {row.map((cell, j) => (
                          <TableCell key={j} className="text-slate-400 whitespace-nowrap">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="bg-[#34495e] border-[#577189] hover:bg-[#3d5a80]">Back</Button>
                <Button onClick={handleUpload} className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]" disabled={loading}>
                  {loading ? 'Processing...' : 'Upload & Import'} <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-4 bg-[#69d2bb]/20 border border-[#69d2bb]/50 rounded">
              <CheckCircle2 className="text-[#69d2bb]" size={24} />
              <div>
                <h4 className="text-[#69d2bb]">Import Complete</h4>
                <p className="text-white">
                  Successfully imported {result.successCount} {type}.
                </p>
              </div>
            </div>

            {result.failureCount > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#ee8b88]">
                  <XCircle size={20} />
                  <span>{result.failureCount} rows could not be processed</span>
                </div>
                <div className="max-h-60 overflow-y-auto bg-[#2c3e50] rounded p-3 space-y-2 border border-[#577189]">
                  {result.failedRows?.map((row: any, idx: number) => (
                    <div key={idx} className="text-sm border-l-2 border-[#ee6c4d] pl-3">
                      <div className="text-[#ee8b88]">Line {row.lineNumber}: {row.reason}</div>
                      <div className="text-[#a7b8c5] font-mono text-xs mt-1 truncate">
                        {row.rawLine}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={resetDialog}
              className="w-full bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
            >
              Done
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}