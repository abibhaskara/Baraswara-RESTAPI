from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Tambahkan baris ini
from src.privacy import inject_laplace_noise

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def read_root():
    return {"message": "Sistem Automatic Compliance API Baraswara aktif"}

# Menambahkan query parameter 'value'
@app.get("/data-siswa")
def get_siswa_stats(value: float = 50.0, epsilon: float = 0.1):
    # Injeksi noise berdasarkan input pengguna
    data_aman = inject_laplace_noise(value, epsilon, sensitivity=1.0)
    
    return {
        "status": "success",
        "input_asli": value,
        "epsilon_digunakan": epsilon,
        "nilai_agregat_terproteksi": round(data_aman, 2)
    }