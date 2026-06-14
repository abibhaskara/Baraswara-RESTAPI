"""
services/heuristics_engine.py

Core Engine: Klasifikasi Semantik & Rekomendasi Privasi Data
─────────────────────────────────────────────────────────────
Modul ini bertugas buat menganalisis tipe kolom di file CSV secara otomatis.
Hasil akhirnya, modul ini bakal ngasih rekomendasi mekanisme pengamanan
Differential Privacy yang paling pas buat masing-masing kolom.

Gimana Cara Matematikanya Bekerja?
══════════════════════════════════

Kita ngecek setiap kolom pake beberapa metrik berikut:

1. CARDINALITY RATIO (Seberapa Unik Datanya)
   ─────────────────────────────────────────
   Rumus:
       cardinality_ratio = jumlah_nilai_unik / total_baris_berisi

   Artinya:
   - Kalau rasionya deket-deket 1.0 (alias 100% unik), berarti datanya beda semua tiap baris.
     Ini fix ciri-ciri kolom pengenal (ID) kaya NISN, NIM, NIK, atau Nama yang bahaya kalau bocor.
   - Threshold bawaan: >= 0.95 (kita anggap 95% unik udah cukup buat nandain kolom pengenal, 
     soalnya di dunia nyata kadang ada aja kan nama yang gak sengaja kembar).

2. DISTINCT UNIQUE COUNT (Jumlah Variasi Nilai Unik)
   ──────────────────────────────────────────────────
   Rumus:
       n_unique = jumlah variasi nilai unik di satu kolom

   Dipake buat nyari kolom Yes/No atau kategori:
   - Kalau isinya cuma 2 variasi (misal: 0/1, True/False, Ya/Tidak) 
     → Kita klasifikasiin sebagai "Boolean / Binary".
   - Kalau variasinya antara 3 sampai 40 (bisa diatur di config) 
     → Kita anggap sebagai "Categorical" (Kategori, contoh: Provinsi, Jenis Kelamin, Kelas).

3. DTYPE CHECK (Tipe Data Asli)
   ─────────────────────────────
   Pandas bakal nebak tipe datanya pas baca file:
   - Kalau tipenya angka (int/float) dan variasi nilainya banyak banget (misal: nilai ujian 0-100, 
     gaji, tinggi badan) 
     → Kita klasifikasiin sebagai "Continuous Numeric".

4. AVERAGE STRING LENGTH (Rata-rata Panjang Teks)
   ──────────────────────────────────────────────
   Rumus:
       avg_len = rata-rata jumlah karakter teks di kolom tersebut

   Bermanfaat banget buat nemuin data sensitif berbentuk teks panjang (misal nama lengkap, 
   alamat rumah, email) yang rasionya tinggi tapi lolos deteksi unik.
   - Threshold bawaan: >= 8 karakter.

URUTAN PENGAMBILAN KEPUTUSAN (Decision Tree Santai)
───────────────────────────────────────────────────
    1. Apakah nama kolomnya mengandung kata kunci sensitif (PII) kayak "nama", "email", "telp"?
       → "ID / Unique Identifier" → IGNORE (Abaikan otomatis demi privasi)

    2. Apakah rasionya >= 0.95 dan datanya bertipe teks/panjang?
       → "ID / Unique Identifier" → IGNORE

    3. Apakah variasinya cuma 2 nilai?
       → "Boolean / Binary" → RANDOMIZED_RESPONSE

    4. Apakah tipe angka dan jumlah barisnya cukup banyak (>= 30 baris)?
       → "Continuous Numeric" → LAPLACE (Suntik noise Laplace biar aman)

    5. Apakah variasi uniknya dikit (<= 40)?
       → "Categorical" → RANDOMIZED_RESPONSE

    6. Buntu / Gak ke-detect?
       → "Unknown" → REVIEW (Biar dicek manual sama admin lewat antarmuka HITL)
"""

import io
import logging
from typing import Final

import pandas as pd

from src.schemas.privacy_engine import (
    ColumnRecommendation,
    FileMetadata,
    PreCheckResponse,
    RecommendedAction,
    SemanticType,
)

logger = logging.getLogger(__name__)

# ── Konfigurasi Threshold (mudah diubah di satu tempat) ─────────────────────
SAMPLE_ROW_LIMIT: Final[int] = 500          # Batas baris sebelum sampling aktif
SAMPLE_SIZE: Final[int] = 500               # Jumlah baris sampel yang diambil
CARDINALITY_ID_THRESHOLD: Final[float] = 0.95   # >= 95% unik → dianggap identifier secara statistik
CATEGORICAL_UNIQUE_THRESHOLD: Final[int] = 40   # <= 40 nilai unik → kategorik (mendukung kategori dengan variasi sedang seperti Country)
LONG_STRING_AVG_LEN: Final[int] = 8        # Rata-rata panjang string → identifier
# Deteksi numerik-ID hanya bermakna jika ada cukup baris; dengan dataset kecil
# hampir semua kolom numerik akan memiliki cardinality tinggi secara kebetulan.
MIN_ROWS_FOR_NUMERIC_ID_DETECTION: Final[int] = 30


# ── Daftar Kata Kunci Sensitif PII (Identitas Pribadi) ──────────────────────
PII_COLUMN_KEYWORDS = {
    "name", "nama", "first", "last", "email", "phone", "telp", "phone",
    "website", "url", "nisn", "nim", "ssn", "id", "index", "address", "alamat"
}


def _classify_column(series: pd.Series) -> tuple[SemanticType, RecommendedAction]:
    """
    Tebak tipe semantik satu kolom di Pandas secara otomatis.
    Mengembalikan (tipe_semantik, aksi_privasi_rekomendasi).
    """
    col_name_lower = str(series.name).lower() if series.name else ""
    cardinality_ratio = _compute_cardinality_ratio(series)
    n_unique = series.nunique()
    
    # ── Deteksi Angka Desimal Versi Indonesia (Lokalitas Data) ────────────────
    is_numeric = pd.api.types.is_numeric_dtype(series)
    is_string_type = pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series)
    
    # Kalau tipenya string/teks, kita coba bersihin. Siapa tahu isinya angka desimal 
    # pake format koma (,) ala Indonesia, contoh: '77,5'
    if is_string_type:
        try:
            # Buang spasi kosong, lalu ganti koma desimal jadi titik
            cleaned_series = series.dropna().astype(str).str.replace(r"\s+", "", regex=True)
            cleaned_series = cleaned_series.str.replace(",", ".", regex=False)
            
            # Coba paksa ubah jadi numeric (yang bukan angka bakal berubah jadi NaN/null)
            converted = pd.to_numeric(cleaned_series, errors="coerce")
            
            # Kalau minimal 90% data sukses berubah jadi angka, fix ini kolom numerik!
            non_null_count = series.dropna().count()
            if non_null_count > 0 and (converted.count() / non_null_count) >= 0.90:
                is_numeric = True
                # Update info kardinalitas & keunikan pake data yang udah dikonversi tadi
                cardinality_ratio = _compute_cardinality_ratio(converted)
                n_unique = converted.nunique()
        except Exception:
            pass

    avg_str_len = _compute_avg_string_length(series)

    # ── Aturan 1: Cari Kata Kunci Sensitif (PII) di Nama Kolom ─────────────────
    # Kalau nama kolomnya mengandung kata kunci kaya "first name", "email", dll.
    # dan dia bertipe data teks asli, langsung vonis sebagai ID/Pengenal!
    if any(keyword in col_name_lower for keyword in PII_COLUMN_KEYWORDS) and is_string_type and not is_numeric:
        return "ID / Unique Identifier", "IGNORE"

    # ── Prioritas 1: ID / Unique Identifier (Teks/String Unik) ───────────────
    # Kondisi: Datanya beda semua tiap baris (cardinality tinggi) & bertipe teks panjang
    if cardinality_ratio >= CARDINALITY_ID_THRESHOLD and (
        is_string_type or avg_str_len >= LONG_STRING_AVG_LEN
    ) and not is_numeric:
        return "ID / Unique Identifier", "IGNORE"

    # ── Prioritas 2: Boolean / Binary (Ya/Tidak, 0/1) ───────────────────────
    # Kondisi: Variasi nilainya cuma ada 2 macam
    if n_unique <= 2:
        return "Boolean / Binary", "RANDOMIZED_RESPONSE"

    # ── Prioritas 3: ID / Unique Identifier (Angka Pengenal) ──────────────────
    # Kondisi: Kolom angka dengan keunikan hampir 100% (contoh: NISN, NIM, NIK, ID)
    # Kita butuh minimal 30 baris data biar metrik keunikan ini gak bias/salah tebak
    if (
        is_numeric
        and cardinality_ratio >= CARDINALITY_ID_THRESHOLD
        and series.count() >= MIN_ROWS_FOR_NUMERIC_ID_DETECTION
    ):
        return "ID / Unique Identifier", "IGNORE"

    # ── Prioritas 4: Continuous Numeric (Data Angka Berlanjut) ────────────────
    # Kondisi: Kolom bertipe angka. Kita dahulukan di atas Categorical biar kolom
    # nilai ujian (kayak UTS/UAS) gak salah masuk ke kategori data berulang.
    if is_numeric:
        return "Continuous Numeric", "LAPLACE"

    # ── Prioritas 5: Categorical (Data Kategori Berulang) ─────────────────────
    # Kondisi: Kolom teks dengan jumlah variasi nilai unik yang terbatas (maks 40)
    # Contoh: Kelas, Provinsi, Jenis Kelamin, Status Kelulusan
    if n_unique <= CATEGORICAL_UNIQUE_THRESHOLD:
        return "Categorical", "RANDOMIZED_RESPONSE"

    # ── Prioritas 6: Cadangan ID / Unique Identifier ─────────────────────────
    # Buat jaga-jaga kalau ada kolom teks unik yang lolos filter di atas
    if cardinality_ratio >= CARDINALITY_ID_THRESHOLD:
        return "ID / Unique Identifier", "IGNORE"

    # ── Default: Gak tau / Bingung tebak tipe datanya ────────────────────────
    logger.warning(
        "Waduh, kolom ini gagal diklasifikasiin otomatis: "
        "cardinality_ratio=%.3f, n_unique=%d, is_numeric=%s",
        cardinality_ratio,
        n_unique,
        is_numeric,
    )
    return "Unknown", "REVIEW"






def _compute_cardinality_ratio(series: pd.Series) -> float:
    """
    Hitung rasio kardinalitas: proporsi nilai unik terhadap nilai non-null.

    Returns:
        float antara 0.0 dan 1.0.
        Mengembalikan 0.0 jika tidak ada data non-null.
    """
    non_null_count = series.count()  # Hanya hitung baris yang tidak null
    if non_null_count == 0:
        return 0.0
    return series.nunique() / non_null_count


def _compute_avg_string_length(series: pd.Series) -> float:
    """
    Hitung rata-rata panjang string dari nilai non-null pada kolom object.

    Returns:
        float rata-rata panjang, atau 0.0 jika kolom bukan string.
    """
    is_string_type = pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series)
    if not is_string_type:
        return 0.0
    return series.dropna().astype(str).str.len().mean() or 0.0






def _build_column_recommendations(df: pd.DataFrame) -> list[ColumnRecommendation]:
    """
    Iterasi semua kolom DataFrame dan bangun daftar ColumnRecommendation.
    """
    recommendations: list[ColumnRecommendation] = []

    for col_name in df.columns:
        series = df[col_name]
        semantic_type, recommended_action = _classify_column(series)
        missing_values = int(series.isna().sum())

        recommendations.append(
            ColumnRecommendation(
                column_name=col_name,
                semantic_type=semantic_type,
                missing_values=missing_values,
                recommended_action=recommended_action,
            )
        )
        logger.debug(
            "Kolom '%s': type=%s, action=%s, missing=%d",
            col_name,
            semantic_type,
            recommended_action,
            missing_values,
        )

    return recommendations


def analyze_csv(file_bytes: bytes, filename: str) -> PreCheckResponse:
    """
    Entry point utama: Analisis berkas CSV dan kembalikan rekomendasi privasi.

    Proses:
    1. Deteksi delimiter otomatis (koma, titik koma, atau tab) menggunakan csv.Sniffer.
    2. Parse CSV dari bytes ke DataFrame Pandas dengan delimiter yang terdeteksi.
    3. Catat metadata berkas (total rows & columns SEBELUM sampling).
    4. Sampling jika DataFrame terlalu besar (hemat RAM).
    5. Klasifikasikan setiap kolom.
    6. Kembalikan PreCheckResponse yang siap di-serialize ke JSON.

    Args:
        file_bytes: Konten berkas CSV dalam bentuk bytes.
        filename:   Nama berkas asli dari upload.

    Returns:
        PreCheckResponse — objek Pydantic yang langsung bisa di-return FastAPI.

    Raises:
        ValueError: Jika berkas tidak dapat di-parse sebagai CSV valid.
    """
    import csv

    # ── Deteksi Delimiter Otomatis ───────────────────────────────────────────
    sep = ","  # Default fallback
    try:
        # Baca sampel 2048 bytes awal untuk mengendus delimiter
        sample_text = file_bytes[:2048].decode("utf-8", errors="ignore")
        if sample_text:
            sniffer = csv.Sniffer()
            # Kita tentukan kumpulan karakter pemisah yang valid untuk dideteksi
            dialect = sniffer.sniff(sample_text, delimiters=[",", ";", "\t"])
            sep = dialect.delimiter
            logger.info("Delimiter terdeteksi otomatis untuk '%s': '%s'", filename, repr(sep))
    except Exception as exc:
        logger.warning(
            "Gagal mengendus delimiter otomatis untuk '%s' (%s). Menggunakan default koma (',').",
            filename,
            exc,
        )

    # ── Memuat Berkas ke DataFrame Pandas ────────────────────────────────────
    try:
        df_full = pd.read_csv(io.BytesIO(file_bytes), sep=sep)
    except Exception as exc:
        raise ValueError(f"Berkas tidak dapat dibaca sebagai CSV: {exc}") from exc

    total_rows, total_columns = df_full.shape

    # ── Sampling untuk efisiensi RAM ─────────────────────────────────────────
    # Jika jumlah baris melebihi SAMPLE_ROW_LIMIT, ambil sampel acak.
    # Metadata (total_rows) tetap merefleksikan ukuran berkas ASLI.
    if total_rows > SAMPLE_ROW_LIMIT:
        logger.info(
            "Berkas besar (%d baris) terdeteksi. Sampling %d baris untuk analisis.",
            total_rows,
            SAMPLE_SIZE,
        )
        df_sample = df_full.sample(n=SAMPLE_SIZE, random_state=42)
    else:
        df_sample = df_full

    recommendations = _build_column_recommendations(df_sample)

    return PreCheckResponse(
        file_metadata=FileMetadata(
            filename=filename,
            total_rows=total_rows,
            total_columns=total_columns,
        ),
        schema_recommendation=recommendations,
    )

