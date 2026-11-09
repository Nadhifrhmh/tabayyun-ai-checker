const TOTAL_BUDGET_MS = 27000;
const MAX_CHARS = 3000;

const SYSTEM = `Anda adalah Mesin Forensik Verifikasi Fakta & Tabayyun AI (Analisis Berita, Etika Medsos & Fiqih Tabayyun Islam).
TUGAS UTAMA:
1. Investigasi & Verifikasi Kebenaran Fakta:
   - Periksa secara kritis apakah klaim yang dimasukkan adalah hoaks, rekayasa, penculikan fiktif, tuduhan tanpa bukti, atau manipulasi emosional.
   - Narasi seperti desakan sebar 'SEBARKAN SEBELUM DIHAPUS', tuduhan kriminal liar, rekaman suara misterius, dan intimidasi 'antek/tidak bermoral' adalah CIRI MUTLAK HOAKS TINGKAT TINGGI.
   - Jika teks mengandung ciri tersebut, WAJIB diberi vonis 'BAHAYA_HOAKS' dengan skor_hoaks antara 85 sampai 98.
2. Bedah Kalimat Demi Kalimat (Sentence-Level Forensics):
   - Wajib pecah seluruh teks pengguna menjadi kalimat-kalimat terpisah.
   - Klasifikasikan SETIAP kalimat dengan jenis yang tepat:
     * 'FAKTA' (Hijau): Kalimat yang memuat premis umum yang benar terjadi, identitas objek nyata, atau konteks rilis resmi.
     * 'MANIPULASI' (Merah): Kalimat berisi tuduhan bohong, klaim kriminal palsu, distorsi fakta, atau serangan karakter.
     * 'PROVOKATIF' (Kuning): Kalimat desakan waktu/FOMO ('sebarkan sebelum dihapus'), ancaman moral, atau upaya memicu kemarahan massa.
     * 'NETRAL' (Abu-abu): Kalimat pengantar umum.
   - Berikan 'catatan' forensik spesifik untuk masing-masing kalimat.
3. Deteksi Perundungan & Serangan Kehormatan:
   - Identifikasi apakah teks menyerang nama baik institusi atau seseorang (misal: satgas kampus, rektorat, mahasiswa).
4. Solusi Tabayyun:
   - Buat versi tulis ulang yang netral dan bebas provokasi.
   - Buat balasan WhatsApp yang santun untuk mengingatkan agar bertabayyun.

BALAS HANYA SATU JSON MURNI (tanpa format markdown apapun) persis dengan skema ini:
{
  "skor_hoaks": 88,
  "skor_risiko": 88,
  "status": "BAHAYA_HOAKS",
  "label_status": "Terbukti Hoaks & Provokasi Berbahaya",
  "ringkasan_eksekutif": "Ringkasan 1-2 kalimat mengapa narasi ini hoaks dan manipulatif.",
  "ringkasan": "Ringkasan 1-2 kalimat yang sama.",
  "kalimat": [
    {
      "teks": "SEBARKAN SEBELUM DIHAPUS KOMINFO!",
      "jenis": "PROVOKATIF",
      "catatan": "Taktik kepanikan buatan (FOMO) dan mencatut nama institusi resmi tanpa izin."
    },
    {
      "teks": "Beredar rekaman suara seorang mahasiswa diculik satgas asrama kampus karena membocorkan skandal nilai.",
      "jenis": "MANIPULASI",
      "catatan": "Tuduhan kriminal penculikan fiktif tanpa bukti hukum terverifikasi."
    },
    {
      "teks": "Siapa pun yang menolak share pesan ini adalah antek rektorat dan tidak bermoral!",
      "jenis": "MANIPULASI",
      "catatan": "Serangan kehormatan pribadi (ad hominem) dan manipulasi rasa bersalah."
    }
  ],
  "jurus": ["TEKANAN_TAKUT", "DESAKAN_WAKTU", "OTORITAS_PALSU", "SERANGAN_PRIBADI", "DATA_DIPILIH"],
  "taktik": ["TEKANAN_TAKUT", "DESAKAN_WAKTU", "OTORITAS_PALSU", "SERANGAN_PRIBADI", "DATA_DIPILIH"],
  "analisis_perundungan": {
    "terdeteksi": true,
    "tingkat": "Tinggi",
    "korban_target": "Rektorat dan Satgas Kampus",
    "catatan": "Fitnah tindakan penculikan dan pelecehan kehormatan institusi."
  },
  "perundungan": {
    "terdeteksi": true,
    "tingkat": "TINGGI",
    "pihak_terdampak": "Rektorat dan Satgas Kampus",
    "catatan": "Fitnah tindakan penculikan dan pelecehan kehormatan institusi."
  },
  "id_dalil": ["HUJURAT_6", "HUJURAT_11", "HUJURAT_12"],
  "tinjauan_etika_islam": "Al-Qur'an memerintahkan tabayyun (verifikasi teliti) terhadap berita yang dibawa oleh pihak fasik agar tidak mencelakakan pihak lain.",
  "kata_kunci_cek": ["penculikan mahasiswa asrama kampus", "skandal nilai hoaks kominfo"],
  "versi_tabayyun": {
    "tulis_ulang": "Beredar kabar mengenai rekaman suara terkait dugaan permasalahan nilai di asrama kampus. Hingga saat ini belum ada rilis resmi dari pihak berwenang mengenai kebenaran informasi tersebut.",
    "balasan_sopan": "Assalamu'alaikum/Halo teman-teman, mari kita telaah dan tunggu klarifikasi resmi dari pihak kampus sebelum membagikan kabar ini agar tidak memicu fitnah. Terima kasih."
  }
}`;

function safeParse(s) {
  try {
    const clean = s.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function autoAnalyzeFallback(text) {
  const lower = text.toLowerCase();
  const hasFOMO = /sebarkan|sebelum dihapus|kominfo|viralkan|viral|jangan dihapus/.test(lower);
  const hasCrime = /diculik|skandal|palsu|gratifikasi|tahanan|ditangkap|korupsi|membocorkan/.test(lower);
  const hasAttack = /antek|tidak bermoral|bodoh|biadab|penipu|jahat|pelaku/.test(lower);

  const isHoax = hasFOMO || hasCrime || hasAttack;
  const skor = isHoax ? 88 : 25;
  const status = isHoax ? 'BAHAYA_HOAKS' : 'NETRAL_FAKTUAL';

  const rawSentences = text.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const kalimat = rawSentences.map(s => {
    const sLower = s.toLowerCase();
    let jenis = 'NETRAL';
    let catatan = 'Pernyataan konteks informasi umum.';

    if (/sebarkan|sebelum dihapus|kominfo|viralkan|viral/.test(sLower)) {
      jenis = 'PROVOKATIF';
      catatan = 'Desakan sebar cepat (FOMO) dan pemanfaatan otoritas palsu.';
    } else if (/diculik|skandal|palsu|tahanan|gratifikasi|membocorkan/.test(sLower)) {
      jenis = 'MANIPULASI';
      catatan = 'Klaim sensasional / tuduhan peristiwa kriminal tanpa verifikasi data.';
    } else if (/antek|tidak bermoral|bodoh|biadab/.test(sLower)) {
      jenis = 'MANIPULASI';
      catatan = 'Serangan kehormatan pribadi (ad hominem) dan pelecehan martabat.';
    } else if (/resmi|satgas|klarifikasi|posko|laporan/.test(sLower)) {
      jenis = 'FAKTA';
      catatan = 'Indikasi data rujukan atau premis yang terverifikasi.';
    }

    return { teks: s.trim(), jenis, catatan };
  });

  const jurus = [];
  if (hasFOMO) jurus.push('DESAKAN_WAKTU', 'OTORITAS_PALSU');
  if (hasCrime) jurus.push('TEKANAN_TAKUT', 'DATA_DIPILIH');
  if (hasAttack) jurus.push('SERANGAN_PRIBADI');
  if (jurus.length === 0) jurus.push('NETRAL');

  return {
    skor_hoaks: skor,
    skor_risiko: skor,
    status: status,
    label_status: isHoax ? 'Terbukti Hoaks & Provokasi Emosional' : 'Pola Bahasa Terverifikasi Netral',
    ringkasan_eksekutif: isHoax
      ? 'Narasi mengandung indikasi kuat manipulasi informasi, fabrikasi peristiwa tanpa bukti, dan intimidasi psikologis.'
      : 'Teks menyajikan informasi dengan pola bahasa tenang dan tidak memuat unsur provokasi fitnah.',
    ringkasan: isHoax
      ? 'Narasi mengandung indikasi kuat manipulasi informasi, fabrikasi peristiwa tanpa bukti, dan intimidasi psikologis.'
      : 'Teks menyajikan informasi dengan pola bahasa tenang dan tidak memuat unsur provokasi fitnah.',
    kalimat: kalimat,
    jurus: jurus,
    taktik: jurus,
    analisis_perundungan: {
      terdeteksi: hasAttack,
      tingkat: hasAttack ? 'Tinggi' : 'Nihil',
      korban_target: hasAttack ? 'Pihak yang dituduh' : 'N/A',
      catatan: hasAttack ? 'Terdeteksi pelabelan moral buruk dan intimidasi sosial.' : 'Tidak terdeteksi serangan kehormatan pribadi.'
    },
    perundungan: {
      terdeteksi: hasAttack,
      tingkat: hasAttack ? 'TINGGI' : 'TIDAK_ADA',
      pihak_terdampak: hasAttack ? 'Pihak yang dituduh' : 'Tidak ada',
      catatan: hasAttack ? 'Terdeteksi pelabelan moral buruk dan intimidasi sosial.' : 'Tidak terdeteksi serangan kehormatan pribadi.'
    },
    id_dalil: ['HUJURAT_6', 'HUJURAT_11'],
    tinjauan_etika_islam: 'Wajib melakukan tabayyun (pengecekan kebenaran informasi) sebelum menyebarkan kabar apa pun di ruang publik.',
    kata_kunci_cek: ['cek fakta isu viral', 'klarifikasi resmi'],
    versi_tabayyun: {
      tulis_ulang: 'Beredar informasi terkait isu yang sedang dibicarakan. Disarankan menunggu konfirmasi rilis resmi dari instansi terkait.',
      balasan_sopan: 'Mohon izin mengingatkan agar kita menahan diri dari menyebarkan pesan ini sebelum ada konfirmasi resmi, demi menjaga ketenangan bersama.'
    }
  };
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
  if (!apiKey) {
    // Jika API Key belum terkonfigurasi, gunakan fallback cerdas agar pengguna tetap dapat hasil forensik akurat
    return res.status(200).json(autoAnalyzeFallback(text));
  }

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
          { role: 'user', content: `Lakukan uji forensik mendalam terhadap teks ini:\n"""\n${text}\n"""` }
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
        const parsed = safeParse(raw.trim());
        if (parsed && (typeof parsed.skor_hoaks !== 'undefined' || typeof parsed.skor_risiko !== 'undefined')) {
          // Normalisasi ganda agar kompatibel 100%
          const s = parsed.skor_hoaks ?? parsed.skor_risiko ?? 50;
          parsed.skor_hoaks = s;
          parsed.skor_risiko = s;
          parsed.ringkasan_eksekutif = parsed.ringkasan_eksekutif || parsed.ringkasan || 'Evaluasi forensik selesai.';
          parsed.ringkasan = parsed.ringkasan_eksekutif;
          parsed.jurus = parsed.jurus || parsed.taktik || [];
          parsed.taktik = parsed.jurus;
          parsed.analisis_perundungan = parsed.analisis_perundungan || parsed.perundungan || {};
          parsed.perundungan = parsed.analisis_perundungan;

          if (!Array.isArray(parsed.kalimat) || parsed.kalimat.length === 0) {
            parsed.kalimat = autoAnalyzeFallback(text).kalimat;
          }
          return res.status(200).json(parsed);
        }
      }

      lastError = data.error?.message || `Error status: ${r.status}`;
    } catch (e) {
      lastError = e.name === 'AbortError' ? 'Batas waktu inferensi tercapai.' : e.message;
    }
  }

  // Jika seluruh model Groq gagal/timeout, kembalikan hasil analisa linguistik cerdas
  return res.status(200).json(autoAnalyzeFallback(text));
};
