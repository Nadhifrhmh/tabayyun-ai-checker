module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Teks tidak boleh kosong.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ 
            error: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables Vercel.' 
        });
    }

    const promptText = `
Anda adalah 'Tabayyun AI Checker', asisten cerdas verifikasi informasi dan etika digital mahasiswa berbasis nilai-nilai Islam dan jurnalisme fakta.
Tugas Anda adalah menelaah teks dari pengguna:
1. Analisis apakah ada indikasi HOAKS / Disinformasi / Klaim tanpa bukti.
2. Analisis apakah teks mengandung perundungan siber (cyberbullying), pelecehan verbal, ghibah, atau fitnah.
3. Berikan tinjauan etika Islam (prinsip Tabayyun QS. Al-Hujurat: 6, menjaga kehormatan sesama QS. Al-Hujurat: 11, serta asas praduga tak bersalah).
4. Tentukan status akhir: 'BAHAYA_HOAKS_BULLYING' atau 'PERLU_TABAYYUN' atau 'AMAN_FAKTUAL'.

Berikut teks yang harus dianalisis:
"${text}"

KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON VALID BERIKUT (jangan tambahkan teks pengantar apapun):
{
    "status": "BAHAYA_HOAKS_BULLYING",
    "judul_status": "Judul status singkat",
    "deskripsi_status": "Penjelasan singkat mengenai status",
    "analisis_fakta": "Penjelasan fakta vs klaim palsu/belum terbukti",
    "analisis_perundungan": "Apakah merendahkan martabat orang lain atau membuka aib",
    "tinjauan_islam": "Nasihat dan dalil Al-Qur'an/Hadits yang relevan serta anjuran tindakan bagi mahasiswa"
}
`;

    // Daftar model aktif resmi Google
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'];
    let errorDetail = '';

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: promptText }]
                        }
                    ]
                })
            });

            const data = await response.json();

            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                let rawText = data.candidates[0].content.parts[0].text.trim();
                // Bersihkan pembungkus markdown jika ada
                if (rawText.startsWith('```json')) {
                    rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (rawText.startsWith('```')) {
                    rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }

                const parsed = JSON.parse(rawText);
                return res.status(200).json(parsed);
            } else {
                errorDetail = data.error?.message || `Error pada model ${model}`;
            }
        } catch (e) {
            errorDetail = e.message;
        }
    }

    return res.status(500).json({ error: errorDetail || 'Semua model AI sedang sibuk.' });
};
