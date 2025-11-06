import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, XCircle, Upload } from 'lucide-react';
import { transactionAPI } from '../utils/api';
import { projectId } from '../utils/supabase/info';

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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setShowResult(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('householdId', householdId);
      formData.append('personalView', String(isPersonalView));
      formData.append('type', type);
      formData.append('autoDetectHeaders', 'true');
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
      setShowResult(true);
      
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

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setShowResult(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#3d5a80] border-[#577189] text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Upload {type === 'transactions' ? 'Transactions' : 'Holdings'}
          </DialogTitle>
          <DialogDescription className="text-[#c1d3e0]">
            Auto-detects columns from CSV or Excel files
          </DialogDescription>
        </DialogHeader>

        {!showResult ? (
          <div className="space-y-4">
            <Alert className="bg-[#69d2bb]/10 border-[#69d2bb]/50">
              <AlertDescription className="text-[#69d2bb]">
                Simply upload your file - we'll automatically detect the columns and import your data.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Select File</label>
              <Input
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileSelect}
                className="bg-[#34495e] border-[#577189] text-white"
              />
              <p className="text-xs text-[#a7b8c5]">
                Supports CSV, XLS, and XLSX formats
              </p>
            </div>

            {file && (
              <div className="p-3 bg-[#34495e] rounded border border-[#577189]">
                <div className="flex items-center gap-2">
                  <Upload size={16} className="text-[#69d2bb]" />
                  <span className="text-[#c1d3e0]">{file.name}</span>
                  <span className="text-xs text-[#a7b8c5]">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 bg-[#34495e] border-[#577189] hover:bg-[#3d5a80]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                className="flex-1 bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
                disabled={!file || loading}
              >
                {loading ? 'Processing...' : 'Upload & Import'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
              onClick={handleClose}
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
