# Domain Cleaner (Chrome Extension)

Secili sekmenin domaini icin cache ve site verilerini temizleyen Chrome eklentisi.

## Ozellikler
- Aktif sekmenin `origin`/`hostname` bilgisini algilar.
- Veri temizleme secenekleri:
  - HTTP Cache
  - Cache Storage
  - Cookies
  - Local Storage
  - Session Storage
  - IndexedDB
  - Service Workers
  - File System API
  - WebSQL
  - AppCache (Legacy)
- Hazir secim butonlari:
  - Sadece Onbellek
  - Site Verileri
  - Hepsini Sec
- `Temizle + Yenile` ile secilen verileri temizler ve sekmeyi/sekmeleri yeniler.
- 3G ve 4G profilinde yenileme yapar.
- Aktif URL'yi gizli pencerede acar.
- `HSTS Kaydini Sil (Ac)` ile `chrome://net-internals/#hsts` sayfasini acar.
- Son temizleme sonucu, ayni tab icin popup kapanip acilsa da korunur.
- Klavye kisayolu destegi:
  - varsayilan onerilen tus: `Alt+Shift+D`
  - ayarlama: `chrome://extensions/shortcuts` (popup icinden de acilabilir)

## Kurulum
1. Chrome'da `chrome://extensions` sayfasini ac.
2. `Developer mode` aktif et.
3. `Load unpacked` sec ve bu klasoru sec.
4. Gerekirse `Reload` ile eklentiyi yenile.

## Smoke Test Checklist
1. `http/https` bir sayfada popup aciliyor ve domain dogru gorunuyor.
2. Birkac secenek secip `Temizle + Yenile` calisiyor, status/counter guncelleniyor.
3. Temizlenmeyen metriklerde `0` rozet gosterilmiyor.
4. Popup kapat-ac yapinca (ayni tab) son status/counter/rozetler korunuyor.
5. `Tumu domain sekmelerini yenile` acikken ayni kok domaine ait birden fazla sekmede islem yapiliyor.
6. 3G/4G butonlari sekmeyi yeniliyor.
7. `Klavye Kisayolu Ayarla` butonu `chrome://extensions/shortcuts` sayfasini aciyor.
8. `HSTS Kaydini Sil (Ac)` sayfasi aciliyor.
9. `Gizli Pencere` butonu aktif URL'yi incognito pencerede aciyor (izin aciksa).

## Notlar
- Eklenti sadece `http/https` sekmelerde calisir.
- `chrome://` veya uzanti sayfalarinda calismaz.
- Bazi cookie turleri tarayici kisitlari nedeniyle silinemeyebilir.
- Gizli pencere acma ozelligi icin extension detayindan `Allow in incognito` aktif edilmelidir.

