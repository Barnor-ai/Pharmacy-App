import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Prescription, PrescriptionRxItem } from '../types';
import { formatDate } from '../lib/formatters';
import {
  Search,
  Plus,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  UserCheck,
  Upload,
  Lock,
  ExternalLink,
  Clock,
  FileCheck,
  Eye
} from 'lucide-react';
import { uploadPrescriptionDocument, getPrescriptionSignedUrl } from '../lib/supabaseService';

export const Prescriptions: React.FC = () => {
  const { prescriptions, customers, addPrescription, updatePrescriptionStatus, setActiveTab, organizationId } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingRx, setViewingRx] = useState<Prescription | null>(null);

  // New Rx form state
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [doctorName, setDoctorName] = useState('');
  const [doctorRegNo, setDoctorRegNo] = useState('');
  const [hospitalClinic, setHospitalClinic] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Signed URL State for viewing modal
  const [signedDocUrl, setSignedDocUrl] = useState<string | null>(null);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);
  const [signedUrlError, setSignedUrlError] = useState<string | null>(null);
  const [urlExpiresIn, setUrlExpiresIn] = useState<number>(900); // 15 mins (900 seconds)

  const [rxItems, setRxItems] = useState<PrescriptionRxItem[]>([
    { medicineName: '', dosage: '500mg', frequency: '1-0-1', duration: '5 days', quantity: 1, instructions: 'Take after food' }
  ]);

  const filteredRx = prescriptions.filter(p =>
    p.prescriptionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.doctorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItemRow = () => {
    setRxItems([
      ...rxItems,
      { medicineName: '', dosage: '1 tablet', frequency: 'Once daily', duration: '7 days', quantity: 1, instructions: '' }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setRxItems(rxItems.filter((_, i) => i !== index));
  };

  // Generate temporary 15-minute signed URL whenever an Rx with an attachment is viewed
  useEffect(() => {
    let timer: any;
    if (viewingRx && viewingRx.scannedFileUrl && organizationId) {
      setLoadingSignedUrl(true);
      setSignedUrlError(null);
      setSignedDocUrl(null);
      setUrlExpiresIn(900);

      getPrescriptionSignedUrl(viewingRx.scannedFileUrl, organizationId, 900)
        .then(({ signedUrl, error }) => {
          if (error) {
            setSignedUrlError(error);
          } else {
            setSignedDocUrl(signedUrl);
            // 15-minute countdown
            timer = setInterval(() => {
              setUrlExpiresIn(prev => {
                if (prev <= 1) {
                  clearInterval(timer);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        })
        .finally(() => {
          setLoadingSignedUrl(false);
        });
    } else {
      setSignedDocUrl(null);
      setSignedUrlError(null);
      setLoadingSignedUrl(false);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [viewingRx, organizationId]);

  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) return;

    setIsUploading(true);
    setUploadError(null);

    let savedFilePath: string | undefined = undefined;

    // If a document was attached, upload it directly to the private prescriptions bucket
    if (prescriptionFile && organizationId) {
      const { path, error } = await uploadPrescriptionDocument(prescriptionFile, organizationId);
      if (error) {
        setUploadError(error);
        setIsUploading(false);
        return;
      }
      if (path) {
        savedFilePath = path;
      }
    }

    addPrescription({
      customerId: cust.id,
      customerName: cust.name,
      doctorName,
      doctorRegNo,
      hospitalClinic,
      diagnosis,
      items: rxItems,
      notes,
      scannedFileUrl: savedFilePath
    });

    setIsUploading(false);
    setShowAddModal(false);
    setDoctorName('');
    setDoctorRegNo('');
    setHospitalClinic('');
    setDiagnosis('');
    setNotes('');
    setPrescriptionFile(null);
  };

  const formatExpiryTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            Prescription Management
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Lock className="w-3 h-3 mr-1" />
              Private Storage Encrypted
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verify doctor prescriptions, record clinical instructions & dispense medicines safely with tenant-isolated storage
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Log Doctor Prescription
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search Rx #, Patient Name, or Doctor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">Rx Number</th>
                <th className="p-3">Patient Name</th>
                <th className="p-3">Doctor / Reg No</th>
                <th className="p-3">Hospital / Clinic</th>
                <th className="p-3">Prescribed Meds</th>
                <th className="p-3">Document</th>
                <th className="p-3">Logged Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRx.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{p.prescriptionNo}</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{p.customerName}</td>
                  <td className="p-3 font-medium">
                    {p.doctorName}
                    <span className="block text-[10px] text-slate-400">{p.doctorRegNo}</span>
                  </td>
                  <td className="p-3 text-slate-500">{p.hospitalClinic}</td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 dark:text-white">{p.items.length} items</span>
                    <span className="block text-[11px] text-slate-500 truncate max-w-[150px]">
                      {p.items.map(i => i.medicineName).join(', ')}
                    </span>
                  </td>
                  <td className="p-3">
                    {p.scannedFileUrl ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Lock className="w-2.5 h-2.5 mr-1" />
                        Private Rx File
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">None</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-500">{formatDate(p.createdAt)}</td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        p.status === 'Dispensed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : p.status === 'Verified'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewingRx(p)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Rx
                      </button>

                      {p.status === 'Pending' && (
                        <button
                          onClick={() => updatePrescriptionStatus(p.id, 'Verified')}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 font-bold"
                        >
                          Verify
                        </button>
                      )}

                      {p.status === 'Verified' && (
                        <button
                          onClick={() => {
                            updatePrescriptionStatus(p.id, 'Dispensed');
                            setActiveTab('pos');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          Dispense
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRx.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">No prescriptions recorded yet</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                          Click "+ Log Doctor Prescription" to record patient prescriptions and clinical dispensing instructions.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rx Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Log Doctor Prescription</h3>
                <p className="text-[11px] text-slate-500">Record physical or scanned doctor prescription details securely</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="space-y-4">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-800 dark:text-rose-300 text-xs">
                  {uploadError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Select Patient *</label>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Alexander Wright, MD"
                    value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Doctor Reg / License #</label>
                  <input
                    type="text"
                    placeholder="MDC-2024-8841"
                    value={doctorRegNo}
                    onChange={e => setDoctorRegNo(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Hospital / Medical Clinic</label>
                  <input
                    type="text"
                    placeholder="St. Mary's General Hospital"
                    value={hospitalClinic}
                    onChange={e => setHospitalClinic(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Primary Clinical Diagnosis</label>
                <input
                  type="text"
                  placeholder="e.g. Acute Bacterial Sinusitis & Bronchitis"
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              {/* Private File Attachment Upload */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    Attach Scanned Rx Document (Private Storage)
                  </span>
                  <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={e => setPrescriptionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
                {prescriptionFile && (
                  <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" /> Selected: {prescriptionFile.name} ({(prescriptionFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Rx Items */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">Prescribed Medicines</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-emerald-600 font-bold hover:underline text-[11px]"
                  >
                    + Add Medication Row
                  </button>
                </div>

                <div className="space-y-2">
                  {rxItems.map((item, index) => (
                    <div key={index} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                      <input
                        type="text"
                        required
                        placeholder="Medicine Name"
                        value={item.medicineName}
                        onChange={e => {
                          const updated = [...rxItems];
                          updated[index].medicineName = e.target.value;
                          setRxItems(updated);
                        }}
                        className="p-2 rounded-lg bg-white dark:bg-slate-900 border font-semibold"
                      />
                      <input
                        type="text"
                        placeholder="Dosage (500mg)"
                        value={item.dosage}
                        onChange={e => {
                          const updated = [...rxItems];
                          updated[index].dosage = e.target.value;
                          setRxItems(updated);
                        }}
                        className="p-2 rounded-lg bg-white dark:bg-slate-900 border"
                      />
                      <input
                        type="text"
                        placeholder="Frequency (1-0-1)"
                        value={item.frequency}
                        onChange={e => {
                          const updated = [...rxItems];
                          updated[index].frequency = e.target.value;
                          setRxItems(updated);
                        }}
                        className="p-2 rounded-lg bg-white dark:bg-slate-900 border"
                      />
                      <input
                        type="text"
                        placeholder="Duration (5 days)"
                        value={item.duration}
                        onChange={e => {
                          const updated = [...rxItems];
                          updated[index].duration = e.target.value;
                          setRxItems(updated);
                        }}
                        className="p-2 rounded-lg bg-white dark:bg-slate-900 border"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={e => {
                            const updated = [...rxItems];
                            updated[index].quantity = parseInt(e.target.value) || 1;
                            setRxItems(updated);
                          }}
                          className="w-16 p-2 rounded-lg bg-white dark:bg-slate-900 border font-bold"
                        />
                        {rxItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(index)}
                            className="p-1.5 text-rose-500 hover:bg-rose-100 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Pharmacist Clinical Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Patient allergic to penicillin, substitute approved by doctor."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading & Saving...' : 'Save Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Rx Modal */}
      {viewingRx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Prescription: {viewingRx.prescriptionNo}
                </h3>
                <span className="text-[10px] text-slate-500">
                  Logged: {formatDate(viewingRx.createdAt)}
                </span>
              </div>
              <button onClick={() => setViewingRx(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border">
              <p>Patient: <span className="font-bold text-slate-900 dark:text-white">{viewingRx.customerName}</span></p>
              <p>Prescribing Doctor: <span className="font-bold text-slate-900 dark:text-white">{viewingRx.doctorName} ({viewingRx.doctorRegNo})</span></p>
              <p>Hospital/Clinic: <span className="font-semibold text-slate-700 dark:text-slate-300">{viewingRx.hospitalClinic}</span></p>
              {viewingRx.diagnosis && <p>Diagnosis: <span className="italic">{viewingRx.diagnosis}</span></p>}
            </div>

            {/* Secure Prescription Document (Signed URL Preview) */}
            {viewingRx.scannedFileUrl && (
              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-slate-900 dark:text-white">Private Scanned Rx File</span>
                  </div>
                  {signedDocUrl && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      <Clock className="w-3 h-3" />
                      Expiring in {formatExpiryTime(urlExpiresIn)}
                    </span>
                  )}
                </div>

                {loadingSignedUrl && (
                  <p className="text-slate-500 italic">Generating secure tenant-isolated signed access URL...</p>
                )}

                {signedUrlError && (
                  <p className="text-rose-600 font-medium">Access Error: {signedUrlError}</p>
                )}

                {signedDocUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Temporary authorization token active. File is protected from unauthorized public access.
                      </p>
                      <a
                        href={signedDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open File
                      </a>
                    </div>
                    {/* Inline image thumbnail if image */}
                    {(viewingRx.scannedFileUrl.endsWith('.jpg') ||
                      viewingRx.scannedFileUrl.endsWith('.jpeg') ||
                      viewingRx.scannedFileUrl.endsWith('.png') ||
                      viewingRx.scannedFileUrl.endsWith('.webp')) && (
                      <div className="max-h-48 rounded-lg overflow-hidden border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 flex items-center justify-center p-1">
                        <img
                          src={signedDocUrl}
                          alt="Prescription Scan"
                          className="max-h-44 object-contain rounded"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t">
              <h4 className="font-bold mb-2 text-slate-900 dark:text-white">Prescribed Items & Instructions:</h4>
              <div className="space-y-2">
                {viewingRx.items.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                    <p className="font-bold text-slate-900 dark:text-white">{item.medicineName} ({item.dosage})</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">Frequency: {item.frequency} • Duration: {item.duration} • Qty: {item.quantity}</p>
                    {item.instructions && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Instructions: {item.instructions}</p>}
                  </div>
                ))}
              </div>
            </div>

            {viewingRx.notes && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-900 dark:text-amber-200">
                <p className="font-bold text-[10px] uppercase">Pharmacist Notes:</p>
                <p className="text-xs">{viewingRx.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingRx(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
