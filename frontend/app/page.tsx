'use client';

import React, { useState } from 'react';
import { UploadCloud, FileText, Settings, ShieldCheck, RefreshCw } from 'lucide-react';

export default function BaraswaraDashboard() {
  const [file, setFile] = useState<File | null>(null);

  // Fungsi simulasi menangkap file CSV yang diunggah
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
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
                  <p className="text-xs text-gray-500 mt-1">Ukuran: {(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-xs text-red-600 font-bold uppercase tracking-wider hover:underline border border-red-200 px-3 py-1 rounded bg-red-50"
              >
                Ganti Berkas
              </button>
            </div>

            {/* SIMULASI HEURISTIK DATA SEMANTIC CLASSIFICATION */}
            <div className="space-y-4">
              <h4 className="font-bold uppercase tracking-wide text-sm text-gray-700 flex items-center gap-2">
                <Settings className="h-4 w-4 animate-spin-slow" /> Rekomendasi Pemetaan Kolom Otomatis:
              </h4>

              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                {/* Contoh Kolom ID */}
                <div className="p-4 bg-gray-50 flex justify-between items-center">
                  <div>
                    <span className="font-mono bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs font-bold mr-2">NISN</span>
                    <span className="text-sm text-gray-600">Terdeteksi: <strong className="text-amber-700">Unique Identifier (ID)</strong></span>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold uppercase">Diabaikan Otomatis</span>
                </div>

                {/* Contoh Kolom Numerik */}
                <div className="p-4 bg-white flex justify-between items-center">
                  <div>
                    <span className="font-mono bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs font-bold mr-2">Nilai_Ujian</span>
                    <span className="text-sm text-gray-600">Terdeteksi: <strong className="text-blue-700">Continuous Numeric</strong></span>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold uppercase">Mekanisme Laplace</span>
                </div>

                {/* Contoh Kolom Kategori */}
                <div className="p-4 bg-white flex justify-between items-center">
                  <div>
                    <span className="font-mono bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs font-bold mr-2">Ikut_Les</span>
                    <span className="text-sm text-gray-600">Terdeteksi: <strong className="text-green-700">Boolean / Binary</strong></span>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold uppercase">Randomized Response</span>
                </div>
              </div>
            </div>

            {/* NOTIFIKASI HUMAN-IN-THE-LOOP (HITL) */}
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded text-xs space-y-1">
              <p className="font-bold uppercase flex items-center gap-1">⚠️ Konfirmasi Manusia Diperlukan (HITL Paradigm)</p>
              <p className="text-gray-700">
                Silakan periksa rekomendasi pemetaan di atas sebelum menekan tombol generator. Pastikan tidak ada kebutaan konteks (context blindness) pada data unik sekolah Anda.
              </p>
            </div>

            {/* ACTION BUTTON */}
            <button className="w-full bg-black text-white py-3.5 rounded font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors uppercase tracking-wider text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
              <ShieldCheck className="h-5 w-5" />
              Simpan & Bangun Pipeline API Aman
            </button>
          </div>
        )}

      </div>
    </div>
  );
}