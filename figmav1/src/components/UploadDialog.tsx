import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, XCircle, Upload } from 'lucide-react';
import { transactionAPI, templateAPI } from '../utils/api';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string;
  householdId: string;
  isPersonalView: boolean;
  onUploadComplete: () => void;
}

export function UploadDialog({ 
  open, 
  onOpenChange, 
  accessToken, 
  householdId, 
  isPersonalView,
  onUploadComplete 
}: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'select' | 'map' | 'result'>('select');
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    date: '',
    description: '',
    withdrawal: '',
    deposit: '',
  });
  const [skipRows, setSkipRows] = useState('1');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      const data = await templateAPI.getAll(accessToken);
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    try {
      // Parse first line to get column headers
      const text = await selectedFile.text();
      const lines = text.split('\n');
      const headerLine = lines[parseInt(skipRows) - 1] || lines[0];
      
      // Handle both CSV and TSV (tab-separated for Excel exports)
      const delimiter = headerLine.includes('\t') ? '\t' : ',';
      const cols = headerLine.split(delimiter).map(col => col.trim().replace(/^"|"$/g, ''));
      
      setColumns(cols);
      setStep('map');
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Failed to parse file. Please ensure it is a valid CSV or Excel file.');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMapping(template.mapping);
      setSkipRows(String(template.skipRows));
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const uploadResult = await transactionAPI.upload(
        file,
        householdId,
        isPersonalView,
        mapping,
        parseInt(skipRows),
        accessToken
      );

      setResult(uploadResult);
      setStep('result');
      onUploadComplete();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName) {
      alert('Please enter a template name');
      return;
    }

    try {
      await templateAPI.create(templateName, mapping, parseInt(skipRows), accessToken);
      alert('Template saved successfully');
      loadTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    }
  };

  const handleClose = () => {
    setFile(null);
    setStep('select');
    setColumns([]);
    setMapping({ date: '', description: '', withdrawal: '', deposit: '' });
    setSkipRows('1');
    setSelectedTemplate('');
    setTemplateName('');
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#3d5a80] border-[#577189] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Bank Statement</DialogTitle>
          <DialogDescription className="text-[#c1d3e0]">
            Import transactions from CSV or Excel files
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            {templates.length > 0 && (
              <div className="space-y-2">
                <label className="text-[#c1d3e0]">Use Saved Template</label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189]">
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Skip Header Rows</label>
              <Input
                type="number"
                value={skipRows}
                onChange={(e) => setSkipRows(e.target.value)}
                className="bg-[#34495e] border-[#577189] text-white"
                min="0"
              />
              <p className="text-xs text-[#a7b8c5]">
                Number of rows to skip from the top (usually 1 for header row)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Select CSV or Excel File</label>
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
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <Alert className="bg-[#69d2bb]/10 border-[#69d2bb]/50">
              <AlertDescription className="text-[#69d2bb]">
                Map your CSV columns to BudgetBubble fields. The system will use these mappings to import your transactions.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-[#c1d3e0]">Date Column</label>
                <Select value={mapping.date} onValueChange={(value) => setMapping({ ...mapping, date: value })}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189]">
                    {columns.map((col, idx) => (
                      <SelectItem key={idx} value={String(idx)}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[#c1d3e0]">Description Column</label>
                <Select value={mapping.description} onValueChange={(value) => setMapping({ ...mapping, description: value })}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189]">
                    {columns.map((col, idx) => (
                      <SelectItem key={idx} value={String(idx)}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[#c1d3e0]">Withdrawal/Debit Amount Column</label>
                <Select value={mapping.withdrawal} onValueChange={(value) => setMapping({ ...mapping, withdrawal: value })}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189]">
                    {columns.map((col, idx) => (
                      <SelectItem key={idx} value={String(idx)}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[#c1d3e0]">Deposit/Credit Amount Column</label>
                <Select value={mapping.deposit} onValueChange={(value) => setMapping({ ...mapping, deposit: value })}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189]">
                    {columns.map((col, idx) => (
                      <SelectItem key={idx} value={String(idx)}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-[#577189] pt-4 space-y-3">
              <label className="text-[#c1d3e0]">Save this mapping as a template (optional)</label>
              <div className="flex gap-2">
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name (e.g., Chase Bank)"
                  className="bg-[#34495e] border-[#577189] text-white"
                />
                <Button
                  onClick={handleSaveTemplate}
                  variant="outline"
                  className="bg-[#34495e] border-[#577189] hover:bg-[#3d5a80]"
                >
                  Save
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setStep('select')}
                variant="outline"
                className="flex-1 bg-[#34495e] border-[#577189] hover:bg-[#3d5a80]"
              >
                Back
              </Button>
              <Button
                onClick={handleUpload}
                className="flex-1 bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
                disabled={!mapping.date || !mapping.description || loading}
              >
                {loading ? 'Uploading...' : 'Upload & Process'}
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-[#69d2bb]/20 border border-[#69d2bb]/50 rounded">
              <CheckCircle2 className="text-[#69d2bb]" size={24} />
              <div>
                <h4 className="text-[#69d2bb]">Import Complete</h4>
                <p className="text-white">
                  Successfully imported {result.successCount} transactions.
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
                  {result.failedRows.map((row: any, idx: number) => (
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
