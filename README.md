# 🌍 BlokDiyar

BlokDiyar, web tabanlı, çok oyunculu ve 3D dünyalar inşa edebileceğin, Firebase altyapısıyla güçlendirilmiş açık kaynaklı bir tarayıcı oyunudur. Oyuncular kendi dünyalarını kurabilir, odalarını yönetebilir ve toplulukla paylaşabilirler.

---

## 🛡️ Gelişmiş Yönetici (Admin) Paneli

Proje, oyun içi ekosistemi ve oyuncu verilerini tamamen kontrol altında tutabilmek için özel bir **Admin Paneli (`admin.html`)** barındırır. Bu panel yalnızca yetkili admin hesabıyla (`mecaga5354@blokdiyar.app`) güvenli bir şekilde çalışır.

### ✨ Admin Paneli Özellikleri:
1. **Kullanıcı Yönetimi:**
   - Kayıtlı tüm oyuncuları ve e-posta/profil bilgilerini listeleme.
   - Tek tıkla şifre sıfırlama e-postası gönderme.
   - Oyuncu hesaplarını ve veritabanındaki tüm verilerini tamamen temizleme / silme.
2. **Kademeli Dünya ve Oda Denetimi:**
   - Oyuncuların üzerine tıklayarak oluşturdukları dünyaları listeleyebilme.
   - Her dünyanın üzerine basarak **Oda Ayarlarını & Özelliklerini** detaylıca inceleyebilme ve JSON düzenleyici ile güncelleyebilme.
3. **Anlık Görünürlük Kontrolü (Herkese Aç / Özel):**
   - Dünyaları tek tıkla **Herkese Açık** hale getirme (Firebase `rooms` ve `publicRooms` yollarıyla tam senkronizasyon).
   - İstenilen odayı anında **Özel Yaparak (Kapatarak)** aktif listeden kaldırma.
   - İstenmeyen veya zararlı dünyaları veritabanından tamamen **Silme**.
4. **Hızlı Toplu İşlemler:**
   - Tek tuşla sistemdeki tüm dünyaları ve kanalları anında herkese açık duruma getirme.

---

## 🛠️ Teknolojiler

- **Frontend:** HTML5, CSS3, JavaScript (ES Modules)
- **Backend & Database:** Firebase Realtime Database
- **Authentication:** Firebase Auth (Admin yetkilendirmesi)
- **Host:** GitHub Pages

---

## 🚀 Kurulum ve Çalıştırma

1. Projeyi klonlayın veya indirin:
   ```bash
   git clone [https://github.com/mecaga/ticarium.git](https://github.com/mecaga/ticarium.git)
