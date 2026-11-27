<div align="center">

# 🧱 BlokDiyar

**Tarayıcıda çalışan 3D blok, keşif ve çok oyunculu sandbox dünyası**

<br>

[![Sürüm](https://img.shields.io/badge/S%C3%BCr%C3%BCm-v97-2ea44f?style=for-the-badge)](#)
[![Motor](https://img.shields.io/badge/Three.js-r128-049ef4?style=for-the-badge&logo=threedotjs&logoColor=white)](#)
[![Altyapı](https://img.shields.io/badge/Firebase-Realtime_DB-ffca28?style=for-the-badge&logo=firebase&logoColor=black)](#)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Mobil-8a2be2?style=for-the-badge)](#)

<br>

<a href="#özellikler"><kbd>&nbsp;&nbsp;✨ Özellikler&nbsp;&nbsp;</kbd></a>
<a href="#kontroller"><kbd>&nbsp;&nbsp;🎮 Kontroller&nbsp;&nbsp;</kbd></a>
<a href="#yapı-örneği"><kbd>&nbsp;&nbsp;🏰 Yapı Örneği&nbsp;&nbsp;</kbd></a>
<a href="#proje-yapısı"><kbd>&nbsp;&nbsp;📁 Klasörler&nbsp;&nbsp;</kbd></a>

</div>

---

## ✨ Özellikler

* **🌍 3D Dünya:** Düz, gökyüzü ve normal dünyalar, blok kırma/koyma ve hazır yapılar.
* **⚒️ Üretim & Pazar:** Çalışma masası, fırın, sandık, eşya üretimi ve pazar sistemi.
* **👥 Çok Oyunculu:** Oda kurma, açık odalar ve davet koduyla birlikte oyun.
* **📱 Esnek Kontrol:** Klavye + fare ve dokunmatik ekran desteği.

---

## 🎮 Kontroller

| Hareket | Masaüstü | Mobil |
| :--- | :---: | :---: |
| **Yürüme** | `W` `A` `S` `D` | Joystick |
| **Zıplama** | `Space` | **Zıpla** |
| **Blok Kır / Koy** | Fare | **Kır** / **Koy** |
| **Saldırı** | Sol Tık | **⚔️** |

---

## 🏰 Yapı Örneği

<div align="center">

<img src="assets/ornek-yapi.png" alt="Taş zemin, tahta çatı, cam pencere ve yaprak detayları olan blok ev modeli" width="360" />

</div>

*Bloklar: `TUGLA` çatı • `TAHTA` üst kat ve bölme • `CAM` pencere • `TAS` alt duvar ve basamak*

```text
[TUGLA] [TUGLA] [TUGLA] [TUGLA] [TUGLA] [TUGLA] [TUGLA]
[TAHTA] [CAM]   [TAHTA] [TAHTA] [TAHTA] [CAM]   [TAHTA]
[TAHTA] [TAHTA] [TAHTA] [TAHTA] [TAHTA] [TAHTA] [TAHTA]
[TAS]   [CAM]   [TAS]   [KAPI]  [TAS]   [CAM]   [TAS]
[TAS]   [TAS]   [TAS]   [BASAM] [TAS]   [TAS]   [TAS]
