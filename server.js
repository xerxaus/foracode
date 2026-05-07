const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('public')); // Ön yüz dosyaları için
app.use('/uploads', express.static('uploads')); // Çıkarılan SCORM/HTML5 dosyaları için

// Yükleme klasörlerini oluştur
const uploadDir = path.join(__dirname, 'temp_uploads');
const extractDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir);

// Multer (Zip yükleme) ayarları
const upload = multer({ dest: 'temp_uploads/' });

// 1. ZIP Yükleme ve Çıkarma Endpoint'i
app.post('/upload', upload.single('package'), (req, res) => {
    if (!req.file) return res.status(400).send('Dosya yüklenmedi.');

    const folderName = Date.now().toString() + '_' + req.file.originalname.replace('.zip', '');
    const targetPath = path.join(extractDir, folderName);
    
    try {
        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(targetPath, true);
        
        // Ana dosyayı bul (Articulate için story.html, Lumi/H5P için index.html vb.)
        let mainFile = 'index.html';
        if (fs.existsSync(path.join(targetPath, 'story.html'))) {
            mainFile = 'story.html';
        } else if (fs.existsSync(path.join(targetPath, 'index_lms.html'))) {
            mainFile = 'index_lms.html';
        }

        // Geçici zip dosyasını sil
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            folder: folderName,
            url: `/uploads/${folderName}/${mainFile}`
        });
    } catch (err) {
        res.status(500).send('Zip çıkarma hatası: ' + err.message);
    }
});

// 2. Yüklenen Paketleri Listeleme (Yönetim için)
app.get('/files', (req, res) => {
    fs.readdir(extractDir, (err, files) => {
        if (err) return res.status(500).send('Dizin okunamadı.');
        res.json(files);
    });
});

// 3. Paket Silme
app.delete('/delete/:folderName', (req, res) => {
    const folderPath = path.join(extractDir, req.params.folderName);
    if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
        res.json({ success: true });
    } else {
        res.status(404).send('Klasör bulunamadı.');
    }
});

app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
