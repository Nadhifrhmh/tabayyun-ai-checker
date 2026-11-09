export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Teks tidak boleh kosong.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ 
            error: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables Vercel.' 
        });
    }

    const systemInstruction = `
    Anda adalah 'Tabayyun AI Checker', asisten cerdas verifikasi informasi dan etika digital mahasiswa berbasis nilai-nilai Islam dan jurnalisme fakta.
    Tugas Anda adalah menelaah teks dari pengguna:
    1. Analisis apakah ada indikasi HOAKS / Disinformasi / Klaim tanpa bukti.
    2. Analisis apakah teks mengandung perundungan siber (cyberbullying), pelecehan verbal, ghibah, atau fitnah.
    3. Berikan tinjauan etika Islam (prinsip Tabayyun QS. Al-Hujurat: 6, menjaga kehormatan sesama QS. Al-Hujurat: 11, serta asas praduga tak bersalah).
    4. Tentukan status akhir: 'BAHAYA_HOAKS_BULLYING' atau 'PERLU_TABAYYUN' atau 'AMAN_FAKTUAL'.

    KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON BERIKUT (tanpa pembungkus markdown apapun):
    {
        "status": "BAHAYA_HOAKS_BULLYING" | "PERLU_TABAYYUN" | "AMAN_FAKTUAL",
        "judul_status": "Judul status singkat",
        "deskripsi_status": "Penjelasan singkat mengenai status",
        "analisis_fakta": "Penjelasan fakta vs klaim palsu/belum terbukti",
        "analisis_perundungan": "Apakah merendahkan martabat orang lain atau membuka aib",
        "tinjauan_islam": "Nasihat dan dalil Al-Qur'an/Hadits yang relevan serta anjuran tindakan bagi mahasiswa"
    }
    `;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: systemInstruction + "\n\nBerikut teks yang harus dianalisis:\n" + text }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return res.status(response.status).json({ 
                error: errData.error?.message || `Gemini API Error (HTTP ${response.status})` 
            });
        }

        const data = await response.json();
        const rawJson = data.candidates?.[0]?.
