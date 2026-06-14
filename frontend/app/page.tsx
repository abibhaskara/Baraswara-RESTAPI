'use client';

import React, { useState } from 'react';
import { UploadCloud, FileText, Settings, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

interface FileMetadata {
  filename: string;
  total_rows: number;
  total_columns: number;
}


interface ColumnRecommendation {
  column_name: string;
  semantic_type: string;
  missing_values: number;
  recommended_action: 'IGNORE' | 'LAPLACE' | 'RANDOMIZED_RESPONSE' | 'REVIEW';
}

interface APIResponse {
  status: 'success';
  file_metadata: FileMetadata;
  schema_recommendation: ColumnRecommendation[];
}

export default function BaraswaraDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<APIResponse | null>(null);

  // Fungsi mengunggah file CSV langsung ke backend API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsLoading(true);
      setErrorMsg(null);
      setAnalysisResult(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const response = await fetch('http://localhost:8000/v1/privacy-engine/pre-check', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.detail?.message || `Gagal menganalisis file (${response.status})`);
        }

        const data: APIResponse = await response.json();
        setAnalysisResult(data);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Terjadi kesalahan koneksi ke backend engine.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getActionBadge = (action: ColumnRecommendation['recommended_action']) => {
    switch (action) {
      case 'IGNORE':
        return (
          <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded font-bold uppercase tracking-wide">
            Ignore (Abaikan)
          </span>
        );
      case 'LAPLACE':
        return (
          <span className="text-xs bg-blue-100 text-blue-800 border border-blue-200 px-2 py-1 rounded font-bold uppercase tracking-wide">
            Laplace Noise
          </span>
        );
      case 'RANDOMIZED_RESPONSE':
        return (
          <span className="text-xs bg-green-100 text-green-800 border border-green-200 px-2 py-1 rounded font-bold uppercase tracking-wide">
            Randomized Response
          </span>
        );
      case 'REVIEW':
      default:
        return (
          <span className="text-xs bg-red-100 text-red-800 border border-red-200 px-2 py-1 rounded font-bold uppercase tracking-wide">
            Manual Review
          </span>
        );
    }
  };

  const getSemanticColor = (type: string) => {
    if (type.includes('ID')) return 'text-amber-700';
    if (type.includes('Numeric')) return 'text-blue-700';
    if (type.includes('Boolean') || type.includes('Categorical')) return 'text-green-700';
    return 'text-red-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* HEADER DASHBOARD */}
        <header className="border-b-2 border-black pb-4 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase">
              BARASWARA FRAMEWORK
            </h1>
            <p className="text-gray-600 font-medium">Privacy-as-a-Service Engine & Automated Analytics</p>
          </div>
          <div className="bg-black text-white px-3 py-1 text-xs font-mono rounded uppercase tracking-wider">
            Console Mode
          </div>
        </header>

        {/* EROR ALERT */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-300 text-red-900 p-4 rounded flex items-start gap-2 text-sm shadow-[2px_2px_0px_0px_rgba(239,68,68,0.2)]">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-bold uppercase">Analisis Gagal</p>
              <p className="text-red-700">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* KONDISI 1: JIKA BELUM ADA FILE (AREA DROPZONE) */}
        {!file ? (
          <div className="border-2 border-dashed border-gray-400 bg-white p-12 text-center rounded-lg hover:border-black transition-colors shadow-sm">
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-bold">Unggah Sampel Data Sekolah (.csv)</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Sistem akan menganalisis tipe data semantik, mendeteksi data kotor, dan memberikan rekomendasi proteksi secara otomatis.
            </p>
            <label className="bg-black text-white px-6 py-2.5 rounded font-bold cursor-pointer hover:bg-gray-800 transition-colors text-sm uppercase tracking-wide">
              Pilih Berkas CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          /* KONDISI 2: JIKA FILE SUDAH DIUNGGAH (ANTARMUKA HITL) */
          <div className="bg-white border-2 border-black p-6 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded text-blue-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-lg leading-none">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Ukuran: {(file.size / 1024).toFixed(2)} KB
                    {analysisResult && (
                      <span className="font-semibold text-black">
                        {' '}• Terdeteksi: {analysisResult.file_metadata.total_rows} baris, {analysisResult.file_metadata.total_columns} kolom
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setAnalysisResult(null);
                  setErrorMsg(null);
                }}
                className="text-xs text-red-600 font-bold uppercase tracking-wider hover:underline border border-red-200 px-3 py-1 rounded bg-red-50"
              >
                Ganti Berkas
              </button>
            </div>

            {/* LOADING STATE */}
            {isLoading && (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="mx-auto h-8 w-8 text-gray-500 animate-spin" />
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Menganalisis Karakteristik Statistik Data...</p>
              </div>
            )}

            {/* REKOMENDASI HASIL ANALISIS */}
            {analysisResult && (
              <div className="space-y-4">
                <h4 className="font-bold uppercase tracking-wide text-sm text-gray-700 flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Rekomendasi Pemetaan Kolom Otomatis:
                </h4>

                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden shadow-sm">
                  {analysisResult.schema_recommendation.map((col, idx) => (
                    <div
                      key={idx}
                      className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs font-bold">
                            {col.column_name}
                          </span>
                          {col.missing_values > 0 && (
                            <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-semibold">
                              ⚠️ {col.missing_values} Sel Kosong
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Tipe Semantik:{' '}
                          <strong className={getSemanticColor(col.semantic_type)}>
                            {col.semantic_type}
                          </strong>
                        </p>
                      </div>
                      <div className="flex items-center">
                        {getActionBadge(col.recommended_action)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NOTIFIKASI HUMAN-IN-THE-LOOP (HITL) */}
            {!isLoading && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded text-xs space-y-1">
                <p className="font-bold uppercase flex items-center gap-1">⚠️ Konfirmasi Manusia Diperlukan (HITL Paradigm)</p>
                <p className="text-gray-700">
                  Silakan periksa rekomendasi pemetaan di atas sebelum menekan tombol generator. Pastikan tidak ada kebutaan konteks (context blindness) pada data unik sekolah Anda.
                </p>
              </div>
            )}

            {/* ACTION BUTTON */}
            <button
              disabled={isLoading || !analysisResult}
              className={`w-full py-3.5 rounded font-bold flex items-center justify-center gap-2 uppercase tracking-wider text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] transition-colors ${
                isLoading || !analysisResult
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              <ShieldCheck className="h-5 w-5" />
              Simpan & Bangun Pipeline API Aman
            </button>
          </div>
        )}

      </div>
    </div>
  );
}