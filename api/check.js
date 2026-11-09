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

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ 
            error: 'GROQ_API_KEY belum dikonfigurasi di Environment Variables Vercel.' 
        });
    }

    const systemPrompt = `
Anda adalah Tabayyun AI Checker untuk mahasiswa (Etika Medsos & Verifikasi Nilai Islam).
Tugas Anda menganalisis teks dari pengguna secara ringkas, to the point, dan bijak.
KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON VALID BERIKUT (tanpa pembungkus markdown apapun):
{
    "status": "BAHAYA_HOAKS_BULLYING",
    "judul_status": "Status Singkat",
    "deskripsi_status": "Penjelasan singkat status",
    "analisis_fakta": "Fakta berita atau kebenarannya",
    "analisis_perundungan": "Apakah ada indikasi perundungan siber atau pencemaran nama baik",
    "tinjauan_islam": "Prinsip Tabayyun QS. Al-Hujurat ayat 6 dan 11 serta saran mahasiswa"
}
Opsi nilai status: 'BAHAYA_HOAKS_BULLYING', 'PERLU_TABAYYUN', atau 'AMAN_FAKTUAL'.
`;

    try {
        // 1. Dapatkan model aktif dari akun Groq secara dinamis
        let modelName = 'llama3-8b-8192';
        try {
            const listRes = await fetch('https://api.groq.com/openai/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (listRes.ok) {
                const listData = await listRes.json();
                const ids = (listData.data || []).map(m => m.id);
                // Pilih model yang ada
                const found = ids.find(id => id.includes('llama3') || id.includes('mixtral') || id.includes('gemma'));
                if (found) modelName = found;
            }
        } catch (e) {
            // fallback
        }

        // 2. Kirim permintaan
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Analisis teks berikut:\n"${text}"` }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: data.error?.message || `Groq API Error (${response.status})` 
            });
        }

        const content = data.choices?.[0]?.message?.content;
        const parsed = JSON.parse(content);

        return res.status(200).json(parsed);

    } catch (err) {
        return res.status(500).json({ error: 'Terjadi kesalahan: ' + err.message });
    }
};
