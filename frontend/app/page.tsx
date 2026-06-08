'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Copy, RefreshCw } from 'lucide-react';

export default function BaraswaraDashboard() {
  const [epsilon, setEpsilon] = useState(1.0);
  const [rawValue, setRawValue] = useState(85);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [result, setResult] = useState({ 
    raw: 85, 
    noise: "0.00", 
    secure: 85,
    status: "MENUNGGU..." 
  });

  const [logs, setLogs] = useState<{time: string, eps: string, raw: number, noise: string, secure: number}[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setResult(prev => ({ ...prev, status: "MEMPROSES..." }));
        
        const response = await fetch(`http://127.0.0.1:8000/data-siswa?value=${rawValue}&epsilon=${epsilon}`, {
          cache: 'no-store'
        });
        const data = await response.json();
        
        const secureVal = data.nilai_agregat_terproteksi;
        const noiseCalc = (secureVal - rawValue).toFixed(2);
        const formattedNoise = parseFloat(noiseCalc) > 0 ? `+${noiseCalc}` : noiseCalc;

        setResult({
          raw: rawValue,
          noise: formattedNoise,
          secure: secureVal,
          status: "TERKONEKSI"
        });
      } catch (error) {
        setResult(prev => ({ ...prev, status: "GAGAL / API OFFLINE" }));
      }
    };

    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [rawValue, epsilon, refreshTrigger]);

  const handleSaveLog = () => {
    const now = new Date();
    const timeString = `${now.toLocaleTimeString('id-ID', { hour12: false })}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    
    const newLog = {
      time: timeString,
      eps: epsilon.toFixed(2),
      raw: rawValue,
      noise: result.noise,
      secure: result.secure
    };
    
    setLogs(prevLogs => [newLog, ...prevLogs]);

    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white text-black font-mono p-3 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-5xl border-4 border-black p-4 sm:p-6 bg-white space-y-4">
        
        <div className="border-b-4 border-black pb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] bg-black text-white px-2 py-0.5 font-bold uppercase tracking-wider">
              PROTOTYPE SECTION / REV.11 (AUTO-STOCHASTIC)
            </span>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight mt-1">
              SANDBOX INTERAKTIF: DIFFERENTIAL PRIVACY
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          <div className="lg:col-span-5 space-y-4">
            <div className="border-2 border-black p-3 bg-white space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider">
                [ GENERATOR KONTROL ]
              </h2>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold uppercase text-[11px]">Nilai Epsilon (𝜀):</span>
                  <span className="bg-black text-white px-1.5 py-0.5 text-xs font-bold font-mono">
                    {epsilon.toFixed(2)}
                  </span>
                </div>
                <input 
                  type="range" min="0.01" max="15.00" step="0.01" 
                  value={epsilon}
                  onChange={(e) => setEpsilon(parseFloat(e.target.value))}
                  className="w-full accent-black h-2 border-2 border-black appearance-none bg-neutral-200 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-neutral-500 font-bold uppercase">
                  <span>𝜀=0.01 (Kuat)</span>
                  <span>𝜀=1.0 (Standar)</span>
                  <span>𝜀 &gt; 10 (Lemah)</span>
                </div>
              </div>

              <div className="bg-neutral-50 border-2 border-black p-2 space-y-0.5">
                <div className="text-[10px] font-black uppercase text-black">
                  STATUS: {epsilon <= 1.0 ? 'HIGH PRIVACY' : epsilon <= 5.0 ? 'SWEET SPOT (KESEIMBANGAN)' : 'LOW PRIVACY'}
                </div>
                <div className="text-[9px] text-neutral-600 uppercase leading-tight font-medium">
                  {epsilon <= 1.0 ? 'Derau maksimal. Akurasi data rendah.' : epsilon <= 5.0 ? 'Standar emas riset. Akurasi & privasi seimbang.' : 'Derau minimal. Data hampir transparan.'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold uppercase text-[11px]">Nilai Data Mentah:</span>
                  <span className="border-2 border-black px-1.5 py-0.5 text-xs font-bold bg-neutral-100 font-mono">
                    {rawValue}
                  </span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={rawValue}
                  onChange={(e) => setRawValue(parseInt(e.target.value))}
                  className="w-full accent-black h-2 border-2 border-black appearance-none bg-neutral-200 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold uppercase text-black">
                  <span>Kurva Distribusi Derau</span>
                  <span>b = {(1/epsilon).toFixed(2)}</span>
                </div>
                <svg className="w-full h-20 bg-white border-2 border-black rounded-none overflow-hidden" viewBox="0 0 300 80">
                  <line x1="0" y1="40" x2="300" y2="40" stroke="#E5E5E5" strokeWidth="1" />
                  <line x1="150" y1="0" x2="150" y2="80" stroke="#E5E5E5" strokeWidth="1" />
                  <path d={`M 10 70 Q 150 ${Math.max(5, 70 - (epsilon * 10))} 290 70`} fill="none" stroke="#000" strokeWidth="2.5" />
                  <circle cx="150" cy="40" r="4" fill="#000" stroke="#FFF" strokeWidth="1.5" />
                </svg>
              </div>

              <div className="flex gap-2 pt-1">
                <button 
                  onClick={handleSaveLog}
                  className="flex-1 bg-black text-white py-1.5 px-3 font-bold text-xs uppercase flex items-center justify-center gap-1.5 border-2 border-black hover:bg-neutral-800 active:translate-y-0.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan Log & Acak Ulang</span>
                </button>
              </div>

            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            
            <div className="border-2 border-black p-3 bg-white space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className={`w-2 h-2 ${result.status === "TERKONEKSI" ? "bg-black animate-pulse" : "bg-red-500"} inline-block`} />
                  [ PENGOLAHAN DATA : {result.status} ]
                </span>
                
                <button 
                  onClick={() => setRefreshTrigger(prev => prev + 1)}
                  className="text-[10px] border-2 border-black px-2 py-1 font-bold flex items-center gap-1.5 hover:bg-neutral-100 active:translate-y-px transition-all uppercase"
                >
                  <RefreshCw className="w-3 h-3" /> Acak Manual
                </button>

              </div>

              <div className="grid grid-cols-3 gap-2 py-1">
                <div className="border-2 border-black p-2 bg-white transition-colors duration-300">
                  <span className="text-[8px] font-bold uppercase block text-neutral-500">Raw Data</span>
                  <div className="text-lg font-bold mt-0.5 font-mono">{result.raw}</div>
                </div>

                <div className="border-2 border-black p-2 bg-white transition-colors duration-300">
                  <span className="text-[8px] font-bold uppercase block text-neutral-500">Laplace Noise</span>
                  <div className="text-lg font-bold mt-0.5 font-mono text-black">{result.noise}</div>
                </div>

                <div className="border-2 border-black p-2 bg-neutral-100 transition-colors duration-300">
                  <span className="text-[8px] font-bold uppercase block text-neutral-500">Obfuscated</span>
                  <div className="text-lg font-bold mt-0.5 font-mono underline decoration-2 decoration-black">{result.secure}</div>
                </div>
              </div>
            </div>

            <div className="border-2 border-black p-3 bg-white space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <span>[ LOG ]</span>
              </h3>

              <div className="overflow-x-auto max-h-[180px]">
                <table className="w-full text-left text-xs text-black border-collapse">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b-2 border-black text-[9px] uppercase font-bold text-neutral-500">
                      <th className="pb-1">Waktu</th>
                      <th className="pb-1">𝜀</th>
                      <th className="pb-1 text-right">Raw</th>
                      <th className="pb-1 text-right">Derau</th>
                      <th className="pb-1 text-right">Secure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black font-mono text-[11px]">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-neutral-400 font-bold uppercase text-[9px]">Belum ada data terekam. Klik "Simpan Log".</td>
                      </tr>
                    ) : (
                      logs.map((log, index) => (
                        <tr key={index} className="hover:bg-neutral-50 transition-colors">
                          <td className="py-1 text-neutral-500">{log.time}</td>
                          <td className="py-1 font-bold">{log.eps}</td>
                          <td className="py-1 text-right">{log.raw}</td>
                          <td className="py-1 text-right">{log.noise}</td>
                          <td className="py-1 text-right font-black">{log.secure}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        <div className="border-t-2 border-black pt-2 text-[9px] text-neutral-400 font-bold flex flex-wrap justify-between gap-1 uppercase">
          <span>Baraswara DP-Core Simulator</span>
          <span>&copy; Abi Bhaskara</span>
        </div>

      </div>
    </div>
  );
}