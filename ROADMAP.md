```mermaid

graph TD
    %% Konfigurasi Warna (Dark Theme / Terminal Vibe)
    classDef default fill:#1e1e2e,stroke:#cdd6f4,stroke-width:2px,color:#cdd6f4;
    classDef userAction fill:#89b4fa,stroke:#11111b,stroke-width:2px,color:#11111b,font-weight:bold;
    classDef backendEngine fill:#a6e3a1,stroke:#11111b,stroke-width:2px,color:#11111b,font-weight:bold;
    classDef frontendUI fill:#fab387,stroke:#11111b,stroke-width:2px,color:#11111b,font-weight:bold;
    classDef database fill:#f38ba8,stroke:#11111b,stroke-width:2px,color:#11111b,font-weight:bold;

    subgraph Fase1 ["FASE 1: Ingesti & Inferensi Semantik (Otak Sistem)"]
        U1([User Unggah data_siswa.csv]):::userAction --> B1[FastAPI Endpoint: Terima Berkas]:::backendEngine
        B1 --> B2[ydata-profiling: Data Sampling & Type Inference]:::backendEngine
        B2 --> B3[Generate Draft JSON: Deteksi Data Kotor & Heuristik]:::backendEngine
    end

    subgraph Fase2 ["FASE 2: Validasi Human-in-the-Loop / HITL (Jantung Sistem)"]
        B3 --> F1[Next.js Dashboard: Tampilkan UI Pemetaan]:::frontendUI
        F1 --> U2([User Validasi: Set Aturan Privasi & Penanganan Anomali]):::userAction
        U2 --> F2[Kirim Instruksi Konfigurasi Final]:::frontendUI
    end

    subgraph Fase3 ["FASE 3: Eksekusi & Penyimpanan Ringan (Otot Sistem)"]
        F2 --> B4[Pandas: Pembersihan & Agregasi Data]:::backendEngine
        B4 --> B5[Plotly: Generate Grafik Tren & Analitik]:::backendEngine
        B5 --> B6[Konversi Data: fig.to_json]:::backendEngine
        B6 --> S1[(Database: Simpan JSON 10-50KB & Secure Hash URL)]:::database
    end

    subgraph Fase4 ["FASE 4: Penyajian Interaktif & Keamanan Terenkripsi"]
        S1 --> U3([Klien Akses via Hashed / Short URL]):::userAction
        U3 --> F3{Middleware: Validasi Akses Latar Belakang}:::frontendUI
        F3 -- Valid --> F4[Client-Side Render: plotly-latest.min.js]:::frontendUI
        F3 -- Tidak Valid --> F5[Tolak Akses: 401 Unauthorized]:::frontendUI
    end