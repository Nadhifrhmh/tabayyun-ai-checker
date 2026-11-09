const TOTAL_BUDGET_MS = 27000;
const MAX_CHARS = 3000;
const RETRY_CODES = [429, 500, 502, 503, 504];

const SYSTEM = `Anda adalah Mesin Forensik Verifikasi Fakta & Tabayyun Digital (Etika Medsos Mahasiswa & Jurnalisme Bukti).
Tugas Anda: mengevaluasi klaim teks secara kritis, membandingkan dengan data faktual yang diketahui publik, dan memberikan vonis berlandaskan bukti.

ATURAN INTEGRITAS AKADEMIK (SANGAT KETAT):
1. DILARANG MENGARANG (HALUSINASI) nama pejabat, tanggal, angka, atau isi klarifikasi palsu.
2. Vonis 'SALAH' HANYA boleh jika ada 'fakta_pembanding' yang konkret dan dapat diverifikasi. Jika fakta belum dapat dipastikan, WAJIB gunakan vonis 'TIDAK_DAPAT_DIVERIFIKASI'.
3. Opini atau tuduhan liar tanpa sumber pembanding diberi vonis 'TIDAK_DAPAT_DIVERIFIKASI'.
4. Penentuan status:
   - Jika ada klaim utama terbukti salah -> 'HOAKS'
   - Jika ada campuran fakta & klaim berlebihan -> 'MENYESATKAN'
   - Jika tidak ada data resmi yang dapat mengonfirmasi -> 'BELUM_TERVERIFIKASI'
   - Jika narasi selaras dengan rilis resmi -> 'SESUAI_FAKTA'
5. DILARANG membuat URL sembarangan. Jika tidak ada URL rujukan valid, kosongkan array sumber.

Balas HANYA SATU JSON murni (tanpa pembungkus markdown apapun) persis dengan format ini:
{
  "skor_risiko": 80,
  "status": "HOAKS" | "MENYESATKAN" | "BELUM_TERVERIFIKASI" | "SESUAI_FAKTA",
  "label_status": "Indikasi Hoaks Tinggi",
  "ringkasan": "Ringkasan kesimpulan dalam 1-2 kalimat.",
  "tingkat_keyakinan": "TINGGI" | "SEDANG" | "RENDAH",
  "dasar_vonis": "PENGETAHUAN_UMUM" | "PENCARIAN_WEB" | "TIDAK_ADA",
  "perbandingan_klaim": [
    {
      "klaim": "isi klaim yang dituduhkan pengguna",
      "fakta_pembanding": "fakta resmi yang diketahui, atau 'Tidak ditemukan data pembanding resmi'",
      "vonis": "BENAR" | "SALAH" | "SEBAGIAN_BENAR" | "TIDAK_DAPAT_DIVERIFIKASI",
      "dasar_logika": "alasan logis mengapa klaim ini benar/salah/belum terbukti",
      "sumber": []
    }
  ],
  "detail_investigasi": {
    "benar_terjadi": ["poin fakta yang sudah terbukti"],
    "karangan_atau_dilebih_lebihkan": ["poin klaim palsu atau distorsi"],
    "belum_dapat_dipastikan": ["poin yang masih desas-desus / butuh verifikasi lebih lanjut"]
  },
  "perundungan": {
    "terdeteksi": true,
    "tingkat": "TINGGI" | "SEDANG" | "RENDAH" | "TIDAK_ADA",
    "pihak_terdampak": "nama individu atau institusi yang martabatnya diserang",
    "catatan": "penjelasan apakah menyerang fisik, martabat pribadi, atau menyebarkan tuduhan sepihak"
  },
  "taktik": ["TEKANAN_TAKUT", "DESAKAN_WAKTU", "OTORITAS_PALSU", "SERANGAN_MARTABAT", "DATA_SEPIHAK", "GENERALISASI"],
  "kata_kunci_cek": ["kata kunci 1", "kata kunci 2"],
  "id_dalil": ["HUJURAT_6", "HUJURAT_11"],
  "rekomendasi": ["Tindakan 1 yang harus diambil", "Tindakan 2"]
}`;

function safeParse(s) {
  try {
    const clean = s.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function normalize(obj) {
  if (!obj || typeof obj !== 'object') return null;

  const validStatus = ['HOAKS', 'MENYESATKAN', 'BELUM_TERVERIFIKASI', 'SESUAI_FAKTA'];
  const validVonis = ['BENAR', 'SALAH', 'SEBAGIAN_BENAR', 'TIDAK_DAPAT_DIVERIFIKASI'];

  const out = {
    skor_risiko: typeof obj.skor_risiko === 'number' ? Math.min(100, Math.max(0, obj.skor_risiko)) : 50,
    status: validStatus.includes(obj.status) ? obj.status : 'BELUM_TERVERIFIKASI',
    label_status: String(obj.label_status || 'Hasil Evaluasi Fakta'),
    ringkasan: String(obj.ringkasan || 'Pemeriksaan klaim selesai.'),
    tingkat_keyakinan: String(obj.tingkat_keyakinan || 'SEDANG'),
    dasar_vonis: String(obj.dasar_vonis || 'PENGETAHUAN_UMUM'),
    perbandingan_klaim: Array.isArray(obj.perbandingan_klaim) ? obj.perbandingan_klaim.map(item => ({
      klaim: String(item.klaim || '').slice(0, 300),
      fakta_pembanding: String(item.fakta_pembanding || 'Tidak ditemukan data pembanding resmi').slice(0, 300),
      vonis: validVonis.includes(item.vonis) ? item.vonis : 'TIDAK_DAPAT_DIVERIFIKASI',
      dasar_logika: String(item.dasar_logika || '-').slice(0, 300),
      sumber: Array.isArray(item.sumber) ? item.sumber.filter(s => s && typeof s.url === 'string' && s.url.startsWith('https://')) : []
    })) : [],
    detail_investigasi: {
      benar_terjadi: Array.isArray(obj.detail_investigasi?.benar_terjadi) ? obj.detail_investigasi.benar_terjadi.map(String) : [],
      karangan_atau_dilebih_lebihkan: Array.isArray(obj.detail_investigasi?.karangan_atau_dilebih_lebihkan) ? obj.detail_investigasi.karangan_atau_dilebih_lebihkan.map(String) : [],
      belum_dapat_dipastikan: Array.isArray(obj.detail_investigasi?.belum_dapat_dipastikan) ? obj.detail_investigasi.belum_dapat_dipastikan.map(String) : []
    },
    perundungan: {
      terdeteksi: Boolean(obj.perundungan?.terdeteksi),
      tingkat: String(obj.perundungan?.tingkat || 'TIDAK_ADA'),
      pihak_terdampak: String(obj.perundungan?.pihak_terdampak || 'Tidak ada pihak tertentu'),
      catatan: String(obj.perundungan?.catatan || 'Tidak terdeteksi perundungan martabat.')
    },
    taktik: Array.isArray(obj.taktik) ? obj.taktik.map(String) : [],
    kata_kunci_cek: Array.isArray(obj.kata_kunci_cek) ? obj.kata_kunci_cek.map(String) : ['isu viral'],
    id_dalil: Array.isArray(obj.id_dalil) && obj.id_dalil.length > 0 ? obj.id_dalil : ['HUJURAT_6'],
    rekomendasi: Array.isArray(obj.rekomendasi) ? obj.rekomendasi.map(String) : ['Lakukan tabayyun sebelum memposting.']
  };

  return out;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const text = body && typeof body.text === 'string' ? body.text.trim().slice(0, MAX_CHARS) : '';
  if (!text) return res.status(400).json({ error: 'Teks masukan tidak boleh kosong.' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY belum dikonfigurasi di Vercel.' });

  const models = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];
  const start = Date.now();
  let lastError = '';

  for (const model of models) {
    const elapsed = Date.now() - start;
    const remaining = TOTAL_BUDGET_MS - elapsed;
    if (remaining < 4000) break;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), Math.min(remaining, 14000));

      const payload = {
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Lakukan uji kebenaran dan forensik atas narasi berikut:\n"""\n${text}\n"""` }
        ],
        temperature: 0.1,
        max_completion_tokens: 3800,
        response_format: { type: 'json_object' }
      };

      if (model.includes('gpt-oss')) {
        payload.reasoning_effort = 'low';
      }

      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify(payload)
      });

      clearTimeout(timer);
      const data = await r.json().catch(() => ({}));

      if (r.ok) {
        const raw = data.choices?.[0]?.message?.content || '{}';
        const parsed = safeParse(raw);
        const normalized = normalize(parsed);
        if (normalized && Array.isArray(normalized.perbandingan_klaim)) {
          return res.status(200).json(normalized);
        }
      }

      lastError = data.error?.message || `Status: ${r.status}`;
    } catch (e) {
      lastError = e.name === 'AbortError' ? 'Timeout inferensi.' : e.message;
    }
  }

  return res.status(500).json({ error: lastError || 'Layanan sedang sibuk. Coba sesaat lagi.' });
};
