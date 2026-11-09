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
Anda adalah Tabayyun AI Checker untuk mahasiswa (Etika Medsos & Verifikasi Nilai Islam).
Analisis teks ini secara ringkas, to the point:
"${text}"

Balas HANYA JSON murni format ini:
{
    "status": "BAHAYA_HOAKS_BULLYING",
    "judul_status": "Status Singkat",
    "deskripsi_status": "Penjelasan 1 kalimat",
    "analisis_fakta": "Fakta berita atau kebenarannya",
    "analisis_perundungan": "Apakah ada unsur bullying atau pencemaran nama baik",
    "tinjauan_islam": "Dalil Al-Qur'an (Tabayyun Al-Hujurat 6/11) dan saran mahasiswa"
}
`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: promptText }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    maxOutputTokens: 600
                }
            })
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: data.error?.message || `Google API Error (${response.status})` 
            });
        }

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(rawText);

        return res.status(200).json(parsed);

    } catch (err) {
        if (err.name === 'AbortError') {
            return res.status(504).json({ error: 'Koneksi ke AI timeout (server Google sibuk). Silakan klik verifikasi lagi.' });
        }
        return res.status(500).json({ error: err.message });
    }
};
