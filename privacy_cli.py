#!/usr/bin/env python3
"""
BARASWARA Privacy-as-a-Service CLI
─────────────────────────────────────────────────────────────
Alat bantu terminal untuk melakukan pre-check privasi berkas CSV.
Penggunaan:
    python privacy_cli.py <path_ke_file.csv>
"""

import sys
import os
import requests
import json

API_URL = "http://localhost:8000/v1/privacy-engine/pre-check"

def run_pre_check(file_path: str):
    if not os.path.exists(file_path):
        print(f"❌ Error: File '{file_path}' tidak ditemukan.")
        sys.exit(1)
        
    print(f"🚀 Mengunggah & menganalisis '{file_path}' via BARASWARA Engine...")
    
    try:
        # Buka file secara binary dan kirim ke API
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'text/csv')}
            response = requests.post(API_URL, files=files)
            
        if response.status_code == 200:
            data = response.json()
            print("\n✅ Analisis Sukses!")
            print("=" * 60)
            print(f"Nama Berkas : {data['file_metadata']['filename']}")
            print(f"Total Baris : {data['file_metadata']['total_rows']}")
            print(f"Total Kolom : {data['file_metadata']['total_columns']}")
            print("=" * 60)
            print(f"{'NAMA KOLOM':<20} | {'TIPE SEMANTIK':<25} | {'REKOMENDASI AKSI'}")
            print("-" * 60)
            for col in data['schema_recommendation']:
                missing_info = f" (⚠️ {col['missing_values']} empty)" if col['missing_values'] > 0 else ""
                print(f"{col['column_name']:<20} | {col['semantic_type']:<25} | {col['recommended_action']}{missing_info}")
            print("=" * 60)
        else:
            print(f"\n❌ Error API ({response.status_code}):")
            try:
                print(json.dumps(response.json(), indent=2))
            except:
                print(response.text)
                
    except requests.exceptions.ConnectionError:
        print("\n❌ Error Koneksi: Pastikan server backend FastAPI Anda sudah berjalan di port 8000.")
        print("   Jalankan server dengan: uvicorn src.main:app --reload")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Penggunaan: python privacy_cli.py <path_ke_file.csv>")
        sys.exit(1)
        
    run_pre_check(sys.argv[1])
