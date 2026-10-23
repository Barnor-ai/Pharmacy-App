import React, { useState, useRef, useMemo } from 'react';
import { parseCSV, generateCSV, downloadCSV } from '../lib/csvHelper';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  X,
  Loader2,
  Check,
  ChevronRight,
  ShieldCheck,
  FileDown
} from 'lucide-react';

export interface CsvTargetField {
  key: string;
  label: string;
  required: boolean;
  description?: string;
  aliases?: string[];
  example?: string;
}

export interface CsvImportModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityName: string;
  targetFields: CsvTargetField[];
  sampleTemplateData: Record<string, string>[];
  templateFilename: string;
  existingRecords: T[];
  duplicateFinder: (
    row: Record<string, string>,
    existing: T[]
  ) => { isDuplicate: boolean; matchDescription?: string; existingRecord?: T };
  validator: (
    row: Record<string, string>
  ) => { isValid: boolean; error?: string };
  onConfirmImport: (
    recordsToImport: Record<string, string>[],
    recordsToUpdate: Record<string, string>[],
    duplicateAction: 'skip' | 'update'
  ) => Promise<{ importedCount: number; updatedCount: number; skippedCount: number }>;
}

type Step = 'upload' | 'mapping' | 'preview' | 'summary';

interface AnalyzedRow {
  index: number;
  original: Record<string, string>;
  mapped: Record<string, string>;
  status: 'valid' | 'duplicate' | 'invalid';
  error?: string;
  duplicateInfo?: string;
}

export function CsvImportModal<T = any>({
  isOpen,
  onClose,
  title,
  entityName,
  targetFields,
  sampleTemplateData,
  templateFilename,
  existingRecords,
  duplicateFinder,
  validator,
  onConfirmImport
}: CsvImportModalProps<T>) {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    importedCount: number;
    updatedCount: number;
    skippedCount: number;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Download CSV Template
  const handleDownloadTemplate = () => {
    const columns = targetFields.map(f => ({
      key: f.key,
      label: f.label
    }));
    const csvString = generateCSV(columns, sampleTemplateData);
    downloadCSV(templateFilename, csvString);
  };

  // 2. Handle File Selection
  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Please select a valid .csv file.');
      return;
    }
    setFileError(null);
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      try {
        const parsed = parseCSV(content);
        if (parsed.headers.length === 0 || parsed.rows.length === 0) {
          setFileError('The CSV file appears to be empty or has no readable rows.');
          return;
        }

        setCsvHeaders(parsed.headers);
        setCsvRows(parsed.rows);

        // Auto-detect mappings based on header names or aliases
        const initialMappings: Record<string, string> = {};
        targetFields.forEach(field => {
          const lowerKey = field.key.toLowerCase().replace(/[^a-z0-9]/g, '');
          const lowerLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, '');
          const aliasList = (field.aliases || []).map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ''));

          const matchedHeader = parsed.headers.find(h => {
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            return (
              cleanH === lowerKey ||
              cleanH === lowerLabel ||
              aliasList.includes(cleanH) ||
              cleanH.includes(lowerKey) ||
              lowerKey.includes(cleanH)
            );
          });

          if (matchedHeader) {
            initialMappings[field.key] = matchedHeader;
          }
        });

        setFieldMappings(initialMappings);
        setCurrentStep('mapping');
      } catch (err: any) {
        setFileError(err?.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const [importError, setImportError] = useState<string | null>(null);

  // 3. Mapping validation
  const missingRequiredFields = useMemo(() => {
    if (!isOpen) return [];
    return targetFields.filter(f => f.required && !fieldMappings[f.key]);
  }, [isOpen, targetFields, fieldMappings]);

  // 4. Analyze rows for Preview Step
  const analyzedRows: AnalyzedRow[] = useMemo(() => {
    if (!isOpen || (currentStep !== 'preview' && currentStep !== 'summary')) return [];

    return csvRows.map((row, idx) => {
      const mappedRecord: Record<string, string> = {};
      targetFields.forEach(field => {
        const mappedHeader = fieldMappings[field.key];
        mappedRecord[field.key] = mappedHeader && row[mappedHeader] !== undefined ? row[mappedHeader].trim() : '';
      });

      // Validate
      const validation = validator(mappedRecord);
      if (!validation.isValid) {
        return {
          index: idx + 1,
          original: row,
          mapped: mappedRecord,
          status: 'invalid',
          error: validation.error || 'Invalid record format'
        };
      }

      // Check for duplicate
      const dupCheck = duplicateFinder(mappedRecord, existingRecords);
      if (dupCheck.isDuplicate) {
        return {
          index: idx + 1,
          original: row,
          mapped: mappedRecord,
          status: 'duplicate',
          duplicateInfo: dupCheck.matchDescription || 'Matches an existing record'
        };
      }

      return {
        index: idx + 1,
        original: row,
        mapped: mappedRecord,
        status: 'valid'
      };
    });
  }, [isOpen, csvRows, fieldMappings, targetFields, validator, duplicateFinder, existingRecords, currentStep]);

  const stats = useMemo(() => {
    if (!isOpen) return { total: 0, valid: 0, duplicates: 0, invalid: 0 };
    const total = analyzedRows.length;
    const valid = analyzedRows.filter(r => r.status === 'valid').length;
    const duplicates = analyzedRows.filter(r => r.status === 'duplicate').length;
    const invalid = analyzedRows.filter(r => r.status === 'invalid').length;
    return { total, valid, duplicates, invalid };
  }, [isOpen, analyzedRows]);

  // 5. Download Rejected Records CSV with Reasons
  const handleDownloadRejectedCSV = () => {
    const rejectedRows = analyzedRows.filter(r => r.status === 'invalid');
    if (rejectedRows.length === 0) return;

    const columns = [
      { key: 'row_number', label: 'Row Number' },
      { key: 'rejection_reason', label: 'Rejection Reason' },
      ...targetFields.map(f => ({ key: f.key, label: f.label }))
    ];

    const dataToExport = rejectedRows.map(r => ({
      row_number: String(r.index),
      rejection_reason: r.error || 'Failed validation',
      ...r.mapped
    }));

    const csvContent = generateCSV(columns, dataToExport);
    downloadCSV(`rejected-${entityName.toLowerCase().replace(/\s+/g, '-')}-records.csv`, csvContent);
  };

  // 6. Execute Import
  const handleProceedWithImport = async () => {
    setIsProcessing(true);
    setImportError(null);
    try {
      const validRecords = analyzedRows.filter(r => r.status === 'valid').map(r => r.mapped);
      const duplicateRecords = analyzedRows.filter(r => r.status === 'duplicate').map(r => r.mapped);

      const toImport = validRecords;
      const toUpdate = duplicateAction === 'update' ? duplicateRecords : [];

      const result = await onConfirmImport(toImport, toUpdate, duplicateAction);
      setImportSummary(result);
      setCurrentStep('summary');
    } catch (err: any) {
      setImportError(err?.message || 'An error occurred during import. Please verify data formats and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetModal = () => {
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setFieldMappings({});
    setCurrentStep('upload');
    setFileError(null);
    setImportError(null);
    setImportSummary(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bulk upload, column mapping & duplicate prevention
              </p>
            </div>
          </div>
          <button
            onClick={handleResetModal}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-2 text-[11px] font-bold border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
          <div
            className={`flex items-center gap-1.5 ${
              currentStep === 'upload' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 'upload'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              1
            </span>
            <span>Upload</span>
          </div>

          <div
            className={`flex items-center gap-1.5 ${
              currentStep === 'mapping' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 'mapping'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              2
            </span>
            <span>Map Fields</span>
          </div>

          <div
            className={`flex items-center gap-1.5 ${
              currentStep === 'preview' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 'preview'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              3
            </span>
            <span>Validate</span>
          </div>

          <div
            className={`flex items-center gap-1.5 ${
              currentStep === 'summary' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 'summary'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              4
            </span>
            <span>Summary</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {importError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{importError}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportError(null)}
                className="hover:opacity-75 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STEP 1: Upload & Download Template */}
          {currentStep === 'upload' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileDown className="w-4 h-4 text-emerald-600" />
                    Download CSV Template
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Use this sample template to ensure all required columns match the database schema.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .csv Template</span>
                </button>
              </div>

              {/* Drag and Drop Box */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-14 h-14 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    Click to select a CSV file or drag and drop here
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supports Microsoft Excel, Google Sheets, or standard RFC 4180 CSV exports
                  </p>
                </div>
              </div>

              {fileError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Field Reference Information */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Column Field Specifications for {entityName}:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {targetFields.map(field => (
                    <div
                      key={field.key}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {field.label}
                        </span>
                        {field.description && (
                          <p className="text-[10px] text-slate-500">{field.description}</p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                          field.required
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {field.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Field Mapping */}
          {currentStep === 'mapping' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Review Column Header Mapping
                </p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  We automatically matched columns from <strong>{csvFile?.name}</strong> ({csvRows.length} rows detected). Verify that each target field points to the correct CSV column.
                </p>
              </div>

              {missingRequiredFields.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Required fields not yet mapped:{' '}
                    <strong>{missingRequiredFields.map(f => f.label).join(', ')}</strong>
                  </span>
                </div>
              )}

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Target Field in System</th>
                      <th className="p-3">Requirement</th>
                      <th className="p-3">Mapped CSV Column</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {targetFields.map(field => {
                      const isMapped = Boolean(fieldMappings[field.key]);
                      return (
                        <tr
                          key={field.key}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                        >
                          <td className="p-3">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {field.label}
                            </span>
                            {field.description && (
                              <span className="text-[10px] text-slate-400">{field.description}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                field.required
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {field.required ? 'Required' : 'Optional'}
                            </span>
                          </td>
                          <td className="p-3">
                            <select
                              value={fieldMappings[field.key] || ''}
                              onChange={e =>
                                setFieldMappings({
                                  ...fieldMappings,
                                  [field.key]: e.target.value
                                })
                              }
                              className={`w-full p-2 rounded-xl text-xs font-semibold outline-none border transition ${
                                field.required && !isMapped
                                  ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                              }`}
                            >
                              <option value="">-- Do not import / Skip --</option>
                              {csvHeaders.map(h => (
                                <option key={h} value={h}>
                                  CSV: {h} (e.g. "{csvRows[0]?.[h] || ''}")
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Preview, Validation & Duplicate Handling */}
          {currentStep === 'preview' && (
            <div className="space-y-4">
              {/* Validation Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Rows
                  </span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {stats.total}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                    Ready to Import
                  </span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {stats.valid}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                    Duplicates
                  </span>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {stats.duplicates}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">
                    Invalid / Rejected
                  </span>
                  <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                    {stats.invalid}
                  </span>
                </div>
              </div>

              {/* Duplicate Handling Policy */}
              {stats.duplicates > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="font-bold text-xs text-amber-900 dark:text-amber-200">
                      Duplicate Detection Policy ({stats.duplicates} matched existing records)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                        duplicateAction === 'skip'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dupAction"
                        value="skip"
                        checked={duplicateAction === 'skip'}
                        onChange={() => setDuplicateAction('skip')}
                        className="mt-0.5 text-emerald-600"
                      />
                      <div>
                        <span>Skip Duplicates (Recommended)</span>
                        <p className="text-[10px] font-normal text-slate-500">
                          Preserves existing records completely without modifications.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                        duplicateAction === 'update'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dupAction"
                        value="update"
                        checked={duplicateAction === 'update'}
                        onChange={() => setDuplicateAction('update')}
                        className="mt-0.5 text-emerald-600"
                      />
                      <div>
                        <span>Update Existing Records</span>
                        <p className="text-[10px] font-normal text-slate-500">
                          Merges uploaded information into existing records.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Download Rejected CSV Action */}
              {stats.invalid > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      {stats.invalid} row{stats.invalid > 1 ? 's' : ''} rejected due to missing fields or format errors
                    </span>
                    <p className="text-[11px] text-rose-600/80 dark:text-rose-300/80">
                      Download the rejected rows report with exact error annotations, fix in Excel, and re-upload.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadRejectedCSV}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Rejected Rows (.csv)</span>
                  </button>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="p-2.5">Row</th>
                      <th className="p-2.5">Status</th>
                      {targetFields.slice(0, 4).map(f => (
                        <th key={f.key} className="p-2.5">
                          {f.label}
                        </th>
                      ))}
                      <th className="p-2.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {analyzedRows.slice(0, 50).map(row => (
                      <tr
                        key={row.index}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                          row.status === 'invalid'
                            ? 'bg-rose-50/30 dark:bg-rose-950/20'
                            : row.status === 'duplicate'
                            ? 'bg-amber-50/30 dark:bg-amber-950/20'
                            : ''
                        }`}
                      >
                        <td className="p-2.5 font-mono text-[11px] font-bold text-slate-500">
                          #{row.index}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          {row.status === 'valid' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Valid
                            </span>
                          )}
                          {row.status === 'duplicate' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Duplicate
                            </span>
                          )}
                          {row.status === 'invalid' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </td>
                        {targetFields.slice(0, 4).map(f => (
                          <td
                            key={f.key}
                            className="p-2.5 font-semibold text-slate-900 dark:text-white max-w-[150px] truncate"
                          >
                            {row.mapped[f.key] || <span className="text-slate-400 font-normal">-</span>}
                          </td>
                        ))}
                        <td className="p-2.5 text-[11px]">
                          {row.error && <span className="text-rose-600 font-semibold">{row.error}</span>}
                          {row.duplicateInfo && (
                            <span className="text-amber-700 dark:text-amber-300 font-medium">
                              {row.duplicateInfo}
                            </span>
                          )}
                          {row.status === 'valid' && (
                            <span className="text-emerald-600 font-medium">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {analyzedRows.length > 50 && (
                <p className="text-[11px] text-slate-400 text-center">
                  Showing first 50 rows of {analyzedRows.length}. All rows will be processed on import.
                </p>
              )}
            </div>
          )}

          {/* STEP 4: Import Summary */}
          {currentStep === 'summary' && importSummary && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-200 dark:border-emerald-800">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Import Completed Successfully!
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {entityName} data was safely processed and integrated into your active pharmacy system.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                    Imported
                  </span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {importSummary.importedCount}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                    Updated
                  </span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {importSummary.updatedCount}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Skipped
                  </span>
                  <span className="text-2xl font-black text-slate-700 dark:text-slate-300">
                    {importSummary.skippedCount}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            {currentStep === 'mapping' && (
              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Back to Upload
              </button>
            )}
            {currentStep === 'preview' && (
              <button
                type="button"
                onClick={() => setCurrentStep('mapping')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Back to Mapping
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep !== 'summary' ? (
              <>
                <button
                  type="button"
                  onClick={handleResetModal}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>

                {currentStep === 'mapping' && (
                  <button
                    type="button"
                    disabled={missingRequiredFields.length > 0}
                    onClick={() => setCurrentStep('preview')}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next: Validate Data</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {currentStep === 'preview' && (
                  <button
                    type="button"
                    disabled={
                      isProcessing ||
                      (stats.valid === 0 && (duplicateAction === 'skip' || stats.duplicates === 0))
                    }
                    onClick={handleProceedWithImport}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Processing Import...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>
                          Confirm Import ({stats.valid + (duplicateAction === 'update' ? stats.duplicates : 0)} Records)
                        </span>
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleResetModal}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md cursor-pointer"
              >
                Close & View Records
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
