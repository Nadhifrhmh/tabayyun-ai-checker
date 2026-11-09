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
Analisis teks ini secara singkat dan to the point:
"${text}"

Balas HANYA JSON murni tanpa format markdown apapun:
{
    "status": "BAHAYA_HOAKS_BULLYING",
    "judul_status": "Status Singkat",
    "deskripsi_status": "Penjelasan ringkas status",
    "analisis_fakta": "Fakta berita atau kebenarannya",
    "analisis_perundungan": "Apakah ada unsur cyberbullying atau pencemaran nama baik",
    "tinjauan_islam": "Prinsip Tabayyun QS. Al-Hujurat 6/11 dan saran mahasiswa"
}
`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: promptText }] }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 500
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: data.error?.message || `Google API Error (${response.status})` 
            });
        }

        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
        if (rawText.startsWith('```json')) {
            rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (rawText.startsWith('```')) {
            rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(rawText);
        return res.status(200).json(parsed);

    } catch (err) {
        return res.status(500).json({ error: 'Terjadi kendala: ' + err.message });
    }
};
