/**
 * Approximate center coordinates (lat, lng) and area (km²) for Norwegian municipalities.
 * Used to calculate IKS drone range requirements.
 * Source: Kartverket / SSB approximate centroids.
 */

export interface MunicipalityGeo {
  lat: number;
  lng: number;
  area_km2: number;
}

// Key municipalities appearing in IKS fire department groups + major ones
export const MUNICIPALITY_GEO: Record<string, MunicipalityGeo> = {
  // ─── ØST (Øvre Romerike) ───
  "Nes": { lat: 60.12, lng: 11.47, area_km2: 637 },
  "Ullensaker": { lat: 60.13, lng: 11.17, area_km2: 253 },
  "Nannestad": { lat: 60.22, lng: 11.00, area_km2: 341 },
  "Gjerdrum": { lat: 60.07, lng: 11.03, area_km2: 83 },
  "Eidsvoll": { lat: 60.33, lng: 11.26, area_km2: 456 },
  "Hurdal": { lat: 60.38, lng: 11.08, area_km2: 284 },
  // ─── Nedre Romerike ───
  "Lørenskog": { lat: 59.93, lng: 10.97, area_km2: 71 },
  "Rælingen": { lat: 59.93, lng: 11.07, area_km2: 72 },
  "Lillestrøm": { lat: 59.96, lng: 11.05, area_km2: 377 },
  "Nittedal": { lat: 60.07, lng: 10.87, area_km2: 186 },
  "Aurskog-Høland": { lat: 59.72, lng: 11.50, area_km2: 961 },
  // ─── Follo ───
  "Nordre Follo": { lat: 59.79, lng: 10.80, area_km2: 203 },
  "Ås": { lat: 59.66, lng: 10.79, area_km2: 101 },
  "Frogn": { lat: 59.65, lng: 10.65, area_km2: 86 },
  "Vestby": { lat: 59.60, lng: 10.75, area_km2: 134 },
  "Nesodden": { lat: 59.67, lng: 10.63, area_km2: 61 },
  "Enebakk": { lat: 59.73, lng: 11.10, area_km2: 233 },
  // ─── Indre Østfold ───
  "Indre Østfold": { lat: 59.60, lng: 11.40, area_km2: 781 },
  "Marker": { lat: 59.50, lng: 11.70, area_km2: 413 },
  "Rakkestad": { lat: 59.43, lng: 11.35, area_km2: 427 },
  // ─── MOVAR ───
  "Moss": { lat: 59.44, lng: 10.68, area_km2: 139 },
  "Våler": { lat: 59.48, lng: 10.87, area_km2: 257 },
  "Råde": { lat: 59.35, lng: 10.85, area_km2: 122 },
  // ─── Oslo / ABBR ───
  "Oslo": { lat: 59.91, lng: 10.75, area_km2: 454 },
  "Asker": { lat: 59.83, lng: 10.44, area_km2: 376 },
  "Bærum": { lat: 59.89, lng: 10.52, area_km2: 191 },
  // ─── Innlandet: Hedmarken ───
  "Hamar": { lat: 60.79, lng: 11.07, area_km2: 351 },
  "Stange": { lat: 60.70, lng: 11.17, area_km2: 724 },
  "Løten": { lat: 60.82, lng: 11.35, area_km2: 369 },
  // ─── Glåmdal ───
  "Kongsvinger": { lat: 60.19, lng: 12.00, area_km2: 1036 },
  "Eidskog": { lat: 59.98, lng: 12.00, area_km2: 639 },
  "Nord-Odal": { lat: 60.40, lng: 11.55, area_km2: 509 },
  "Sør-Odal": { lat: 60.24, lng: 11.60, area_km2: 517 },
  "Grue": { lat: 60.42, lng: 12.10, area_km2: 836 },
  "Åsnes": { lat: 60.63, lng: 11.87, area_km2: 1040 },
  // ─── Nord-Østerdalen ───
  "Tynset": { lat: 62.28, lng: 10.77, area_km2: 1880 },
  "Tolga": { lat: 62.18, lng: 11.03, area_km2: 1112 },
  "Alvdal": { lat: 62.11, lng: 10.63, area_km2: 942 },
  "Folldal": { lat: 62.13, lng: 10.00, area_km2: 1561 },
  "Rendalen": { lat: 61.72, lng: 11.10, area_km2: 3216 },
  "Stor-Elvdal": { lat: 61.42, lng: 11.05, area_km2: 2165 },
  "Engerdal": { lat: 61.72, lng: 11.80, area_km2: 1941 },
  // ─── Gudbrandsdal ───
  "Ringebu": { lat: 61.53, lng: 10.17, area_km2: 1291 },
  "Nord-Fron": { lat: 61.60, lng: 9.92, area_km2: 1140 },
  "Sør-Fron": { lat: 61.55, lng: 10.00, area_km2: 730 },
  "Sel": { lat: 61.87, lng: 9.83, area_km2: 879 },
  "Dovre": { lat: 62.07, lng: 9.57, area_km2: 1365 },
  "Lesja": { lat: 62.10, lng: 8.60, area_km2: 2182 },
  "Lom": { lat: 61.83, lng: 8.57, area_km2: 1969 },
  "Vågå": { lat: 61.88, lng: 9.25, area_km2: 1571 },
  "Skjåk": { lat: 61.90, lng: 8.00, area_km2: 2092 },
  // ─── Valdres ───
  "Nord-Aurdal": { lat: 60.90, lng: 9.30, area_km2: 906 },
  "Sør-Aurdal": { lat: 60.60, lng: 9.60, area_km2: 1099 },
  "Etnedal": { lat: 60.78, lng: 9.67, area_km2: 444 },
  "Vestre Slidre": { lat: 61.07, lng: 9.17, area_km2: 427 },
  "Øystre Slidre": { lat: 61.12, lng: 9.40, area_km2: 962 },
  "Vang": { lat: 61.12, lng: 8.63, area_km2: 1505 },
  // ─── Hadeland ───
  "Gran": { lat: 60.37, lng: 10.53, area_km2: 681 },
  "Lunner": { lat: 60.28, lng: 10.60, area_km2: 290 },
  "Nordre Land": { lat: 60.78, lng: 10.10, area_km2: 963 },
  "Søndre Land": { lat: 60.60, lng: 10.17, area_km2: 719 },
  // ─── Toten ───
  "Østre Toten": { lat: 60.72, lng: 10.72, area_km2: 522 },
  "Vestre Toten": { lat: 60.65, lng: 10.52, area_km2: 245 },
  // ─── Gjøvik / Lillehammer ───
  "Gjøvik": { lat: 60.80, lng: 10.70, area_km2: 672 },
  "Lillehammer": { lat: 61.12, lng: 10.47, area_km2: 478 },
  "Øyer": { lat: 61.25, lng: 10.42, area_km2: 639 },
  "Gausdal": { lat: 61.20, lng: 10.03, area_km2: 1192 },
  "Ringsaker": { lat: 60.88, lng: 10.95, area_km2: 1280 },
  "Elverum": { lat: 60.88, lng: 11.57, area_km2: 1229 },
  "Trysil": { lat: 61.32, lng: 12.25, area_km2: 3014 },
  // ─── SØR-ØST ───
  "Drammen": { lat: 59.74, lng: 10.20, area_km2: 304 },
  "Lier": { lat: 59.78, lng: 10.25, area_km2: 302 },
  "Øvre Eiker": { lat: 59.77, lng: 9.90, area_km2: 457 },
  "Holmestrand": { lat: 59.49, lng: 10.30, area_km2: 421 },
  "Ringerike": { lat: 60.17, lng: 10.25, area_km2: 1555 },
  "Hole": { lat: 60.05, lng: 10.30, area_km2: 136 },
  "Jevnaker": { lat: 60.23, lng: 10.40, area_km2: 228 },
  "Modum": { lat: 59.85, lng: 9.97, area_km2: 517 },
  "Sigdal": { lat: 60.10, lng: 9.60, area_km2: 848 },
  "Krødsherad": { lat: 60.17, lng: 9.63, area_km2: 354 },
  "Flå": { lat: 60.42, lng: 9.50, area_km2: 703 },
  "Nesbyen": { lat: 60.57, lng: 9.10, area_km2: 772 },
  "Gol": { lat: 60.70, lng: 8.95, area_km2: 532 },
  "Hemsedal": { lat: 60.87, lng: 8.57, area_km2: 752 },
  "Ål": { lat: 60.63, lng: 8.57, area_km2: 1079 },
  "Hol": { lat: 60.63, lng: 8.30, area_km2: 1702 },
  "Nore og Uvdal": { lat: 60.40, lng: 9.00, area_km2: 2505 },
  "Flesberg": { lat: 59.88, lng: 9.57, area_km2: 564 },
  "Rollag": { lat: 59.97, lng: 9.33, area_km2: 440 },
  "Kongsberg": { lat: 59.67, lng: 9.65, area_km2: 792 },
  "Tønsberg": { lat: 59.27, lng: 10.42, area_km2: 329 },
  "Færder": { lat: 59.22, lng: 10.40, area_km2: 104 },
  "Sandefjord": { lat: 59.13, lng: 10.22, area_km2: 422 },
  "Larvik": { lat: 59.05, lng: 10.03, area_km2: 813 },
  "Horten": { lat: 59.42, lng: 10.48, area_km2: 71 },
  "Skien": { lat: 59.21, lng: 9.60, area_km2: 779 },
  "Porsgrunn": { lat: 59.14, lng: 9.66, area_km2: 163 },
  "Bamble": { lat: 59.00, lng: 9.60, area_km2: 304 },
  "Kragerø": { lat: 58.87, lng: 9.40, area_km2: 306 },
  "Drangedal": { lat: 59.10, lng: 9.10, area_km2: 1061 },
  "Siljan": { lat: 59.28, lng: 9.73, area_km2: 216 },
  "Nome": { lat: 59.27, lng: 9.30, area_km2: 429 },
  "Midt-Telemark": { lat: 59.38, lng: 9.23, area_km2: 519 },
  "Notodden": { lat: 59.57, lng: 9.27, area_km2: 915 },
  "Hjartdal": { lat: 59.67, lng: 8.90, area_km2: 788 },
  "Tinn": { lat: 59.88, lng: 8.77, area_km2: 2054 },
  "Vinje": { lat: 59.57, lng: 7.83, area_km2: 3105 },
  "Tokke": { lat: 59.53, lng: 8.00, area_km2: 954 },
  "Seljord": { lat: 59.50, lng: 9.00, area_km2: 711 },
  "Kviteseid": { lat: 59.40, lng: 8.47, area_km2: 680 },
  "Nissedal": { lat: 59.15, lng: 8.53, area_km2: 900 },
  "Fyresdal": { lat: 59.17, lng: 8.10, area_km2: 1300 },
  // ─── AGDER ───
  "Kristiansand": { lat: 58.15, lng: 8.00, area_km2: 560 },
  "Lindesnes": { lat: 58.10, lng: 7.35, area_km2: 928 },
  "Farsund": { lat: 58.10, lng: 6.80, area_km2: 268 },
  "Flekkefjord": { lat: 58.30, lng: 6.65, area_km2: 544 },
  "Lund": { lat: 58.37, lng: 6.67, area_km2: 370 },
  "Kvinesdal": { lat: 58.30, lng: 6.97, area_km2: 963 },
  "Sirdal": { lat: 58.83, lng: 6.65, area_km2: 1549 },
  "Arendal": { lat: 58.46, lng: 8.77, area_km2: 271 },
  "Grimstad": { lat: 58.34, lng: 8.60, area_km2: 304 },
  "Lillesand": { lat: 58.25, lng: 8.38, area_km2: 190 },
  "Birkenes": { lat: 58.33, lng: 8.23, area_km2: 675 },
  "Froland": { lat: 58.53, lng: 8.63, area_km2: 642 },
  "Åmli": { lat: 58.80, lng: 8.50, area_km2: 1130 },
  "Vegårshei": { lat: 58.67, lng: 8.87, area_km2: 355 },
  "Gjerstad": { lat: 58.73, lng: 9.02, area_km2: 324 },
  "Risør": { lat: 58.72, lng: 9.23, area_km2: 193 },
  "Tvedestrand": { lat: 58.62, lng: 8.93, area_km2: 214 },
  "Vennesla": { lat: 58.28, lng: 7.97, area_km2: 383 },
  "Iveland": { lat: 58.45, lng: 8.07, area_km2: 251 },
  "Evje og Hornnes": { lat: 58.58, lng: 7.93, area_km2: 552 },
  "Bygland": { lat: 58.87, lng: 7.80, area_km2: 1199 },
  "Valle": { lat: 59.17, lng: 7.53, area_km2: 1307 },
  "Bykle": { lat: 59.38, lng: 7.40, area_km2: 1467 },
  "Hægebostad": { lat: 58.40, lng: 7.30, area_km2: 461 },
  "Åseral": { lat: 58.60, lng: 7.35, area_km2: 898 },
  // ─── SØR-VEST (Rogaland) ───
  "Stavanger": { lat: 58.97, lng: 5.73, area_km2: 241 },
  "Sandnes": { lat: 58.85, lng: 5.73, area_km2: 303 },
  "Sola": { lat: 58.88, lng: 5.58, area_km2: 70 },
  "Randaberg": { lat: 59.00, lng: 5.62, area_km2: 25 },
  "Klepp": { lat: 58.77, lng: 5.63, area_km2: 115 },
  "Time": { lat: 58.73, lng: 5.67, area_km2: 182 },
  "Gjesdal": { lat: 58.73, lng: 6.00, area_km2: 610 },
  "Hå": { lat: 58.60, lng: 5.67, area_km2: 257 },
  "Eigersund": { lat: 58.45, lng: 5.98, area_km2: 390 },
  "Bjerkreim": { lat: 58.58, lng: 6.02, area_km2: 576 },
  "Strand": { lat: 59.02, lng: 6.05, area_km2: 218 },
  "Hjelmeland": { lat: 59.23, lng: 6.17, area_km2: 1092 },
  "Suldal": { lat: 59.50, lng: 6.37, area_km2: 1731 },
  "Sauda": { lat: 59.65, lng: 6.35, area_km2: 587 },
  "Tysvær": { lat: 59.37, lng: 5.50, area_km2: 421 },
  "Haugesund": { lat: 59.41, lng: 5.27, area_km2: 73 },
  "Karmøy": { lat: 59.28, lng: 5.30, area_km2: 228 },
  "Bokn": { lat: 59.22, lng: 5.45, area_km2: 47 },
  "Vindafjord": { lat: 59.52, lng: 5.93, area_km2: 617 },
  "Etne": { lat: 59.67, lng: 5.93, area_km2: 710 },
  "Stord": { lat: 59.78, lng: 5.50, area_km2: 144 },
  "Fitjar": { lat: 59.93, lng: 5.32, area_km2: 133 },
  "Bømlo": { lat: 59.77, lng: 5.22, area_km2: 247 },
  "Kvitsøy": { lat: 59.07, lng: 5.40, area_km2: 6 },
  // ─── VEST (Bergen/Vestland) ───
  "Bergen": { lat: 60.39, lng: 5.32, area_km2: 464 },
  "Øygarden": { lat: 60.50, lng: 4.90, area_km2: 304 },
  "Askøy": { lat: 60.47, lng: 5.17, area_km2: 100 },
  "Alver": { lat: 60.63, lng: 5.20, area_km2: 598 },
  "Osterøy": { lat: 60.52, lng: 5.60, area_km2: 299 },
  "Vaksdal": { lat: 60.48, lng: 5.75, area_km2: 694 },
  "Samnanger": { lat: 60.40, lng: 5.75, area_km2: 253 },
  "Bjørnafjorden": { lat: 60.18, lng: 5.55, area_km2: 488 },
  "Austevoll": { lat: 60.07, lng: 5.22, area_km2: 117 },
  "Tysnes": { lat: 60.05, lng: 5.52, area_km2: 255 },
  "Kvam": { lat: 60.40, lng: 6.17, area_km2: 616 },
  "Voss": { lat: 60.63, lng: 6.42, area_km2: 1839 },
  "Ullensvang": { lat: 60.07, lng: 6.65, area_km2: 4645 },
  "Eidfjord": { lat: 60.47, lng: 7.07, area_km2: 1491 },
  "Ulvik": { lat: 60.57, lng: 6.92, area_km2: 720 },
  "Sogndal": { lat: 61.23, lng: 7.10, area_km2: 1253 },
  "Luster": { lat: 61.45, lng: 7.45, area_km2: 2709 },
  "Aurland": { lat: 60.90, lng: 7.20, area_km2: 1470 },
  "Lærdal": { lat: 61.10, lng: 7.48, area_km2: 1340 },
  "Årdal": { lat: 61.25, lng: 7.70, area_km2: 978 },
  "Høyanger": { lat: 61.22, lng: 6.07, area_km2: 914 },
  "Gulen": { lat: 61.02, lng: 5.08, area_km2: 597 },
  "Solund": { lat: 61.07, lng: 4.83, area_km2: 224 },
  "Hyllestad": { lat: 61.22, lng: 5.30, area_km2: 255 },
  "Masfjorden": { lat: 60.83, lng: 5.38, area_km2: 556 },
  "Modalen": { lat: 60.83, lng: 5.60, area_km2: 382 },
  "Fedje": { lat: 60.78, lng: 4.72, area_km2: 9 },
  "Austrheim": { lat: 60.73, lng: 5.13, area_km2: 58 },
  // ─── MØRE OG ROMSDAL ───
  "Ålesund": { lat: 62.47, lng: 6.15, area_km2: 713 },
  "Molde": { lat: 62.73, lng: 7.17, area_km2: 1500 },
  "Kristiansund": { lat: 63.12, lng: 7.73, area_km2: 87 },
  "Volda": { lat: 62.15, lng: 6.07, area_km2: 527 },
  "Ørsta": { lat: 62.20, lng: 6.13, area_km2: 806 },
  "Ulstein": { lat: 62.33, lng: 5.85, area_km2: 94 },
  "Herøy (Møre)": { lat: 62.33, lng: 5.60, area_km2: 123 },
  "Hareid": { lat: 62.37, lng: 5.97, area_km2: 81 },
  "Sula": { lat: 62.42, lng: 5.98, area_km2: 58 },
  "Giske": { lat: 62.50, lng: 5.93, area_km2: 41 },
  "Sykkylven": { lat: 62.38, lng: 6.58, area_km2: 330 },
  "Stranda": { lat: 62.30, lng: 6.93, area_km2: 865 },
  "Fjord": { lat: 62.25, lng: 7.00, area_km2: 1271 },
  "Vestnes": { lat: 62.63, lng: 7.12, area_km2: 405 },
  "Rauma": { lat: 62.57, lng: 7.70, area_km2: 1503 },
  "Hustadvika": { lat: 62.93, lng: 7.15, area_km2: 458 },
  "Aukra": { lat: 62.83, lng: 6.60, area_km2: 60 },
  "Averøy": { lat: 63.03, lng: 7.05, area_km2: 175 },
  "Gjemnes": { lat: 62.95, lng: 7.60, area_km2: 369 },
  "Tingvoll": { lat: 62.92, lng: 8.18, area_km2: 342 },
  "Sunndal": { lat: 62.67, lng: 8.57, area_km2: 1712 },
  "Surnadal": { lat: 62.97, lng: 8.73, area_km2: 1361 },
  "Aure": { lat: 63.15, lng: 8.35, area_km2: 641 },
  "Heim": { lat: 63.15, lng: 9.07, area_km2: 1026 },
  "Smøla": { lat: 63.37, lng: 8.02, area_km2: 272 },
  // ─── TRØNDELAG ───
  "Trondheim": { lat: 63.43, lng: 10.40, area_km2: 342 },
  "Stjørdal": { lat: 63.47, lng: 10.90, area_km2: 937 },
  "Malvik": { lat: 63.43, lng: 10.68, area_km2: 168 },
  "Melhus": { lat: 63.28, lng: 10.30, area_km2: 658 },
  "Skaun": { lat: 63.32, lng: 10.12, area_km2: 247 },
  "Midtre Gauldal": { lat: 63.00, lng: 10.27, area_km2: 1823 },
  "Orkland": { lat: 63.30, lng: 9.85, area_km2: 1666 },
  "Selbu": { lat: 63.23, lng: 11.05, area_km2: 1254 },
  "Tydal": { lat: 63.08, lng: 11.75, area_km2: 1223 },
  "Holtålen": { lat: 62.82, lng: 11.30, area_km2: 1194 },
  "Røros": { lat: 62.57, lng: 11.38, area_km2: 1956 },
  "Oppdal": { lat: 62.60, lng: 9.68, area_km2: 2274 },
  "Rennebu": { lat: 62.83, lng: 10.00, area_km2: 960 },
  "Ørland": { lat: 63.70, lng: 9.67, area_km2: 329 },
  "Åfjord": { lat: 63.95, lng: 10.22, area_km2: 1128 },
  "Indre Fosen": { lat: 63.68, lng: 10.15, area_km2: 643 },
  "Frøya": { lat: 63.72, lng: 8.67, area_km2: 242 },
  "Hitra": { lat: 63.58, lng: 8.82, area_km2: 573 },
  "Steinkjer": { lat: 64.02, lng: 11.50, area_km2: 1564 },
  "Levanger": { lat: 63.75, lng: 11.30, area_km2: 646 },
  "Verdal": { lat: 63.80, lng: 11.48, area_km2: 1547 },
  "Inderøy": { lat: 63.87, lng: 11.30, area_km2: 293 },
  "Snåsa": { lat: 64.22, lng: 12.38, area_km2: 2397 },
  "Meråker": { lat: 63.42, lng: 11.75, area_km2: 1274 },
  "Frosta": { lat: 63.62, lng: 10.73, area_km2: 75 },
  "Namsos": { lat: 64.47, lng: 11.50, area_km2: 1419 },
  "Overhalla": { lat: 64.47, lng: 12.00, area_km2: 730 },
  "Grong": { lat: 64.47, lng: 12.30, area_km2: 1133 },
  "Høylandet": { lat: 64.58, lng: 12.17, area_km2: 751 },
  "Nærøysund": { lat: 64.87, lng: 11.47, area_km2: 1129 },
  "Flatanger": { lat: 64.50, lng: 10.82, area_km2: 461 },
  "Osen": { lat: 64.43, lng: 10.35, area_km2: 435 },
  "Lierne": { lat: 64.47, lng: 13.75, area_km2: 2962 },
  "Røyrvik": { lat: 64.87, lng: 14.00, area_km2: 1424 },
  "Namsskogan": { lat: 64.90, lng: 13.15, area_km2: 1417 },
  "Leka": { lat: 65.10, lng: 11.57, area_km2: 109 },
  // ─── NORDLAND ───
  "Bodø": { lat: 67.28, lng: 14.40, area_km2: 1395 },
  "Fauske": { lat: 67.25, lng: 15.40, area_km2: 1114 },
  "Saltdal": { lat: 66.85, lng: 15.38, area_km2: 2111 },
  "Beiarn": { lat: 66.95, lng: 14.97, area_km2: 1192 },
  "Meløy": { lat: 66.85, lng: 13.70, area_km2: 887 },
  "Gildeskål": { lat: 67.07, lng: 14.25, area_km2: 662 },
  "Sørfold": { lat: 67.30, lng: 15.80, area_km2: 1648 },
  "Steigen": { lat: 67.80, lng: 15.20, area_km2: 1034 },
  "Hamarøy": { lat: 68.07, lng: 15.57, area_km2: 1845 },
  "Narvik": { lat: 68.43, lng: 17.43, area_km2: 3273 },
  "Evenes": { lat: 68.53, lng: 16.55, area_km2: 242 },
  "Tjeldsund": { lat: 68.55, lng: 16.27, area_km2: 465 },
  "Sortland": { lat: 68.70, lng: 15.40, area_km2: 718 },
  "Øksnes": { lat: 68.78, lng: 14.97, area_km2: 317 },
  "Andøy": { lat: 69.08, lng: 15.88, area_km2: 654 },
  "Hadsel": { lat: 68.55, lng: 14.83, area_km2: 563 },
  "Bø (Nordland)": { lat: 68.70, lng: 14.50, area_km2: 228 },
  "Lødingen": { lat: 68.40, lng: 16.00, area_km2: 530 },
  "Vestvågøy": { lat: 68.17, lng: 13.83, area_km2: 411 },
  "Flakstad": { lat: 68.08, lng: 13.23, area_km2: 178 },
  "Moskenes": { lat: 68.00, lng: 13.08, area_km2: 118 },
  "Vågan": { lat: 68.25, lng: 14.57, area_km2: 477 },
  "Røst": { lat: 67.52, lng: 12.10, area_km2: 11 },
  "Værøy": { lat: 67.68, lng: 12.70, area_km2: 19 },
  "Rana": { lat: 66.32, lng: 14.17, area_km2: 4462 },
  "Vefsn": { lat: 65.83, lng: 13.20, area_km2: 1849 },
  "Grane": { lat: 65.47, lng: 13.10, area_km2: 1896 },
  "Hattfjelldal": { lat: 65.58, lng: 13.97, area_km2: 2711 },
  "Herøy (Nordland)": { lat: 66.00, lng: 12.30, area_km2: 63 },
  "Alstahaug": { lat: 65.88, lng: 12.48, area_km2: 188 },
  "Leirfjord": { lat: 66.00, lng: 12.85, area_km2: 463 },
  "Dønna": { lat: 66.12, lng: 12.47, area_km2: 188 },
  "Nesna": { lat: 66.20, lng: 13.00, area_km2: 185 },
  "Lurøy": { lat: 66.40, lng: 12.80, area_km2: 260 },
  "Rødøy": { lat: 66.65, lng: 13.50, area_km2: 706 },
  "Træna": { lat: 66.50, lng: 12.08, area_km2: 18 },
  "Brønnøy": { lat: 65.47, lng: 12.20, area_km2: 1027 },
  "Sømna": { lat: 65.28, lng: 12.10, area_km2: 194 },
  "Vega": { lat: 65.67, lng: 11.90, area_km2: 164 },
  "Vevelstad": { lat: 65.67, lng: 12.45, area_km2: 515 },
  "Bindal": { lat: 65.10, lng: 12.30, area_km2: 1228 },
  // ─── TROMS ───
  "Tromsø": { lat: 69.65, lng: 19.00, area_km2: 2558 },
  "Harstad": { lat: 68.80, lng: 16.54, area_km2: 435 },
  "Senja": { lat: 69.17, lng: 17.15, area_km2: 1862 },
  "Målselv": { lat: 69.00, lng: 18.33, area_km2: 3322 },
  "Balsfjord": { lat: 69.22, lng: 19.17, area_km2: 1493 },
  "Bardu": { lat: 68.80, lng: 18.35, area_km2: 2539 },
  "Salangen": { lat: 68.75, lng: 18.20, area_km2: 457 },
  "Lavangen": { lat: 68.73, lng: 17.97, area_km2: 304 },
  "Gratangen": { lat: 68.72, lng: 17.00, area_km2: 324 },
  "Ibestad": { lat: 68.82, lng: 17.08, area_km2: 241 },
  "Dyrøy": { lat: 69.08, lng: 17.98, area_km2: 289 },
  "Lyngen": { lat: 69.57, lng: 20.18, area_km2: 812 },
  "Storfjord": { lat: 69.22, lng: 20.15, area_km2: 1471 },
  "Kåfjord": { lat: 69.42, lng: 20.50, area_km2: 951 },
  "Skjervøy": { lat: 70.03, lng: 20.97, area_km2: 477 },
  "Nordreisa": { lat: 69.77, lng: 21.00, area_km2: 3438 },
  "Kvænangen": { lat: 69.78, lng: 21.92, area_km2: 2104 },
  "Karlsøy": { lat: 69.97, lng: 19.60, area_km2: 1056 },
  // ─── FINNMARK ───
  "Alta": { lat: 69.97, lng: 23.27, area_km2: 3849 },
  "Hammerfest": { lat: 70.66, lng: 23.68, area_km2: 2723 },
  "Nordkapp": { lat: 71.08, lng: 25.78, area_km2: 935 },
  "Porsanger": { lat: 70.05, lng: 25.00, area_km2: 4873 },
  "Karasjok": { lat: 69.47, lng: 25.52, area_km2: 5453 },
  "Kautokeino": { lat: 69.00, lng: 23.03, area_km2: 9708 },
  "Tana": { lat: 70.00, lng: 27.00, area_km2: 3923 },
  "Nesseby": { lat: 70.15, lng: 28.73, area_km2: 1439 },
  "Lebesby": { lat: 70.67, lng: 26.48, area_km2: 3461 },
  "Gamvik": { lat: 71.07, lng: 28.23, area_km2: 1414 },
  "Berlevåg": { lat: 70.85, lng: 29.08, area_km2: 1120 },
  "Båtsfjord": { lat: 70.63, lng: 29.72, area_km2: 1434 },
  "Vardø": { lat: 70.37, lng: 31.11, area_km2: 599 },
  "Vadsø": { lat: 70.07, lng: 29.75, area_km2: 1257 },
  "Sør-Varanger": { lat: 69.73, lng: 30.05, area_km2: 3971 },
  "Loppa": { lat: 70.35, lng: 21.45, area_km2: 690 },
  "Hasvik": { lat: 70.48, lng: 22.15, area_km2: 557 },
  "Måsøy": { lat: 70.83, lng: 24.93, area_km2: 1116 },
  // ─── Øst ───
  "Fredrikstad": { lat: 59.22, lng: 10.93, area_km2: 290 },
  "Sarpsborg": { lat: 59.28, lng: 11.10, area_km2: 405 },
  "Halden": { lat: 59.13, lng: 11.38, area_km2: 642 },
  "Aremark": { lat: 59.22, lng: 11.70, area_km2: 322 },
  "Hvaler": { lat: 59.07, lng: 10.98, area_km2: 90 },
};

/**
 * Haversine distance between two lat/lng points (in km).
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Estimate "radius" of a municipality assuming circular shape.
 */
export function estimatedRadiusKm(area_km2: number): number {
  return Math.sqrt(area_km2 / Math.PI);
}

export interface IksRangeResult {
  /** The municipality chosen as geographic center */
  centerMunicipality: string;
  /** Distance from center to the far edge of each member municipality */
  distances: { municipality: string; distToCenter: number; radius: number; distToEdge: number }[];
  /** Maximum distance = minimum drone range requirement */
  maxRangeKm: number;
}

/**
 * Calculate minimum drone range for an IKS.
 * Picks the geographic centroid of all member municipalities as the "station" point,
 * then finds which member's far edge is furthest away.
 */
export function calculateIksRange(municipalities: string[]): IksRangeResult | null {
  const geos = municipalities
    .map(m => ({ name: m, geo: MUNICIPALITY_GEO[m] }))
    .filter(m => m.geo != null);

  if (geos.length < 2) return null;

  // Geographic centroid
  const centerLat = geos.reduce((s, g) => s + g.geo!.lat, 0) / geos.length;
  const centerLng = geos.reduce((s, g) => s + g.geo!.lng, 0) / geos.length;

  // Find the municipality closest to the centroid (= best station location)
  let closestIdx = 0;
  let closestDist = Infinity;
  geos.forEach((g, i) => {
    const d = haversineKm(centerLat, centerLng, g.geo!.lat, g.geo!.lng);
    if (d < closestDist) { closestDist = d; closestIdx = i; }
  });

  const center = geos[closestIdx];

  // Calculate distance from center to the far edge of each municipality
  const distances = geos.map(g => {
    const distToCenter = haversineKm(
      center.geo!.lat, center.geo!.lng,
      g.geo!.lat, g.geo!.lng
    );
    const radius = estimatedRadiusKm(g.geo!.area_km2);
    return {
      municipality: g.name,
      distToCenter: Math.round(distToCenter * 10) / 10,
      radius: Math.round(radius * 10) / 10,
      distToEdge: Math.round((distToCenter + radius) * 10) / 10,
    };
  });

  const maxRangeKm = Math.max(...distances.map(d => d.distToEdge));

  return {
    centerMunicipality: center.name,
    distances: distances.sort((a, b) => b.distToEdge - a.distToEdge),
    maxRangeKm: Math.round(maxRangeKm),
  };
}
