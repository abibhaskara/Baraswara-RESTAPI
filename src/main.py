from fastapi import FastAPI
from src.privacy import inject_laplace_noise # Mengimpor fungsi dari modul privacy

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Sistem Automatic Compliance API Baraswara aktif."}

@app.get("/data-siswa")
def get_siswa_stats():
    data_asli = 50.0 
    epsilon = 0.1 # Semakin kecil nilai epsilon, semakin kuat privasinya

    # Injeksi noise
    data_aman = inject_laplace_noise(data_asli, epsilon, sensitivity=1.0)

    return {
        "status": "success",
        "keterangan": "Data telah diproteksi dengan Differential Privacy",
        "nilai_agregat": round(data_aman, 2)
    }