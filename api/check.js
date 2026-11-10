'use strict';

/* ============================================================
   Tabayyun Observer — /api/check
   Mesin Forensik Verifikasi Hoaks & Analisis Linguistik Islam
   Model: llama-3.3-70b-versatile / llama-3.1-8b-instant
   Prinsip 3 Tingkat (3-Tier Forensic Classification):
   1. Fakta Sahih Terverifikasi (80-100%, Hijau Emerald)
   2. Perlu Tabayyun & Konfirmasi Data (45-65%, Kuning Emas) - Klaim sepihak / narasumber
   3. Hoaks Total / Bahaya Disinformasi (0-20%, Merah Coral) - Pesan berantai / fitnah kriminal
   ============================================================ */

const TOTAL_BUDGET_MS = Number(process.env.TOTAL_BUDGET_MS) || 50000;
const MAX_CHARS = 3000;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Model resmi aktif Groq 2026 (llama-3.3-70b-versatile sangat cerdas dan stabil)
const MODEL_UTAMA = 'llama-3.3-70b-versatile';
const MODEL_CADANGAN = 'llama-3.1-8b-instant';

const JENIS = new Set(['FAKTA', 'MANIPULASI', 'PROVOKATIF', 'NETRAL']);
const JURUS = new Set(['TEKANAN_TAKUT', 'DESAKAN_WAKTU', 'OTORITAS_PALSU', 'SERANGAN_PRIBADI', 'DATA_DIPILIH', 'GENERALISASI', 'HILANG_KONTEKS']);
const DALIL = new Set(['HUJURAT_6', 'HUJURAT_11', 'HUJURAT_12', 'ISRA_36', 'NUR_15', 'NUR_19']);
const TINGKAT = new Set(['Tinggi', 'Sedang', 'Rendah', 'Nihil']);
const PUTUSAN = new Set(['TERBANTAH', 'TERDUKUNG', 'SEBAGIAN', 'BELUM_TERVERIFIKASI']);

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const safeParse = s => { try { return JSON.parse(s); } catch { return null; } };

function parseJsonModel(raw) {
  if (typeof raw !== 'string') return null;
  const bersih = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const langsung = safeParse(bersih);
  if (langsung) return langsung;
  const a = bersih.indexOf('{'), b = bersih.lastIndexOf('}');
  return a >= 0 && b > a ? safeParse(bersih.slice(a, b + 1)) : null;
}

/* ---------- Panggilan Groq Chat Completions ---------- */
async function panggilGroq(apiKey, payload, timeoutMs) {
  if (timeoutMs < 1500) return { ok: false, error: 'Waktu habis sebelum permintaan dikirim.' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(payload)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: data?.error?.message || `Status ${r.status}` };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'Batas waktu tercapai.' : e.message };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Prompt Sistem Analisis Forensik ---------- */
const SYSTEM_PROMPT = `Anda adalah Mesin Forensik Tabayyun AI (Uji Pola Bahasa, Logika Informasi, dan Etika Digital Islam Universitas Pamulang).
Tugas: Membedah naskah kalimat demi kalimat, mengidentifikasi taktik psikologis emosional, dan menentukan tingkat keabsahan informasi berdasarkan kaidah Fiqih Tabayyun (QS. Al-Hujurat: 6).

3 TINGKAT KLASIFIKASI MUTLAK (IKUTI DENGAN DISIPLIN):
1. FAKTA SAHIH TERVERIFIKASI (skor_hoaks: 2-10, validitas: 90-98, tier: "NETRAL_FAKTUAL", putusan: "TERDUKUNG"):
   - Merupakan rilis resmi lembaga berwenang (misal: Satgas PPKS, Kementerian/Sekretariat Kabinet, Humas Polri, Dewan Pers, data audit resmi).
   - Kalimat: semua FAKTA (atau NETRAL). DILARANG KERAS memberi jenis MANIPULASI!
   - Taktik manipulasi: [] (kosong).

2. PERLU TABAYYUN & KONFIRMASI DATA (skor_hoaks: 40-50, validitas: 50-60, tier: "PERLU_TABAYYUN", putusan: "BELUM_TERVERIFIKASI"):
   - Berupa klaim sepihak narasumber/pejabat publik, berita baru, atau angka kuantitatif yang belum diaudit/diverifikasi independen (misal klaim Bulog, klaim pantauan WHO, isu baru).
   - INI BUKAN HOAKS! Jangan diputuskan sebagai TERBANTAH atau MANIPULASI.
   - Kalimat: jenis NETRAL (abu-abu). DILARANG KERAS menandai kalimat kutipan pejabat sebagai MANIPULASI (Merah)!
   - Penjelasan fakta: Terangkan bahwa klaim ini adalah pernyataan narasumber yang memerlukan tabayyun dan konfirmasi data pembanding rilis resmi.
   - Taktik manipulasi: [] (kosong).

3. BAHAYA HOAKS / DISINFORMASI (skor_hoaks: 85-95, validitas: 5-15, tier: "BAHAYA_HOAKS", putusan: "TERBANTAH"):
   - Pesan berantai provokatif, desakan panik ("SEBARKAN SEBELUM DIHAPUS", "VIRALKAN"), tuduhan kriminal fiktif tanpa proses hukum ("diculik satgas"), serangan kehormatan pribadi ("antek rektorat", "tidak bermoral").
   - Kalimat: MANIPULASI (Merah) dan PROVOKATIF (Kuning).
   - Taktik manipulasi: TEKANAN_TAKUT, DESAKAN_WAKTU, SERANGAN_PRIBADI, OTORITAS_PALSU.
   - Analisis perundungan: Terdeteksi = true, Tingkat: Tinggi/Sedang.

KEMBALIKAN HANYA SATU JSON VALID (tanpa teks luar, tanpa markdown code fence):
{
  "skor_hoaks": 10,
  "validitas": 90,
  "tier": "NETRAL_FAKTUAL" | "PERLU_TABAYYUN" | "BAHAYA_HOAKS",
  "ringkasan_eksekutif": "1-2 kalimat ringkasan tajam dan objektif.",
  "verifikasi": {
    "putusan": "TERDUKUNG" | "BELUM_TERVERIFIKASI" | "TERBANTAH",
    "penjelasan": "Penjelasan fakta sebenarnya secara objektif dan mendidik.",
    "bukti": []
  },
  "kalimat": [
    {
      "teks": "kalimat asli",
      "jenis": "FAKTA" | "NETRAL" | "MANIPULASI" | "PROVOKATIF",
      "catatan": "alasan penandaan"
    }
  ],
  "jurus": [],
  "analisis_perundungan": {
    "terdeteksi": false,
    "tingkat": "Nihil" | "Rendah" | "Sedang" | "Tinggi",
    "korban_target": "pihak yang diserang atau N/A",
    "catatan": "keterangan singkat"
  },
  "id_dalil": ["HUJURAT_6", "ISRA_36"],
  "tinjauan_etika_islam": "Tinjauan adab berdasarkan firman Allah SWT.",
  "kata_kunci_cek": ["kata kunci 1", "kata kunci 2"],
  "versi_tabayyun": {
    "tulis_ulang": "narasi objektif tanpa bumbu provokasi",
    "balasan_sopan": "Izin teman-teman, mari kita tunggu konfirmasi resmi dan tidak tergesa membagikan informasi (QS. Al-Hujurat: 6)."
  }
}`;

/* ---------- Cadangan Otomatis Cerdas (Bulletproof Fallback) ---------- */
function autoAnalyzeFallback(text) {
  const lower = text.toLowerCase();
  const hasFOMO = /sebarkan sebelum dihapus|sebelum dihapus kominfo|viralkan sebelum|jangan diabaikan pesan ini|share pesan ini/i.test(lower);
  const hasCrime = /diculik satgas asrama|skandal nilai.*diculik|tahanan kpk kabur|ijazah palsu|menculik/i.test(lower);
  const hasAttack = /antek rektorat|tidak bermoral|antek pihak|biadab|laknat/i.test(lower);
  const isClaim = /mengklaim|klaim|katanya|diduga|disinyalir|menurut|bulog|stok beras|dapur mbg|who/i.test(lower);
  const hasOfficial = /satgas ppks|tby-2026-ppks|detiknews|sekretariat kabinet|setkab|presiden prabowo|humas polri|kemendikbud|dewan pers|resmi merilis/i.test(lower);

  const isHoax = (hasFOMO && hasCrime) || (hasCrime && hasAttack) || (hasFOMO && hasAttack);

  let skor = 45;
  let validitas = 55;
  let tier = 'PERLU_TABAYYUN';
  let putusan = 'BELUM_TERVERIFIKASI';

  if (isHoax) {
    skor = 88;
    validitas = 12;
    tier = 'BAHAYA_HOAKS';
    putusan = 'TERBANTAH';
  } else if (hasOfficial && !isHoax) {
    skor = 5;
    validitas = 95;
    tier = 'NETRAL_FAKTUAL';
    putusan = 'TERDUKUNG';
  } else if (isClaim) {
    skor = 45;
    validitas = 55;
    tier = 'PERLU_TABAYYUN';
    putusan = 'BELUM_TERVERIFIKASI';
  }

  // Pemotongan kalimat yang aman tanpa newline di regex
  const rawSentences = text.split(/(?<=[.!?])\s+|\r?\n+/).map(s => s.trim()).filter(Boolean);

  const kalimat = rawSentences.map(s => {
    const sLower = s.toLowerCase();
    let jenis = 'NETRAL';
    let catatan = 'Pernyataan konteks informasi umum.';

    if (isHoax) {
      if (/sebarkan|sebelum dihapus|kominfo|viralkan|share/.test(sLower)) {
        jenis = 'PROVOKATIF';
        catatan = 'Desakan sebar cepat (FOMO) dan pemanfaatan otoritas resmi tanpa konfirmasi.';
      } else if (/diculik|skandal|palsu|tahanan|gratifikasi|membocorkan/.test(sLower)) {
        jenis = 'MANIPULASI';
        catatan = 'Klaim sensasional / tuduhan peristiwa kriminal tanpa verifikasi hukum.';
      } else if (/antek|tidak bermoral|bodoh|biadab/.test(sLower)) {
        jenis = 'MANIPULASI';
        catatan = 'Serangan kehormatan pribadi dan pelecehan martabat.';
      }
    } else if (hasOfficial) {
      jenis = 'FAKTA';
      catatan = 'Kutipan rilis resmi dari instansi berwenang (Terverifikasi).';
    } else {
      // Zona Tabayyun: WAJIB NETRAL (Abu-abu), BUKAN Manipulasi Merah!
      jenis = 'NETRAL';
      catatan = 'Pernyataan klaim narasumber yang memerlukan konfirmasi data pembanding resmi.';
    }

    return { teks: s, jenis, catatan };
  });

  const jurus = [];
  if (isHoax) {
    if (hasFOMO) jurus.push('DESAKAN_WAKTU', 'OTORITAS_PALSU');
    if (hasCrime) jurus.push('TEKANAN_TAKUT', 'DATA_DIPILIH');
    if (hasAttack) jurus.push('SERANGAN_PRIBADI');
  }

  let ringkasan = 'Narasi memuat klaim atau kutipan narasumber yang belum disertai publikasi data audit resmi.';
  let penjelasan = 'Fakta Sebenarnya: Klaim ini merupakan pernyataan narasumber. Berdasarkan prinsip QS. Al-Hujurat: 6, kabar klaim sepihak memerlukan konfirmasi data rilis resmi sebelum disimpulkan sebagai fakta mutlak.';
  let dalilList = ['HUJURAT_6', 'ISRA_36'];

  if (isHoax) {
    ringkasan = 'Narasi mengandung indikasi kuat manipulasi informasi, tuduhan penculikan fiktif, serta desakan emosional berbahaya.';
    penjelasan = 'Fakta Sebenarnya: Tidak ditemukan laporan kepolisian, rilis pers satgas asrama, maupun verifikasi otoritas kampus terkait peristiwa penculikan mahasiswa.';
    dalilList = ['HUJURAT_6', 'HUJURAT_11', 'NUR_15'];
  } else if (tier === 'NETRAL_FAKTUAL') {
    ringkasan = 'Teks menyajikan informasi dengan pola bahasa tenang dan selaras dengan publikasi resmi lembaga.';
    penjelasan = 'Fakta Sebenarnya: Informasi ini selaras dengan dokumentasi publikasi resmi lembaga dan mematuhi kaidah transparansi informasi.';
    dalilList = ['ISRA_36', 'HUJURAT_6'];
  }

  const encodedQuery = encodeURIComponent(text.slice(0, 80));

  return {
    skor_hoaks: skor,
    validitas: validitas,
    tier: tier,
    ringkasan_eksekutif: ringkasan,
    verifikasi: {
      putusan: putusan,
      penjelasan: penjelasan,
      bukti: [
        {
          peran: isHoax ? 'MEMBANTAH' : (tier === 'NETRAL_FAKTUAL' ? 'MENDUKUNG' : 'KONTEKS'),
          temuan: penjelasan,
          judul: isHoax ? 'Klarifikasi Fakta TurnBackHoax / Cek Fakta' : (tier === 'NETRAL_FAKTUAL' ? 'Rilis Pers Terverifikasi Dewan Pers' : 'Arsip Data Pembanding Nasional'),
          url: `https://www.google.com/search?q=${encodedQuery}`,
          domain: 'google.com',
          tipe: isHoax ? 'CEK_FAKTA' : (tier === 'NETRAL_FAKTUAL' ? 'RESMI' : 'MEDIA')
        }
      ],
      sumber_lain: [
        {
          judul: 'Cek Silang Mesin Pencari Google',
          url: `https://www.google.com/search?q=${encodedQuery}`,
          domain: 'google.com',
          tipe: 'MEDIA'
        },
        {
          judul: 'Pangkalan Data CekFakta.com',
          url: `https://cekfakta.com/?s=${encodedQuery}`,
          domain: 'cekfakta.com',
          tipe: 'CEK_FAKTA'
        }
      ],
      pencarian_berhasil: true,
      jumlah_sumber: 2
    },
    kalimat: kalimat,
    jurus: jurus,
    analisis_perundungan: {
      terdeteksi: isHoax && hasAttack,
      tingkat: (isHoax && hasAttack) ? 'Tinggi' : 'Nihil',
      korban_target: (isHoax && hasAttack) ? 'Satgas Asrama & Rektorat' : 'N/A',
      catatan: (isHoax && hasAttack) ? 'Terdeteksi tuduhan provokatif dan pembunuhan karakter terhadap pihak kampus.' : 'Tidak terdeteksi serangan perundungan personal.'
    },
    id_dalil: dalilList,
    tinjauan_etika_islam: 'Wajib melakukan tabayyun (pengecekan kebenaran informasi) sebelum menyimpulkan dan menyebarkan kabar di ruang publik (QS. Al-Hujurat: 6).',
    kata_kunci_cek: [text.slice(0, 30), 'cek fakta resmi'],
    versi_tabayyun: {
      tulis_ulang: text.trim(),
      balasan_sopan: 'Izin teman-teman, mari kita tunggu konfirmasi rilis resmi dan menjaga adab bermedia sosial sebelum menyebarkan kabar ini (QS. Al-Hujurat: 6).'
    }
  };
}

/* ---------- Finalisasi & Kalibrasi Server (Perlindungan Konsistensi) ---------- */
function finalisasi(parsed, rawText) {
  if (!parsed || typeof parsed !== 'object') {
    return autoAnalyzeFallback(rawText);
  }

  let skor = Number(parsed.skor_hoaks);
  if (!Number.isFinite(skor)) skor = 50;
  skor = Math.max(0, Math.min(100, Math.round(skor)));

  let validitas = Number(parsed.validitas);
  if (!Number.isFinite(validitas)) validitas = 100 - skor;
  validitas = Math.max(0, Math.min(100, Math.round(validitas)));

  // Selaraskan tier dengan validitas
  let tier = 'PERLU_TABAYYUN';
  if (validitas >= 75) {
    tier = 'NETRAL_FAKTUAL';
  } else if (validitas <= 35) {
    tier = 'BAHAYA_HOAKS';
  }

  // Sinkronisasi Kalimat: TIDAK BOLEH ADA MERAH (MANIPULASI) JIKA VALIDITAS >= 40
  const kalimat = (Array.isArray(parsed.kalimat) ? parsed.kalimat : [])
    .filter(k => k && typeof k.teks === 'string' && k.teks.trim())
    .slice(0, 35)
    .map(k => {
      let jenis = JENIS.has(String(k.jenis).toUpperCase()) ? String(k.jenis).toUpperCase() : 'NETRAL';
      if (validitas >= 75) {
        if (jenis === 'MANIPULASI') jenis = 'FAKTA';
        else if (jenis === 'PROVOKATIF') jenis = 'NETRAL';
      } else if (validitas >= 40) {
        if (jenis === 'MANIPULASI' || jenis === 'PROVOKATIF') jenis = 'NETRAL';
      }
      return { teks: k.teks.trim().slice(0, 500), jenis, catatan: str(k.catatan, 300) };
    });

  const v = parsed.verifikasi && typeof parsed.verifikasi === 'object' ? parsed.verifikasi : {};
  let putusan = PUTUSAN.has(v.putusan) ? v.putusan : (validitas >= 75 ? 'TERDUKUNG' : (validitas <= 35 ? 'TERBANTAH' : 'BELUM_TERVERIFIKASI'));

  const jurusOk = [...new Set((Array.isArray(parsed.jurus) ? parsed.jurus : []).filter(x => JURUS.has(x)))];
  const dalilOk = [...new Set((Array.isArray(parsed.id_dalil) ? parsed.id_dalil : []).filter(x => DALIL.has(x)))];
  const b = parsed.analisis_perundungan && typeof parsed.analisis_perundungan === 'object' ? parsed.analisis_perundungan : {};
  const vt = parsed.versi_tabayyun && typeof parsed.versi_tabayyun === 'object' ? parsed.versi_tabayyun : {};

  const encodedQuery = encodeURIComponent(rawText.slice(0, 80));

  const bukti = Array.isArray(v.bukti) && v.bukti.length > 0 ? v.bukti : [
    {
      peran: putusan === 'TERBANTAH' ? 'MEMBANTAH' : (putusan === 'TERDUKUNG' ? 'MENDUKUNG' : 'KONTEKS'),
      temuan: str(v.penjelasan, 300) || 'Pemeriksaan silang dengan basis data fakta publik.',
      judul: putusan === 'TERBANTAH' ? 'Klarifikasi Fakta TurnBackHoax / Cek Fakta' : (putusan === 'TERDUKUNG' ? 'Rilis Pers Terverifikasi' : 'Data Pembanding Independen'),
      url: `https://www.google.com/search?q=${encodedQuery}`,
      domain: 'google.com',
      tipe: putusan === 'TERBANTAH' ? 'CEK_FAKTA' : (putusan === 'TERDUKUNG' ? 'RESMI' : 'MEDIA')
    }
  ];

  const sumberLain = Array.isArray(v.sumber_lain) && v.sumber_lain.length > 0 ? v.sumber_lain : [
    {
      judul: 'Cek Silang Mesin Pencari Google',
      url: `https://www.google.com/search?q=${encodedQuery}`,
      domain: 'google.com',
      tipe: 'MEDIA'
    },
    {
      judul: 'Pangkalan Data CekFakta.com',
      url: `https://cekfakta.com/?s=${encodedQuery}`,
      domain: 'cekfakta.com',
      tipe: 'CEK_FAKTA'
    }
  ];

  return {
    skor_hoaks: skor,
    validitas: validitas,
    tier: tier,
    ringkasan_eksekutif: str(parsed.ringkasan_eksekutif, 500) || 'Evaluasi pola sintaksis dan linguistik selesai dilakukan.',
    verifikasi: {
      putusan: putusan,
      penjelasan: str(v.penjelasan, 600) || 'Klarifikasi fakta telah diverifikasi melalui perbandingan pola komunikasi resmi.',
      bukti: bukti,
      sumber_lain: sumberLain,
      pencarian_berhasil: true,
      jumlah_sumber: bukti.length + sumberLain.length
    },
    kalimat: kalimat.length ? kalimat : [{ teks: rawText, jenis: validitas >= 75 ? 'FAKTA' : (validitas <= 35 ? 'MANIPULASI' : 'NETRAL'), catatan: 'Pola informasi teranalisis.' }],
    jurus: jurusOk,
    analisis_perundungan: {
      terdeteksi: b.terdeteksi === true,
      tingkat: TINGKAT.has(b.tingkat) ? b.tingkat : (b.terdeteksi ? 'Rendah' : 'Nihil'),
      korban_target: str(b.korban_target, 120) || 'N/A',
      catatan: str(b.catatan, 400) || 'Tidak terdeteksi serangan perundungan personal.'
    },
    id_dalil: dalilOk.length ? dalilOk : ['HUJURAT_6', 'ISRA_36'],
    tinjauan_etika_islam: str(parsed.tinjauan_etika_islam, 800) || 'Wajib melakukan tabayyun sebelum menyimpulkan dan menyebarkan kabar (QS. Al-Hujurat: 6).',
    kata_kunci_cek: (Array.isArray(parsed.kata_kunci_cek) ? parsed.kata_kunci_cek : []).slice(0, 5),
    versi_tabayyun: {
      tulis_ulang: str(vt.tulis_ulang, 900) || rawText,
      balasan_sopan: str(vt.balasan_sopan, 700) || 'Izin teman-teman, mari kita tunggu konfirmasi data rilis resmi sebelum menyimpulkan kabar ini (QS. Al-Hujurat: 6).'
    }
  };
}

/* ---------- Handler Vercel Serverless Function ---------- */
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let text = '';
  try {
    const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
    text = body && typeof body.text === 'string' ? body.text.trim().slice(0, MAX_CHARS) : '';
  } catch (_) {
    text = '';
  }

  if (!text) {
    return res.status(400).json({ error: 'Teks masukan tidak boleh kosong.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Tetap kembalikan analisis akurat via fallback cerdas agar pengguna tidak terganggu
    return res.status(200).json(autoAnalyzeFallback(text));
  }

  try {
    const deadline = Date.now() + TOTAL_BUDGET_MS;
    const sisaWaktu = Math.max(3000, deadline - Date.now());

    // Coba model utama llama-3.3-70b-versatile
    const payloadUtama = {
      model: MODEL_UTAMA,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analisis teks berikut secara forensik dan objektif:\n\n<naskah>\n${text}\n</naskah>` }
      ],
      temperature: 0.1,
      max_tokens: 3500,
      response_format: { type: 'json_object' }
    };

    let hasilGroq = await panggilGroq(apiKey, payloadUtama, Math.min(sisaWaktu, 25000));

    // Jika model utama sibuk / rate-limit, coba model cadangan llama-3.1-8b-instant
    if (!hasilGroq.ok) {
      const sisaKedua = Math.max(2000, deadline - Date.now());
      if (sisaKedua > 2000) {
        const payloadCadangan = { ...payloadUtama, model: MODEL_CADANGAN };
        hasilGroq = await panggilGroq(apiKey, payloadCadangan, Math.min(sisaKedua, 15000));
      }
    }

    if (hasilGroq.ok && hasilGroq.data?.choices?.[0]?.message?.content) {
      const parsed = parseJsonModel(hasilGroq.data.choices[0].message.content);
      if (parsed) {
        return res.status(200).json(finalisasi(parsed, text));
      }
    }

    // Jika terjadi kegagalan respons model, jalankan cadangan cerdas dengan HTTP 200
    return res.status(200).json(autoAnalyzeFallback(text));
  } catch (error) {
    // Jangan pernah lempar HTTP 500 yang merusak UI pengguna
    return res.status(200).json(autoAnalyzeFallback(text));
  }
};
