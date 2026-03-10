import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Play, Users, Plus, LogIn, Crown, Clock, 
  Trophy, ArrowRight, CheckCircle, XCircle, 
  Share2, RefreshCw, Star, Zap, User, Sparkles, Bot, Volume2, VolumeX
} from 'lucide-react';
import { 
  initializeApp 
} from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot 
} from 'firebase/firestore';

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyBbOk7SKfWHHo382MQx7hZ3cCdJDOtQmyc",
  authDomain: "isim-sehir-online-49a06.firebaseapp.com",
  projectId: "isim-sehir-online-49a06",
  storageBucket: "isim-sehir-online-49a06.firebasestorage.app",
  messagingSenderId: "516400795880",
  appId: "1:516400795880:web:9032edf79db1598db6b95d"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'isim-sehir-online';

// --- CONSTANTS & CONFIG ---
// Ğ harfi ile kelime başlamadığı için çıkarıldı, Türkçe harfler eklendi.
const ALPHABET = "ABCÇDEFGHIİJKLMNOÖPRSŞTUÜVYZ".split("");
const DEFAULT_CATEGORIES = ["İsim", "Şehir", "Hayvan", "Bitki", "Eşya", "Sanatçı"];

const AVATARS = [
  "👽", "🤖", "🦊", "🦖", "🦄", "🐼", "🐸", "🐱", "🐶", "🦁", "🐯", "🐰", "👻", "💩"
];

// --- SOUND ENGINE (Web Audio API) ---
let GLOBAL_MUTED = false;
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

export const playSound = (name) => {
  if (GLOBAL_MUTED || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const playTone = (freq, type, duration, vol=0.1) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  };

  switch(name) {
    case 'pop': playTone(400, 'sine', 0.1, 0.1); break;
    case 'tick': playTone(800, 'triangle', 0.05, 0.05); break;
    case 'ding': 
      playTone(523.25, 'sine', 0.2, 0.15); // C5
      setTimeout(() => playTone(659.25, 'sine', 0.3, 0.15), 100); // E5
      break;
    case 'win':
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
        setTimeout(() => playTone(f, 'square', 0.4, 0.1), i * 150);
      });
      break;
    case 'error': playTone(150, 'sawtooth', 0.3, 0.1); break;
    default: break;
  }
};

// --- HELPER FUNCTIONS ---
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Benzersiz harf seçici (aynı odada tekrar çıkmaması için)
const getUnusedLetter = (usedLetters = []) => {
  const available = ALPHABET.filter(l => !usedLetters.includes(l));
  if (available.length === 0) return ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; // Hepsi kullanıldıysa (çok nadir)
  return available[Math.floor(Math.random() * available.length)];
};

// Genişletilmiş Oyun Sözlüğü (Sadece Türkçe, 81 İl ve Sanatçılar eklendi)
const GAME_DICTIONARY = {
  'İsim': [
    'Abbas', 'Abdullah', 'Açelya', 'Adem', 'Adil', 'Adnan', 'Ahmet', 'Ahu', 'Akın', 'Alp', 'Alper', 'Ali', 'Alican', 'Alperen', 'Altay', 'Arda', 'Arif', 'Arzu', 'Aslı', 'Aslıhan', 'Asuman', 'Asya', 'Atakan', 'Atilla', 'Aybike', 'Aycan', 'Ayça', 'Aydan', 'Aydın', 'Ayfer', 'Aykut', 'Ayla', 'Aylin', 'Aysel', 'Aysun', 'Ayşe', 'Ayşegül', 'Ayşen', 'Aytekin', 'Ayten', 'Aziz', 'Azize', 'Azra',
    'Bahadır', 'Bahar', 'Banu', 'Baran', 'Barış', 'Başak', 'Batu', 'Batuhan', 'Baturay', 'Bedia', 'Bedirhan', 'Begüm', 'Behzat', 'Belgin', 'Belma', 'Bengü', 'Berat', 'Berfin', 'Beril', 'Berkay', 'Berna', 'Berrak', 'Beste', 'Betül', 'Beyza', 'Bilal', 'Bilge', 'Bircan', 'Birgül', 'Birol', 'Birsen', 'Bora', 'Buğra', 'Buket', 'Bulut', 'Burak', 'Burcu', 'Burçin', 'Burhan', 'Buse', 'Bülent', 'Büşra',
    'Cahit', 'Can', 'Canan', 'Canberk', 'Candan', 'Caner', 'Cansu', 'Cavidan', 'Celal', 'Cem', 'Cemal', 'Cemil', 'Cemile', 'Cemre', 'Cengiz', 'Cenk', 'Ceren', 'Ceyda', 'Ceyhun', 'Ceylan', 'Cihan', 'Cihat', 'Coşkun', 'Cuma', 'Cüneyt',
    'Çağatay', 'Çağdaş', 'Çağla', 'Çağlar', 'Çağrı', 'Çetin', 'Çiğdem', 'Çise', 'Çisem',
    'Damla', 'Davut', 'Defne', 'Demet', 'Demir', 'Deniz', 'Derin', 'Derya', 'Destan', 'Devrim', 'Dicle', 'Didem', 'Dilara', 'Dilek', 'Diren', 'Doğa', 'Doğan', 'Doğu', 'Doğukan', 'Dora', 'Doruk', 'Döne', 'Duygu',
    'Ebru', 'Ece', 'Eda', 'Edip', 'Efe', 'Ege', 'Egemen', 'Ejder', 'Ekrem', 'Ela', 'Elif', 'Elmas', 'Elvan', 'Emin', 'Emine', 'Emir', 'Emirhan', 'Emre', 'Ender', 'Enes', 'Engin', 'Enis', 'Enver', 'Ercan', 'Erciyes', 'Erdal', 'Erdem', 'Erdi', 'Eren', 'Ergin', 'Ergun', 'Erhan', 'Erkan', 'Erol', 'Ersin', 'Ertuğrul', 'Esat', 'Esin', 'Esma', 'Esra', 'Eşref', 'Ethem', 'Evren', 'Evrim', 'Eylem', 'Eylül', 'Ezgi',
    'Fadime', 'Fahir', 'Fahri', 'Fahriye', 'Faruk', 'Fatih', 'Fatma', 'Fatoş', 'Fazıl', 'Fehmi', 'Ferdi', 'Ferhat', 'Feridun', 'Feriha', 'Ferit', 'Fethiye', 'Fevzi', 'Feyyaz', 'Feyza', 'Fidan', 'Fikret', 'Fikri', 'Fikriye', 'Filiz', 'Firdevs', 'Fuat', 'Fulden', 'Fulya', 'Funda', 'Furkan',
    'Galip', 'Gamze', 'Gani', 'Garip', 'Gaye', 'Gazi', 'Gencer', 'Genco', 'Gizem', 'Gonca', 'Gökçe', 'Gökhan', 'Göksel', 'Göksu', 'Göktuğ', 'Gönül', 'Görkem', 'Gözde', 'Gül', 'Gülay', 'Gülbahar', 'Gülcan', 'Gülçin', 'Gülden', 'Gülhan', 'Gülizar', 'Güllü', 'Gülnur', 'Gülşen', 'Gülten', 'Günay', 'Güneş', 'Günhan', 'Güray', 'Gürbüz', 'Gürkan', 'Gürol', 'Gürsel', 'Güven', 'Güzin',
    'Habib', 'Habibe', 'Hacer', 'Hafize', 'Hakan', 'Hakkı', 'Haldun', 'Hale', 'Halil', 'Halim', 'Halime', 'Halis', 'Halit', 'Haluk', 'Hamdi', 'Hami', 'Hamit', 'Handan', 'Hande', 'Hanife', 'Harun', 'Hasan', 'Hasibe', 'Hasret', 'Haşmet', 'Hatice', 'Hayati', 'Haydar', 'Hayrettin', 'Hayri', 'Hayriye', 'Hayrünnisa', 'Hazal', 'Hazar', 'Hediye', 'Hıdır', 'Hıfzı', 'Hicran', 'Hidayet', 'Hikmet', 'Hilal', 'Hilmi', 'Himmet', 'Hira', 'Hulusi', 'Huriye', 'Hurşit', 'Hülya', 'Hüma', 'Hürriyet', 'Hüsamettin', 'Hüseyin', 'Hüsnü',
    'Ilgaz', 'Irmak', 'Işık', 'Işıl', 'Işılay', 'Itır',
    'İbrahim', 'İclal', 'İdris', 'İffet', 'İhsan', 'İkbal', 'İlayda', 'İlhan', 'İlkay', 'İlker', 'İlknur', 'İlyas', 'İmdat', 'İnci', 'İpek', 'İrem', 'İrfan', 'İsa', 'İshak', 'İskender', 'İslam', 'İsmail', 'İsmet', 'İstem', 'İsrafil', 'İzzet', 'İzzettin',
    'Jale', 'Janset', 'Jülide',
    'Kaan', 'Kadir', 'Kadri', 'Kadriye', 'Kağan', 'Kahraman', 'Kamber', 'Kamil', 'Kamile', 'Kamuran', 'Kasım', 'Kaya', 'Kayahan', 'Kazım', 'Kelami', 'Kemal', 'Kenan', 'Kerem', 'Kerim', 'Keriman', 'Kezban', 'Kılıç', 'Kıymet', 'Kibariye', 'Kutay', 'Kutlu', 'Kuzey', 'Kübra', 'Kürşat',
    'Lale', 'Lami', 'Lamia', 'Latif', 'Latife', 'Leman', 'Lemide', 'Lerzan', 'Levent', 'Leyla', 'Lütfi', 'Lütfiye', 'Lütfü',
    'Macit', 'Mahir', 'Mahmut', 'Mahur', 'Makbule', 'Mansur', 'Mazhar', 'Mecit', 'Medine', 'Mehmet', 'Mehtap', 'Melih', 'Meliha', 'Melik', 'Melike', 'Melis', 'Melisa', 'Meltem', 'Memduh', 'Mert', 'Mertcan', 'Merve', 'Meryem', 'Mesut', 'Mete', 'Metehan', 'Metin', 'Mevlüt', 'Meyra', 'Mısra', 'Mihriban', 'Mina', 'Mine', 'Mira', 'Miraç', 'Miray', 'Mithat', 'Mualla', 'Muammer', 'Mucize', 'Muhammed', 'Muhammet', 'Muharrem', 'Muhsin', 'Muhterem', 'Mukadder', 'Mukaddes', 'Murat', 'Musa', 'Mustafa', 'Mutlu', 'Muzaffer', 'Mücella', 'Mücahit', 'Müfit', 'Müge', 'Müjdat', 'Müjde', 'Mükerrem', 'Mükremin', 'Mülayim', 'Mümin', 'Mümine', 'Mümtaz', 'Münerver', 'Münir', 'Münire', 'Müslüm', 'Müşerref', 'Müzeyyen',
    'Naci', 'Naciye', 'Nadir', 'Nadire', 'Nafiz', 'Nagehan', 'Nahit', 'Nail', 'Naile', 'Naim', 'Naime', 'Nalan', 'Nalın', 'Namık', 'Narin', 'Nasihat', 'Nasip', 'Nasrettin', 'Nazan', 'Nazım', 'Nazif', 'Nazife', 'Nazlı', 'Nazmi', 'Nazmiye', 'Nebi', 'Nebahat', 'Nebil', 'Nebile', 'Necati', 'Necla', 'Necmettin', 'Necmi', 'Necmiye', 'Nedim', 'Nedime', 'Nehir', 'Nejat', 'Nejla', 'Nergis', 'Nermin', 'Nesim', 'Nesimi', 'Neslihan', 'Nesrin', 'Neşe', 'Neşet', 'Nevin', 'Nevzat', 'Nezahat', 'Nezih', 'Nezihe', 'Nida', 'Nihal', 'Nihan', 'Nihat', 'Nil', 'Nilay', 'Nilgün', 'Nilüfer', 'Nimet', 'Nisa', 'Nisan', 'Niyazi', 'Nizamettin', 'Numan', 'Nur', 'Nural', 'Nuran', 'Nuray', 'Nurcan', 'Nurdan', 'Nurgül', 'Nurhan', 'Nuri', 'Nuriye', 'Nursel', 'Nursen', 'Nurten', 'Nusret',
    'Oğuz', 'Oğuzhan', 'Okan', 'Okay', 'Oktay', 'Olcay', 'Onur', 'Orhan', 'Orçun', 'Osman', 'Oya', 'Ozan',
    'Öcal', 'Öge', 'Ömer', 'Ömür', 'Önder', 'Öner', 'Övünç', 'Öykü', 'Özay', 'Özcan', 'Özden', 'Özer', 'Özge', 'Özgür', 'Özhan', 'Özkan', 'Özlem', 'Özlen', 'Özüm',
    'Pamir', 'Pars', 'Paşa', 'Pekcan', 'Peker', 'Pelin', 'Pelinsu', 'Perihan', 'Perran', 'Pervin', 'Petek', 'Pınar', 'Piraye', 'Polat', 'Poyraz', 'Püren',
    'Rabia', 'Raci', 'Rafi', 'Rafet', 'Ragıp', 'Rahim', 'Rahime', 'Rahmi', 'Rahmiye', 'Raif', 'Rakım', 'Ramazan', 'Ramiz', 'Rasim', 'Raşit', 'Rauf', 'Rebia', 'Recep', 'Recai', 'Refik', 'Refika', 'Reha', 'Remzi', 'Remziye', 'Renan', 'Rengin', 'Resul', 'Reşat', 'Reşit', 'Reyhan', 'Rezan', 'Rıdvan', 'Rıfat', 'Rıfkı', 'Rıza', 'Ruhi', 'Ruhan', 'Ruken', 'Ruşen', 'Rüstem', 'Rüya', 'Rüzgar',
    'Saadet', 'Sabahattin', 'Saban', 'Sabri', 'Sabriye', 'Sacit', 'Sacide', 'Sadettin', 'Sadık', 'Sadri', 'Sadullah', 'Safa', 'Saffet', 'Sait', 'Sakıp', 'Salih', 'Saliha', 'Salim', 'Salime', 'Sami', 'Samiye', 'Samet', 'Sanberk', 'Sancak', 'Saniye', 'Sarp', 'Savaş', 'Sayan', 'Saygın', 'Seçil', 'Seçkin', 'Seda', 'Sedat', 'Sefa', 'Sefer', 'Seher', 'Selahattin', 'Selami', 'Selçuk', 'Selda', 'Selen', 'Selin', 'Selim', 'Selime', 'Selma', 'Selman', 'Selmin', 'Serap', 'Serdar', 'Seren', 'Serenay', 'Serhat', 'Serkan', 'Sermet', 'Serpil', 'Sertaç', 'Servet', 'Sevda', 'Sevgi', 'Sevil', 'Sevilay', 'Sevim', 'Sevinç', 'Seyfi', 'Seyfettin', 'Seyhan', 'Seyit', 'Sezai', 'Sezgin', 'Sezin', 'Sıla', 'Sıtkı', 'Sırma', 'Sibel', 'Simge', 'Sinan', 'Sinem', 'Soner', 'Songül', 'Su', 'Suat', 'Sude', 'Sudi', 'Sultan', 'Suna', 'Sunay', 'Suriye', 'Suphi', 'Süleyman', 'Sümbül', 'Sümer', 'Sümeyra', 'Sümeyye', 'Süreyya',
    'Şaban', 'Şadi', 'Şadiye', 'Şafak', 'Şahap', 'Şahin', 'Şahika', 'Şamil', 'Şaziye', 'Şebnem', 'Şecaattin', 'Şefik', 'Şefika', 'Şehrazat', 'Şehriban', 'Şelale', 'Şemsettin', 'Şemsi', 'Şenol', 'Şenay', 'Şengül', 'Şennur', 'Şeref', 'Şermin', 'Şevket', 'Şevki', 'Şevval', 'Şeyda', 'Şeyma', 'Şinasi', 'Şiir', 'Şimal', 'Şirin', 'Şükran', 'Şükrü', 'Şükriye', 'Şule',
    'Taceddin', 'Taci', 'Taha', 'Tahir', 'Tahsin', 'Talat', 'Talha', 'Talu', 'Tamer', 'Tan', 'Taner', 'Tanju', 'Tansel', 'Tansu', 'Tarık', 'Tarkan', 'Taşkın', 'Tayfun', 'Tayfur', 'Taylan', 'Tayyar', 'Tayyip', 'Tebessüm', 'Tecer', 'Tekin', 'Teksen', 'Temel', 'Teoman', 'Tercan', 'Terim', 'Teslime', 'Tevfik', 'Tezcan', 'Tınaz', 'Timur', 'Timuçin', 'Toker', 'Tolga', 'Tolgahan', 'Toprak', 'Toygar', 'Tuba', 'Tufan', 'Tugay', 'Tuğba', 'Tuğçe', 'Tuğkan', 'Tuğra', 'Tuğrul', 'Tuğsan', 'Tuna', 'Tunahan', 'Tuncay', 'Tuncer', 'Tunç', 'Turan', 'Turgay', 'Turgut', 'Turhan', 'Tülay', 'Tülin', 'Türkan', 'Türker',
    'Ufuk', 'Uğur', 'Uğurcan', 'Ulaş', 'Uluç', 'Ulvi', 'Ulviye', 'Umut', 'Umur', 'Unsur', 'Ural', 'Uraz', 'Utku', 'Uyar', 'Uysal', 'Uzay',
    'Ülker', 'Ülkü', 'Ümit', 'Ümmiye', 'Ümran', 'Ünal', 'Ünlem', 'Ünsal', 'Ünzile', 'Üstün', 'Üzeyir',
    'Vahap', 'Vahdet', 'Vahide', 'Vahit', 'Valid', 'Valide', 'Vural', 'Varol', 'Vasfi', 'Vasfiye', 'Vatan', 'Vedat', 'Vefa', 'Vefik', 'Vehbi', 'Veli', 'Verda', 'Veysel', 'Veysi', 'Vicdan', 'Vildan', 'Volkan', 'Vuslat',
    'Yahya', 'Yakut', 'Yakup', 'Yalçın', 'Yalgın', 'Yalın', 'Yaman', 'Yankı', 'Yasin', 'Yasemin', 'Yaşar', 'Yavuz', 'Yekta', 'Yelda', 'Yeliz', 'Yener', 'Yılmaz', 'Yiğit', 'Yıldırım', 'Yıldız', 'Yonca', 'Yosun', 'Yurdagül', 'Yurdanur', 'Yusuf', 'Yücel', 'Yüksel', 'Yümni', 'Yümniye',
    'Zabit', 'Zafer', 'Zahit', 'Zahide', 'Zakir', 'Zaman', 'Zambak', 'Zarife', 'Zehra', 'Zeki', 'Zekiye', 'Zeliha', 'Zerrin', 'Zeycan', 'Zeynep', 'Zeynel', 'Ziya', 'Ziyaret', 'Zübeyde', 'Zühal', 'Zülal', 'Züleyha', 'Zülfikar', 'Zümrüt'
  ],
  'Şehir': [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
  ],
  'Hayvan': [
    'Ahtapot', 'Ağaçkakan', 'Akrep', 'Akbaba', 'Ala Geyik', 'Alpaka', 'Anakonda', 'Antilop', 'Arı', 'Aslan', 'At', 'Ayı', 'Aygır', 'Babun', 'Balina', 'Balık', 'Bukalemun', 'Bülbül', 'Böcek', 'Boğa', 'Baykuş', 'Bizon', 'Boa', 'Bıldırcın', 'Ceylan', 'Cırcır Böceği', 'Cennet Kuşu', 'Civciv', 'Çakal', 'Çıngıraklı Yılan', 'Çekirge', 'Çita', 'Çulluk', 'Dana', 'Deve', 'Devekuşu', 'Denizanası', 'Denizatı', 'Dinozor', 'Domuz', 'Dodo', 'Eşek', 'Engerek', 'Fanus Balığı', 'Fare', 'Fil', 'Flamingo', 'Fok', 'Gelincik', 'Gergedan', 'Geyik', 'Goril', 'Göçmen Kuş', 'Güvercin', 'Guguk Kuşu', 'Hamamböceği', 'Hamsi', 'Hindi', 'Hipopotam', 'Horoz', 'Hörgüçlü Deve', 'Iguana', 'Istakoz', 'İnek', 'İguana', 'İpekböceği', 'İstavrit', 'İstiridye', 'Jaguar', 'Jako Papağanı', 'Japon Balığı', 'Kaplan', 'Kangal', 'Kanarya', 'Kaplumbağa', 'Karınca', 'Karga', 'Kartal', 'Katır', 'Kaz', 'Kedi', 'Kelebek', 'Kertenkele', 'Kırlangıç', 'Kirpi', 'Koala', 'Kobra', 'Koç', 'Koyun', 'Köpek', 'Köpekbalığı', 'Köstebek', 'Kurbağa', 'Kurt', 'Kuş', 'Kuzgun', 'Kuzu', 'Lama', 'Leopar', 'Leylek', 'Levrek', 'Lüfer', 'Manda', 'Martı', 'Maymun', 'Mezgit', 'Midilli', 'Midye', 'Mors', 'Mürekkepbalığı', 'Nandu', 'Oğlak', 'Okapi', 'Orangutan', 'Orkinos', 'Ornitorenk', 'Oryx', 'Ördek', 'Örümcek', 'Öküz', 'Palamut', 'Panda', 'Panter', 'Papağan', 'Pelikan', 'Penguen', 'Piton', 'Puma', 'Porsuk', 'Rakun', 'Ren Geyiği', 'Salyangoz', 'Saka', 'Samur', 'Sardalya', 'Sazan', 'Serçe', 'Sığır', 'Sincap', 'Sinekkapan', 'Solucan', 'Sırtlan', 'Sinek', 'Şahin', 'Şempanze', 'Tahtakurusu', 'Tarantula', 'Tavşan', 'Tavuk', 'Tavuskuşu', 'Tay', 'Timsah', 'Tırtıl', 'Tilki', 'Turna', 'Uskumru', 'Uğurböceği', 'Üveyik', 'Vatoz', 'Vaşak', 'Vizon', 'Yaban Domuzu', 'Yarasa', 'Yılan', 'Yunus', 'Yusufçuk', 'Zebra', 'Zargana', 'Zürafa'
  ],
  'Bitki': [
    'Abanoz', 'Acur', 'Açelya', 'Ahududu', 'Ağaç', 'Akasya', 'Akçaağaç', 'Ananas', 'Anason', 'Andız', 'Antepfıstığı', 'Ardıç', 'Armut', 'Arpa', 'Asma', 'Aspir', 'Ayçiçeği', 'Ayva', 'Badem', 'Bakla', 'Bambu', 'Bamya', 'Barbunya', 'Begonya', 'Bezelye', 'Biber', 'Biberiye', 'Böğürtlen', 'Brokoli', 'Buğday', 'Ceviz', 'Çalı', 'Çam', 'Çavdar', 'Çay', 'Çınar', 'Çiçek', 'Çiğdem', 'Çilek', 'Çimen', 'Çörekotu', 'Defne', 'Dereotu', 'Domates', 'Dut', 'Ebegümeci', 'Eğreltiotu', 'Elma', 'Enginar', 'Erik', 'Fasulye', 'Fesleğen', 'Fındık', 'Fıstık', 'Gül', 'Greyfurt', 'Hardal', 'Haşhaş', 'Havuç', 'Hindiba', 'Hindistancevizi', 'Hurma', 'Ihlarmur', 'Ispanak', 'İğde', 'İncir', 'Jalapeno', 'Jüt', 'Kabak', 'Kahve', 'Kakao', 'Kaktüs', 'Karanfil', 'Karnabahar', 'Karpuz', 'Kavak', 'Kavun', 'Kayısı', 'Kekik', 'Kereviz', 'Kestane', 'Keten', 'Kivi', 'Krizantem', 'Kuşburnu', 'Lale', 'Lavanta', 'Lahana', 'Limon', 'Mandalina', 'Mantar', 'Manolya', 'Marul', 'Maydanoz', 'Meşe', 'Mısır', 'Muz', 'Nane', 'Nar', 'Nergis', 'Nohut', 'Orkide', 'Ormangülü', 'Ökseotu', 'Papatya', 'Pamuk', 'Pancar', 'Patates', 'Patlıcan', 'Pelin', 'Pırasa', 'Pirinç', 'Portakal', 'Reyhan', 'Roka', 'Sardunya', 'Sarımsak', 'Sarmaşık', 'Saz', 'Selvi', 'Söğüt', 'Soğan', 'Soya', 'Sümbül', 'Susam', 'Şeftali', 'Şalgam', 'Şimşir', 'Tarçın', 'Turp', 'Tütün', 'Urmu', 'Üvez', 'Üzüm', 'Vişne', 'Yabanmersini', 'Yosun', 'Yasemin', 'Yulaf', 'Zakkum', 'Zambak', 'Zerdali', 'Zeytin', 'Zencefil'
  ],
  'Eşya': [
    'Abajur', 'Adaptör', 'Afiş', 'Ağ', 'Akü', 'Alyans', 'Ampul', 'Anahtar', 'Anfi', 'Anten', 'Araba', 'Atkı', 'Avize', 'Ayna', 'Ayakkabı', 'Baca', 'Bıçak', 'Balta', 'Bant', 'Bardak', 'Baston', 'Bavul', 'Beşik', 'Bilgisayar', 'Bilezik', 'Biberon', 'Boru', 'Buzdolabı', 'Cam', 'Ceket', 'Cep', 'Cetvel', 'Cımbız', 'Cüzdan', 'Çadır', 'Çakı', 'Çakmak', 'Çam', 'Çan', 'Çanak', 'Çanta', 'Çapa', 'Çarşaf', 'Çatal', 'Çaydanlık', 'Çekiç', 'Çengel', 'Çerçeve', 'Çivi', 'Çizme', 'Çorap', 'Çuval', 'Daktilo', 'Dambıl', 'Dantel', 'Davul', 'Defter', 'Demir', 'Denge', 'Denizaltı', 'Deterjan', 'Dikiş', 'Direk', 'Dolap', 'Düğme', 'Dürbün', 'Düdük', 'Eldiven', 'Elbise', 'Elek', 'Emzik', 'Etek', 'Eyer', 'Fare', 'Fatura', 'Fener', 'Fırça', 'Fırın', 'Fincan', 'Fiş', 'Fıçı', 'Fular', 'Gemi', 'Giysi', 'Gitar', 'Gözlük', 'Gömlek', 'Gümüş', 'Halı', 'Halka', 'Hamak', 'Hançer', 'Harita', 'Havlu', 'Havan', 'Hırka', 'Hoparlör', 'Işık', 'Izgara', 'İbrik', 'İğne', 'İlaç', 'İplik', 'İskelet', 'Jeton', 'Jile', 'Jilet', 'Kablo', 'Kaban', 'Kadeh', 'Kafes', 'Kağıt', 'Kalem', 'Kalkan', 'Kamera', 'Kamyon', 'Kanca', 'Kanepe', 'Kap', 'Kapı', 'Kar', 'Kaşık', 'Kavanoz', 'Kazan', 'Kazak', 'Kazma', 'Keman', 'Kemer', 'Kılıç', 'Kılıf', 'Kilit', 'Kiremit', 'Kitap', 'Klavye', 'Koltuk', 'Kova', 'Kulaklık', 'Kutu', 'Küpe', 'Kürek', 'Lamba', 'Lastik', 'Lavabo', 'Lehim', 'Levha', 'Litre', 'Maşa', 'Makas', 'Makara', 'Makyaj', 'Mandal', 'Manto', 'Maske', 'Masa', 'Matara', 'Matkap', 'Mekik', 'Mektup', 'Mendil', 'Merdiven', 'Mermi', 'Metre', 'Mikrofon', 'Minder', 'Motor', 'Mum', 'Musluk', 'Nal', 'Naylon', 'Ney', 'Ocak', 'Oje', 'Ok', 'Oklava', 'Olta', 'Orak', 'Oturak', 'Oto', 'Ökçe', 'Önlük', 'Örs', 'Örtü', 'Pano', 'Pantolon', 'Paspas', 'Paten', 'Pense', 'Perde', 'Pergel', 'Pervane', 'Pijama', 'Pil', 'Pipo', 'Piyano', 'Priz', 'Pusula', 'Radyo', 'Rende', 'Resim', 'Robot', 'Ruj', 'Rulo', 'Saat', 'Sabun', 'Saksı', 'Sandalye', 'Sandık', 'Süpürge', 'Silah', 'Silgi', 'Soba', 'Sokak', 'Süngü', 'Sürahi', 'Şamdan', 'Şapka', 'Şarj', 'Şemsiye', 'Şırınga', 'Şişe', 'Şort', 'Tabak', 'Tabanca', 'Tabela', 'Tabure', 'Taç', 'Tarak', 'Tava', 'Tekerlek', 'Telefon', 'Televizyon', 'Tencere', 'Terazi', 'Terlik', 'Testere', 'Testi', 'Teyp', 'Tıraş', 'Toka', 'Top', 'Tornavida', 'Törpü', 'Traktör', 'Tuğla', 'Tuzluk', 'Uçak', 'Uçurtma', 'Urgan', 'Ustura', 'Uydu', 'Ütü', 'Vagon', 'Valiz', 'Vantilatör', 'Vazo', 'Vida', 'Vinç', 'Vites', 'Voleybol', 'Vurmalı', 'Yaka', 'Yastık', 'Yatak', 'Yatay', 'Yay', 'Yelken', 'Yorgan', 'Yüzük', 'Zarf', 'Zil', 'Zımba', 'Zincir', 'Zoka', 'Zurna'
  ],
  'Sanatçı': [
    'Acun Ilıcalı', 'Adile Naşit', 'Ajda Pekkan', 'Ali Sunal', 'Alişan', 'Altan Erkekli', 'Aras Bulut İynemli', 'Aslı Enver', 'Ata Demirer', 'Aleyna Tilki', 'Ahmet Kaya', 'Ahmet Kural', 'Ayşen Gruda',
    'Barış Manço', 'Beren Saat', 'Bergüzar Korel', 'Beyazıt Öztürk', 'Burak Özçivit', 'Bülent Ersoy', 'Buray', 'Büşra Pekin',
    'Candan Erçetin', 'Cem Karaca', 'Cem Yılmaz', 'Cüneyt Arkın', 'Çağatay Ulusoy', 'Çetin Tekindor', 'Çağla Şıkel',
    'Demet Akalın', 'Demet Evgar', 'Demet Akbağ', 'Doğu Demirkol', 'Doğa Rutkay',
    'Ebru Gündeş', 'Edis', 'Engin Akyürek', 'Engin Altan Düzyatan', 'Erol Evgin', 'Eser Yenenler', 'Ezgi Mola', 'Emre Altuğ', 'Emel Sayın',
    'Fahriye Evcen', 'Fatih Ürek', 'Fatma Girik', 'Ferdi Tayfur', 'Filiz Akın', 'Funda Arar',
    'Gökhan Özoğuz', 'Gökçe Bahadır', 'Gülben Ergen', 'Gülse Birsel', 'Gülşen', 'Gülnaz',
    'Hadise', 'Halit Ergenç', 'Haluk Bilginer', 'Haluk Levent', 'Hande Erçel', 'Hande Yener', 'Hayko Cepkin', 'Hülya Avşar', 'Hülya Koçyiğit',
    'Işın Karaca', 'İbrahim Büyükak', 'İbrahim Çelikkol', 'İbrahim Tatlıses', 'İlker Ayrık', 'İlker Kaleli', 'İrem Derici', 'İlyas Yalçıntaş',
    'Jale', 'Janset',
    'Kaan Urgancıoğlu', 'Kadir İnanır', 'Kadir Doğulu', 'Kemal Sunal', 'Kenan Doğulu', 'Kenan İmirzalıoğlu', 'Kıvanç Tatlıtuğ', 'Kibariye', 'Koray Avcı',
    'Leman Sam', 'Levent Yüksel',
    'Mabel Matiz', 'Mahsun Kırmızıgül', 'Mehmet Ali Erbil', 'Mehmet Günsür', 'Melek Mosso', 'Merve Dizdar', 'Mine Tugay', 'Murat Boz', 'Murat Dalkılıç', 'Mustafa Ceceli', 'Mustafa Sandal', 'Müslüm Gürses', 'Müjdat Gezen',
    'Nebahat Çehre', 'Necati Şaşmaz', 'Nejat İşler', 'Neşet Ertaş', 'Nil Karaibrahimgil', 'Nilüfer', 'Nurgül Yeşilçay',
    'Oğuzhan Koç', 'Okan Bayülgen', 'Orhan Gencebay', 'Ozan Güven', 'Özcan Deniz', 'Özgü Namal', 'Özlem Tekin',
    'Pelin Karahan', 'Perran Kutman', 'Pınar Altuğ', 'Pınar Deniz',
    'Rafet El Roman', 'Reynmen', 'Rober Hatemo', 'Rutkay Aziz',
    'Seda Sayan', 'Sefo', 'Selda Bağcan', 'Serdar Ortaç', 'Serenay Sarıkaya', 'Sertab Erener', 'Sezen Aksu', 'Sıla', 'Sibel Can', 'Sinan Akçıl', 'Şahan Gökbakar', 'Şener Şen', 'Şevval Sam',
    'Tarkan', 'Teoman', 'Tolga Çevik', 'Tolgahan Sayışman', 'Türkan Şoray',
    'Uğur Yücel', 'Uraz Kaygılaroğlu', 'Ümit Besen',
    'Vahide Perçin', 'Volkan Konak',
    'Yalın', 'Yaşar', 'Yıldız Tilbe', 'Yılmaz Erdoğan', 'Yılmaz Morgül',
    'Zara', 'Zeki Müren', 'Zerrin Özer', 'Zeynep Bastık', 'Zuhal Olcay'
  ]
};

// Bot Kelime Dağarcığı
const generateBotSubmission = (letter, categories) => {
  const timeTaken = Math.floor(Math.random() * 12) + 3;
  const answers = {};

  categories.forEach(cat => {
      let word = "";
      let isValid = false;

      if (Math.random() > 0.10) {
          if (GAME_DICTIONARY[cat]) {
              const matches = GAME_DICTIONARY[cat].filter(w => w.toLocaleLowerCase('tr-TR').startsWith(letter.toLocaleLowerCase('tr-TR')));
              if (matches.length > 0) {
                  word = matches[Math.floor(Math.random() * matches.length)];
                  isValid = true;
              }
          }
          if (!word && Math.random() > 0.6) {
              word = letter + ["anya", "istan", "burgaz", "ırmak", "ova", "can"][Math.floor(Math.random() * 6)];
              isValid = true;
          }
      }
      answers[cat] = { word, isValid };
  });

  return { answers, timeTaken, submittedAt: Date.now() };
};

const validateAnswersWithAI = async (answers, letter, categories) => {
  const apiKey = ""; // Execution environment provides this
  const results = {};
  const wordsToCheck = [];

  for (const cat of categories) {
    const word = answers[cat] || "";
    const normalized = word.toLocaleLowerCase('tr-TR').trim();
    // 1. Temel kural kontrolü: Harf uyumu ve minimum uzunluk
    const isValidFormat = normalized.length > 1 && normalized.charAt(0) === letter.toLocaleLowerCase('tr-TR');

    results[cat] = { word: word.trim(), isValid: isValidFormat };

    if (isValidFormat) {
      // 2. Yerel Sözlük (Beyaz Liste) kontrolü - Çok hızlı
      const localDict = (GAME_DICTIONARY[cat] || []).map(w => w.toLocaleLowerCase('tr-TR'));
      if (localDict.includes(normalized)) {
        results[cat].isValid = true;
      } else {
        // Sözlükte yoksa, şüpheli listesine al (AI kontrol edecek)
        wordsToCheck.push({ category: cat, word: normalized });
      }
    }
  }

  // 3. Şüpheli kelimeleri AI ile Katı Kontrol (Strict Validation)
  if (wordsToCheck.length > 0) {
     if (apiKey) {
        try {
           const prompt = `Aşağıdaki kelimelerin belirtilen kategorilere gerçekten uygun, anlamlı ve doğru yazılmış Türkçe kelimeler olup olmadığını kontrol et. 
           ÖNEMLİ KURALLAR:
           1- Uydurma kelimeleri (örneğin "göpek"), yanlış yazımları veya kategorisine uymayan kelimeleri KESİNLİKLE "false" olarak işaretle. 
           2- 'Şehir' kategorisinde SADECE Türkiye'nin 81 ilinden biri kabul edilmelidir (Paris, Londra, New York gibi yabancı şehirleri KESİNLİKLE "false" yap). 
           3- 'Sanatçı' kategorisinde tanınmış Türk şarkıcı, oyuncu veya ünlü kişiler kabul edilmelidir.
           Sadece JSON formatında cevap ver. Örnek: {"İsim": true, "Şehir": false}. Kontrol edilecekler: ${JSON.stringify(wordsToCheck)}`;
           
           const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
              })
           });
           
           const data = await response.json();
           const aiResultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
           if (aiResultText) {
              const aiValidation = JSON.parse(aiResultText);
              for (const item of wordsToCheck) {
                 // Sadece AI onaylarsa geçerli say
                 results[item.category].isValid = aiValidation[item.category] === true;
              }
           } else {
              throw new Error("Invalid AI response");
           }
        } catch (e) {
           console.error("AI Error:", e);
           // KATI MOD: API çökse bile acımasız davran, sözlükte yoksa GEÇERSİZ say!
           for (const item of wordsToCheck) {
              results[item.category].isValid = false;
           }
        }
     } else {
        // KATI MOD: API Anahtarı yoksa ve kelime sözlükte yer almıyorsa hile kabul et, GEÇERSİZ say!
        for (const item of wordsToCheck) {
           results[item.category].isValid = false;
        }
     }
  }

  return results;
};


// --- UI BRANDING COMPONENT ---
const TopBar = ({ isMuted, toggleMute }) => (
  <div className="fixed top-4 left-4 right-4 flex justify-between items-start z-50 pointer-events-none">
      <a href="https://forgeandplay.com" target="_blank" rel="noreferrer" className="pointer-events-auto flex items-center gap-2 md:gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-2 md:px-4 md:py-2 rounded-2xl border border-fuchsia-500/30 shadow-xl shadow-fuchsia-500/10 hover:scale-105 hover:border-cyan-400/50 transition-all group">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-fuchsia-600 to-cyan-500 rounded-xl flex items-center justify-center font-black text-white text-xs md:text-sm shadow-inner group-hover:rotate-12 transition-transform">FP</div>
          <div className="flex flex-col leading-none">
              <span className="text-[8px] md:text-[10px] text-fuchsia-300 font-bold uppercase tracking-widest mb-1">Geliştirici</span>
              <span className="text-xs md:text-sm font-black text-white tracking-wide">Forge<span className="text-cyan-400">And</span>Play</span>
          </div>
      </a>
      
      <button 
        onClick={toggleMute}
        className="pointer-events-auto bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all shadow-xl"
        title="Sesi Aç/Kapat"
      >
        {isMuted ? <VolumeX className="w-6 h-6 text-red-400" /> : <Volume2 className="w-6 h-6 text-cyan-400" />}
      </button>
  </div>
);

// --- COMPONENTS ---

// 1. Splash / Login / Setup Screen
const SetupScreen = ({ onJoin, onCreate }) => {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState('home'); 
  const [rounds, setRounds] = useState(10); // TUR SAYISI BAŞLANGICI 10 YAPILDI

  const handleActionClick = (action) => {
    playSound('pop');
    action();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute top-[10%] left-[10%] w-64 h-64 md:w-96 md:h-96 bg-fuchsia-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse"></div>
      <div className="absolute bottom-[10%] right-[10%] w-64 h-64 md:w-96 md:h-96 bg-cyan-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse" style={{animationDelay: '1s'}}></div>

      <div className="relative z-10 max-w-md w-full bg-slate-900/60 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] border-2 border-slate-700/50 shadow-2xl shadow-cyan-900/20 transform transition-all mt-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-3xl mb-4 transform rotate-6 hover:rotate-12 transition-transform shadow-xl shadow-fuchsia-500/30">
             <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-fuchsia-400 animate-gradient-x">
            İsim Şehir
          </h1>
          <div className="inline-block bg-white text-black font-black uppercase tracking-widest text-[10px] md:text-xs px-3 py-1 rounded-full mt-2 transform -translate-y-2">Online</div>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <input 
              type="text" 
              maxLength={15}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Oyuncu Adın..." 
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className="w-full bg-slate-950/50 border-2 border-slate-700 rounded-2xl px-4 py-4 md:px-6 md:py-4 text-white text-[16px] md:text-lg font-bold placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all text-center touch-manipulation"
            />
          </div>

          <div>
             <div className="flex flex-wrap gap-2 justify-center bg-slate-950/30 p-4 rounded-3xl border border-slate-800">
                {AVATARS.map(a => (
                  <button 
                    key={a}
                    onClick={() => { playSound('pop'); setAvatar(a); }}
                    className={`text-2xl md:text-3xl w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 touch-manipulation ${avatar === a ? 'bg-gradient-to-br from-fuchsia-500 to-cyan-500 scale-110 shadow-lg shadow-cyan-500/30 rotate-3' : 'bg-slate-800/50 hover:bg-slate-700 hover:scale-105'}`}
                  >
                    {a}
                  </button>
                ))}
             </div>
          </div>

          {mode === 'home' && (
            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={() => handleActionClick(() => setMode('create'))}
                disabled={!name.trim()}
                className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white font-black text-lg py-4 px-4 rounded-2xl shadow-xl shadow-fuchsia-500/20 transform transition hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 touch-manipulation"
              >
                <Plus className="w-6 h-6" /> Yeni Oda Kur
              </button>
              <button 
                onClick={() => handleActionClick(() => setMode('join'))}
                disabled={!name.trim()}
                className="w-full bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 text-white font-black text-lg py-4 px-4 rounded-2xl shadow-lg transform transition hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 touch-manipulation"
              >
                <LogIn className="w-6 h-6" /> Odaya Katıl
              </button>
            </div>
          )}

          {mode === 'create' && (
             <div className="pt-2 space-y-4 animate-fade-in-up">
                <div className="bg-slate-950/30 p-4 rounded-3xl border border-slate-800">
                   <label className="block text-sm font-bold text-slate-400 mb-3 text-center uppercase tracking-widest">Tur Sayısı</label>
                   <div className="flex justify-center gap-2">
                     {[10, 20, 30, 40, 50].map(r => (
                        <button 
                          key={r}
                          onClick={() => { playSound('pop'); setRounds(r); }}
                          className={`w-12 h-12 rounded-xl font-black text-xl transition-all ${rounds === r ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/50 scale-110' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                          {r}
                        </button>
                     ))}
                   </div>
                </div>
                <button 
                  onClick={() => handleActionClick(() => onCreate({ name, avatar, rounds }))}
                  className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-black text-lg md:text-xl py-4 px-4 rounded-2xl shadow-xl shadow-fuchsia-500/30 transform transition hover:-translate-y-1 flex items-center justify-center gap-2 touch-manipulation"
                >
                  <Play className="w-6 h-6" /> Macerayı Başlat
                </button>
                <button onClick={() => handleActionClick(() => setMode('home'))} className="w-full font-bold text-slate-400 hover:text-white transition-colors py-2 touch-manipulation">Geri Dön</button>
             </div>
          )}

          {mode === 'join' && (
             <div className="pt-2 space-y-4 animate-fade-in-up">
                <input 
                  type="text" 
                  maxLength={4}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="KODU GİR" 
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-full bg-slate-950/50 border-2 border-slate-700 rounded-2xl px-4 py-4 text-white text-center font-black text-2xl md:text-3xl tracking-[0.5em] focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/20 uppercase touch-manipulation"
                />
                <button 
                  onClick={() => handleActionClick(() => onJoin(roomCode, { name, avatar }))}
                  disabled={roomCode.length !== 4}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-lg md:text-xl py-4 px-4 rounded-2xl shadow-xl shadow-cyan-500/30 transform transition hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
                >
                  <LogIn className="w-6 h-6" /> İçeri Dal!
                </button>
                <button onClick={() => handleActionClick(() => setMode('home'))} className="w-full font-bold text-slate-400 hover:text-white transition-colors py-2 touch-manipulation">Geri Dön</button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 2. Lobby Screen
const LobbyScreen = ({ room, user, onStartGame, onLeave, onAddBot }) => {
  const isHost = room.hostId === user.uid;
  
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center">
       <div className="max-w-4xl w-full mt-24">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/60 backdrop-blur-xl border-2 border-fuchsia-500/30 p-6 md:p-8 rounded-[2rem] mb-8 shadow-2xl shadow-fuchsia-500/10 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px]"></div>
             <div className="relative z-10 text-center md:text-left">
               <h2 className="text-3xl md:text-4xl font-black flex items-center justify-center md:justify-start gap-3 text-white mb-2">
                 <Users className="text-cyan-400 w-8 h-8 md:w-10 md:h-10" /> Bekleme Salonu
               </h2>
               <p className="text-slate-400 font-medium text-sm md:text-lg">Arkadaşlarını davet et veya Bot ekle!</p>
             </div>
             <div className="relative z-10 mt-6 md:mt-0 bg-black/50 border-2 border-slate-700 px-6 py-3 md:px-8 md:py-4 rounded-3xl text-center shadow-inner">
               <span className="text-xs md:text-sm text-cyan-400 uppercase tracking-widest font-black block mb-1">Katılım Kodu</span>
               <span className="text-4xl md:text-5xl font-mono tracking-[0.2em] font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
                 {room.id}
               </span>
             </div>
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
            {Object.values(room.players || {}).map((p, i) => (
               <div key={p.id} className={`bg-slate-900/80 border-2 ${p.isBot ? 'border-cyan-500/50 shadow-cyan-500/20' : 'border-slate-700 shadow-slate-900/50'} rounded-3xl md:rounded-[2rem] p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-xl hover:-translate-y-2 transition-transform`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="text-5xl md:text-6xl mb-3 md:mb-4 drop-shadow-2xl transform transition group-hover:scale-110 group-hover:rotate-6">{p.avatar}</div>
                  <span className="font-black text-lg md:text-xl text-white truncate w-full text-center tracking-wide">{p.name}</span>
                  {p.isBot && <span className="mt-1 md:mt-2 text-[10px] md:text-xs font-bold bg-cyan-500/20 text-cyan-400 px-2 py-1 md:px-3 rounded-full uppercase tracking-wider">Bot</span>}
                  
                  {p.id === room.hostId && (
                     <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-yellow-400 text-black p-1.5 md:p-2 rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce" title="Oda Kurucusu">
                       <Crown className="w-4 h-4 md:w-5 md:h-5 font-black" />
                     </div>
                  )}
               </div>
            ))}
            {Object.values(room.players || {}).length < 8 && (
               <div className="bg-slate-900/30 border-2 border-dashed border-slate-700/50 rounded-3xl md:rounded-[2rem] p-6 flex flex-col items-center justify-center text-slate-500 min-h-[160px] md:min-h-[200px]">
                  <RefreshCw className="w-8 h-8 md:w-10 md:h-10 mb-2 md:mb-3 animate-spin-slow opacity-50" />
                  <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-center">Oyuncu<br/>Bekleniyor</span>
               </div>
            )}
          </div>

          {/* Host Controls */}
          {isHost ? (
            <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 border-2 border-fuchsia-500/20 p-6 md:p-8 rounded-[2rem] text-center shadow-2xl relative overflow-hidden">
               <div className="absolute inset-0 bg-fuchsia-500/5 blur-[100px]"></div>
               <p className="text-slate-300 mb-6 font-bold text-sm md:text-lg relative z-10">Herkes hazırsa oyunu başlat veya Bot ekle.</p>
               <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
                  <button 
                     onClick={() => { playSound('pop'); onAddBot(); }}
                     className="bg-slate-800 border-2 border-cyan-500/50 hover:bg-cyan-900/30 hover:border-cyan-400 text-cyan-400 font-black py-4 px-6 md:px-8 rounded-2xl shadow-lg transform transition hover:-translate-y-1 text-base md:text-lg flex items-center justify-center gap-3 touch-manipulation"
                  >
                     <Bot className="w-5 h-5 md:w-6 md:h-6" /> Bot Ekle
                  </button>
                  <button 
                     onClick={() => { playSound('pop'); onStartGame(); }}
                     className="bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white font-black py-4 px-8 md:px-12 rounded-2xl shadow-xl shadow-fuchsia-500/30 transform transition hover:-translate-y-1 text-lg md:text-xl flex items-center justify-center gap-3 touch-manipulation"
                  >
                     <Play className="w-6 h-6 md:w-7 md:h-7 fill-current" /> OYUNU BAŞLAT
                  </button>
               </div>
            </div>
          ) : (
             <div className="text-center p-6 md:p-8 bg-slate-900/80 rounded-[2rem] border-2 border-slate-800 shadow-2xl">
                <p className="text-cyan-400 animate-pulse text-xl md:text-2xl font-black flex items-center justify-center gap-3 md:gap-4">
                   <Clock className="w-6 h-6 md:w-8 md:h-8" /> Kurucunun başlatması bekleniyor...
                </p>
             </div>
          )}
       </div>
    </div>
  );
};

// 3. Game Screen (Roulette & Input)
const GameScreen = ({ room, user, onSubmitAnswers }) => {
  const currentRoundData = room.rounds[room.currentRound];
  const [phase, setPhase] = useState('roulette'); // roulette, playing
  const [displayLetter, setDisplayLetter] = useState('?');
  const [timeLeft, setTimeLeft] = useState(room.settings.time);
  const [answers, setAnswers] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    let interval;
    if (phase === 'roulette') {
      let ticks = 0;
      interval = setInterval(() => {
        setDisplayLetter(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
        playSound('tick');
        ticks++;
        if (ticks > 25) {
          clearInterval(interval);
          setDisplayLetter(currentRoundData.letter);
          playSound('ding');
          setTimeout(() => setPhase('playing'), 1500);
        }
      }, 80);
    }
    return () => clearInterval(interval);
  }, [phase, currentRoundData.letter]);

  useEffect(() => {
    if (phase === 'playing' && !hasSubmitted && timeLeft > 0) {
      const timerId = setInterval(() => {
        setTimeLeft(prev => {
           if(prev <= 5 && prev > 1) playSound('tick'); // Son saniyelerde uyar
           return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerId);
    } else if (timeLeft === 0 && !hasSubmitted) {
      handleSubmit(); 
    }
  }, [phase, timeLeft, hasSubmitted]);

  const handleInputChange = (category, value) => {
    setAnswers(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = () => {
    if (hasSubmitted) return;
    playSound('ding');
    setHasSubmitted(true);
    onSubmitAnswers(answers, room.settings.time - timeLeft); 
  };

  if (phase === 'roulette') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/20 to-cyan-900/20 animate-pulse"></div>
         <h3 className="text-xl md:text-3xl text-cyan-400 font-black mb-8 md:mb-10 uppercase tracking-[0.3em] drop-shadow-lg z-10 text-center">Harf Çekiliyor</h3>
         <div className="w-48 h-48 md:w-64 md:h-64 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-full md:rounded-[3rem] flex items-center justify-center shadow-[0_0_80px_rgba(217,70,239,0.4)] border-8 border-white/10 z-10 animate-bounce relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full md:rounded-[3rem] animate-spin-slow"></div>
            <span className="text-7xl md:text-[140px] font-black text-white drop-shadow-2xl z-20 leading-none">{displayLetter}</span>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center">
       <div className="w-full max-w-3xl mt-16 flex-1 flex flex-col">
           {/* Header Bar */}
           <div className="flex justify-between items-center mb-6 md:mb-8 bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700/50 p-4 md:p-6 rounded-3xl md:rounded-[2rem] sticky top-20 z-20 shadow-2xl">
              <div className="flex items-center gap-4 md:gap-6">
                 <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-2xl flex items-center justify-center text-4xl md:text-5xl font-black shadow-[0_0_30px_rgba(217,70,239,0.4)] transform -rotate-3 border-4 border-slate-900">
                   {currentRoundData.letter}
                 </div>
                 <div>
                   <div className="text-xs md:text-sm text-fuchsia-400 uppercase tracking-widest font-black mb-1">TUR {room.currentRound + 1}/{room.settings.rounds}</div>
                   <div className="font-black text-white text-xl md:text-2xl tracking-wide hidden sm:block">Kelime Üret!</div>
                 </div>
              </div>
              <div className={`flex flex-col items-center justify-center w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl border-4 ${timeLeft <= 10 ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-slate-950 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'}`}>
                 <Clock className="w-5 h-5 md:w-8 md:h-8 mb-1" /> 
                 <span className="font-black text-2xl md:text-3xl leading-none">{timeLeft}</span>
              </div>
           </div>

           {/* Cards Form */}
           <div className="space-y-4 md:space-y-6 flex-1 pb-32">
             {room.settings.categories.map((cat) => (
               <div key={cat} className="group relative bg-slate-900 border-2 border-slate-700 rounded-3xl md:rounded-[2rem] p-1 md:p-2 hover:border-fuchsia-500 focus-within:border-cyan-400 focus-within:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all transform focus-within:-translate-y-1">
                 <div className="absolute top-0 left-4 md:left-6 -translate-y-1/2 bg-slate-950 px-3 py-1 md:px-4 md:py-1 rounded-full border-2 border-inherit text-xs md:text-sm font-black text-inherit uppercase tracking-widest z-10 group-focus-within:text-cyan-400 group-hover:text-fuchsia-400 text-slate-400 transition-colors">
                    {cat}
                 </div>
                 <input 
                   type="text"
                   value={answers[cat] || ''}
                   onChange={(e) => handleInputChange(cat, e.target.value)}
                   disabled={hasSubmitted}
                   placeholder={`${currentRoundData.letter} ile başlayan...`}
                   autoComplete="off"
                   autoCapitalize="none"
                   autoCorrect="off"
                   spellCheck="false"
                   className="w-full bg-transparent text-white px-5 py-5 md:px-6 md:py-6 text-[16px] md:text-2xl font-black focus:outline-none placeholder-slate-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                 />
               </div>
             ))}
           </div>

           {/* Floating Action */}
           <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-30 pointer-events-none">
             <div className="max-w-3xl mx-auto pointer-events-auto">
               {hasSubmitted ? (
                 <div className="bg-slate-900 border-2 border-cyan-500/50 text-center py-5 md:py-6 rounded-3xl md:rounded-[2rem] text-cyan-400 font-black text-lg md:text-xl flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                   <RefreshCw className="w-6 h-6 md:w-8 md:h-8 animate-spin" /> Rakipler bekleniyor...
                 </div>
               ) : (
                 <button 
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-black py-5 md:py-6 px-6 rounded-3xl md:rounded-[2rem] shadow-[0_10px_40px_rgba(217,70,239,0.4)] transform transition hover:-translate-y-2 text-xl md:text-2xl flex items-center justify-center gap-3 md:gap-4 hover:scale-[1.02] touch-manipulation"
                 >
                   <Zap className="w-6 h-6 md:w-8 md:h-8 fill-current" /> GÖNDER VE BİTİR
                 </button>
               )}
             </div>
           </div>
       </div>
    </div>
  );
};

// 4. Round Results Screen
const RoundResultsScreen = ({ room, user, onNextRound }) => {
  const isHost = room.hostId === user.uid;
  const currentRoundData = room.rounds[room.currentRound];
  const { scores, answers, letter } = currentRoundData;

  const sortedPlayers = Object.values(room.players).sort((a, b) => {
     const scoreA = scores?.[a.id]?.points || 0;
     const scoreB = scores?.[b.id]?.points || 0;
     return scoreB - scoreA;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto mt-20">
        <div className="text-center mb-8 md:mb-12">
           <h2 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-cyan-500 mb-4 drop-shadow-xl">TUR SONUCU</h2>
           <div className="inline-flex items-center gap-3 md:gap-4 bg-slate-900 border-2 border-slate-700 px-4 py-2 md:px-6 md:py-2 rounded-full">
              <span className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-widest">Oynanan Harf</span>
              <span className="text-2xl md:text-3xl font-black text-white bg-fuchsia-600 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl shadow-lg -rotate-6">{letter}</span>
           </div>
        </div>

        <div className="space-y-4 md:space-y-6 mb-24 md:mb-12">
           {sortedPlayers.map((player, index) => {
              const pScores = scores?.[player.id];
              const pAnswers = answers?.[player.id]?.answers || {};
              const isFastest = answers?.[player.id]?.isFastest;

              return (
                 <div key={player.id} className="bg-slate-900/80 border-2 border-slate-800 rounded-3xl md:rounded-[2rem] overflow-hidden shadow-2xl transform transition hover:scale-[1.01]">
                    <div className="bg-slate-950/50 p-4 md:p-6 flex justify-between items-center border-b-2 border-slate-800">
                       <div className="flex items-center gap-3 md:gap-4">
                         <span className="text-2xl md:text-3xl font-black text-slate-600 w-8 md:w-10">#{index + 1}</span>
                         <span className="text-4xl md:text-5xl drop-shadow-md">{player.avatar}</span>
                         <div className="flex flex-col">
                            <span className="font-black text-xl md:text-2xl tracking-wide">{player.name} {player.id === user.uid && <span className="text-fuchsia-400 text-xs md:text-sm ml-1 md:ml-2 uppercase">(SEN)</span>}</span>
                            {player.isBot && <span className="text-cyan-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Yapay Zeka Rakip</span>}
                         </div>
                       </div>
                       <div className="bg-green-500/10 border-2 border-green-500/30 px-4 py-2 md:px-6 md:py-3 rounded-2xl flex flex-col items-center justify-center shadow-inner">
                          <span className="text-2xl md:text-3xl font-black text-green-400">+{pScores?.points || 0}</span>
                          <span className="text-[8px] md:text-[10px] text-green-500/80 uppercase font-black tracking-widest mt-1">Puan</span>
                       </div>
                    </div>
                    <div className="p-4 md:p-6 bg-slate-900/30">
                       <div className="flex flex-wrap gap-2 md:gap-3">
                         {room.settings.categories.map(cat => {
                            const answerObj = pAnswers[cat];
                            if (!answerObj || !answerObj.word) {
                               return <div key={cat} className="text-xs md:text-sm font-bold bg-slate-800 text-slate-500 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-slate-700">{cat}: <span className="text-slate-600 italic">Boş</span></div>;
                            }
                            if (!answerObj.isValid) {
                               return <div key={cat} className="text-xs md:text-sm font-bold bg-red-950/40 border border-red-500/30 text-red-400 px-3 py-1.5 md:px-4 md:py-2 rounded-xl line-through decoration-red-500 decoration-2">{cat}: {answerObj.word}</div>;
                            }
                            return (
                               <div key={cat} className={`text-xs md:text-sm font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-xl border-2 ${answerObj.isUnique ? 'bg-fuchsia-900/30 border-fuchsia-500 text-fuchsia-100 shadow-[0_0_15px_rgba(217,70,239,0.2)]' : 'bg-cyan-900/30 border-cyan-500/50 text-cyan-100'}`}>
                                  <span className="opacity-70 mr-1">{cat}:</span> <span className="text-white text-[14px] md:text-base">{answerObj.word}</span> <span className="ml-1 md:ml-2 text-[10px] md:text-xs font-black opacity-80">(+{answerObj.isUnique ? 10 : 3})</span>
                               </div>
                            );
                         })}
                         {isFastest && (
                            <div className="text-xs md:text-sm font-black bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400 px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                               <Zap className="w-4 h-4 md:w-5 md:h-5 fill-current" /> En Hızlı (+5)
                            </div>
                         )}
                       </div>
                    </div>
                 </div>
              )
           })}
        </div>

        {isHost ? (
           <div className="text-center fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-10 md:static md:bg-none">
              <button 
                 onClick={() => { playSound('pop'); onNextRound(); }}
                 className="w-full md:w-auto bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-black py-5 md:py-6 px-8 md:px-16 rounded-3xl md:rounded-[2rem] shadow-[0_10px_40px_rgba(6,182,212,0.4)] transform transition hover:-translate-y-2 text-xl md:text-2xl flex items-center justify-center gap-3 md:gap-4 mx-auto hover:scale-105 touch-manipulation"
              >
                {room.currentRound + 1 >= room.settings.rounds ? 'FİNAL TABLOSU' : 'SONRAKİ TUR'} <ArrowRight className="w-6 h-6 md:w-8 md:h-8" />
              </button>
           </div>
        ) : (
           <div className="text-center p-6 md:p-8 bg-slate-900/90 backdrop-blur-md rounded-t-3xl md:rounded-[2rem] border-t-2 md:border-2 border-slate-700 shadow-2xl fixed bottom-0 left-0 right-0 md:static z-10">
              <p className="text-cyan-400 animate-pulse text-lg md:text-2xl font-black tracking-wide flex items-center justify-center gap-2 md:gap-3">
                 <Sparkles className="w-6 h-6 md:w-8 md:h-8" /> Kurucu bekleniyor...
              </p>
           </div>
        )}
      </div>
    </div>
  )
}

// 5. Final Score Screen
const FinalScoreScreen = ({ room, user }) => {
  const sortedPlayers = Object.values(room.players).sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  useEffect(() => {
     playSound('win');
  }, []);

  const handleShare = () => {
    playSound('pop');
    const text = `İsim Şehir Online'da ${user.score || 0} puan yaptım! ForgeAndPlay'in bu efsane oyununda sen daha iyisini yapabilir misin?`;
    if (navigator.share) {
       navigator.share({ title: 'İsim Şehir Online', text, url: window.location.href });
    } else {
       const el = document.createElement('textarea');
       el.value = text;
       document.body.appendChild(el);
       el.select();
       document.execCommand('copy');
       document.body.removeChild(el);
       alert("Skorun panoya kopyalandı!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 py-16 md:py-20 relative overflow-hidden">
       <div className="absolute inset-0 pointer-events-none opacity-60">
          {[...Array(30)].map((_, i) => (
             <div key={i} className="absolute w-2 h-2 md:w-3 md:h-3 rounded-full animate-ping" style={{
                left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 3}s`,
                backgroundColor: ['#d946ef', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 5)]
             }} />
          ))}
       </div>

       <div className="relative z-10 w-full max-w-3xl bg-slate-900/80 backdrop-blur-2xl border-4 border-yellow-500/30 p-8 md:p-16 rounded-[2rem] md:rounded-[3rem] shadow-[0_0_100px_rgba(234,179,8,0.15)] text-center mt-10">
          <Trophy className="w-24 h-24 md:w-32 md:h-32 mx-auto text-yellow-400 mb-6 md:mb-8 drop-shadow-[0_0_40px_rgba(250,204,21,0.6)] animate-bounce" />
          <div className="inline-block bg-yellow-500/20 text-yellow-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] px-4 py-1.5 md:px-6 md:py-2 text-xs md:text-base rounded-full mb-4 md:mb-6 border border-yellow-500/50">Oyun Bitti</div>
          <h1 className="text-5xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 mb-2 md:mb-4 drop-shadow-xl">
             ŞAMPİYON
          </h1>
          <p className="text-3xl md:text-4xl font-black text-white mb-10 md:mb-16 tracking-wide drop-shadow-md">{winner?.name} <span className="text-4xl md:text-5xl align-middle ml-2">{winner?.avatar}</span></p>

          <div className="space-y-3 md:space-y-4 mb-10 md:mb-16 text-left">
             {sortedPlayers.map((player, idx) => (
                <div key={player.id} className={`flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-[2rem] transform transition hover:scale-[1.02] ${idx === 0 ? 'bg-gradient-to-r from-yellow-500/30 to-yellow-600/10 border-2 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.2)] scale-105' : 'bg-slate-950/50 border-2 border-slate-800'}`}>
                   <div className="flex items-center gap-3 md:gap-6">
                      <div className={`w-8 md:w-12 text-center font-black text-xl md:text-3xl ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-600'}`}>#{idx + 1}</div>
                      <div className="text-3xl md:text-5xl drop-shadow-lg">{player.avatar}</div>
                      <div className="font-black text-lg md:text-2xl text-white tracking-wide truncate max-w-[120px] md:max-w-none">{player.name}</div>
                   </div>
                   <div className="text-2xl md:text-4xl font-black text-white bg-slate-900 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl border-2 border-slate-700 shadow-inner whitespace-nowrap">
                      {player.score} <span className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-widest ml-1 hidden sm:inline-block">Puan</span>
                   </div>
                </div>
             ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
             <button onClick={handleShare} className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black py-4 px-8 md:py-5 md:px-10 rounded-2xl md:rounded-[2rem] shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 md:gap-3 text-lg md:text-xl touch-manipulation">
                <Share2 className="w-5 h-5 md:w-6 md:h-6" /> ZAFERİ PAYLAŞ
             </button>
             <button onClick={() => { playSound('pop'); window.location.reload(); }} className="w-full sm:w-auto bg-slate-800 border-2 border-slate-700 text-white font-black py-4 px-8 md:py-5 md:px-10 rounded-2xl md:rounded-[2rem] shadow-xl hover:bg-slate-700 hover:scale-105 transition-all flex items-center justify-center gap-2 md:gap-3 text-lg md:text-xl touch-manipulation">
                YENİDEN OYNA
             </button>
          </div>
       </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(GLOBAL_MUTED);

  // Mobil Viewport Fix
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    document.getElementsByTagName('head')[0].appendChild(meta);
  }, []);

  const toggleMute = () => {
     GLOBAL_MUTED = !GLOBAL_MUTED;
     setIsMuted(GLOBAL_MUTED);
     if (!GLOBAL_MUTED) playSound('pop');
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !room?.id) return;
    
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.id);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoom(snapshot.data());
      } else {
        setRoom(null);
        alert("Oda bulunamadı veya kapandı.");
      }
    }, (error) => {
      console.error("Room sync error:", error);
    });

    return () => unsubscribe();
  }, [user, room?.id]);

  const handleCreateRoom = async (profile) => {
    if (!user) return;
    const roomId = generateRoomCode();
    const newRoom = {
      id: roomId,
      hostId: user.uid,
      status: 'lobby', 
      settings: { rounds: profile.rounds || 10, time: 45, categories: DEFAULT_CATEGORIES }, // SEÇİLEN TUR SAYISI EKLENDİ (VARSAYILAN 10)
      players: {
        [user.uid]: { id: user.uid, name: profile.name, avatar: profile.avatar, score: 0, isBot: false }
      },
      currentRound: 0,
      rounds: [],
      createdAt: Date.now()
    };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId), newRoom);
      setRoom(newRoom);
    } catch (e) {
      alert("Oda oluşturulamadı.");
    }
  };

  const handleJoinRoom = async (roomId, profile) => {
    if (!user) return;
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) { alert("Oda bulunamadı!"); return; }
      if (snap.data().status !== 'lobby') { alert("Oyun zaten başlamış!"); return; }
      
      await updateDoc(roomRef, {
        [`players.${user.uid}`]: { id: user.uid, name: profile.name, avatar: profile.avatar, score: 0, isBot: false }
      });
      setRoom({ id: roomId }); 
    } catch (e) { alert("Odaya katılınamadı."); }
  };

  const handleAddBot = async () => {
    if (!user || room.hostId !== user.uid) return;
    const botId = 'bot_' + Math.random().toString(36).substring(7);
    const botNames = ["Robot Rıza", "Cyborg Cem", "AI Ayşe", "Bot Berk", "Terminatör", "Siri", "Alexa", "ChatGPT", "Zeki Müren"];
    const randomName = botNames[Math.floor(Math.random() * botNames.length)];
    const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.id);
    await updateDoc(roomRef, {
      [`players.${botId}`]: { id: botId, name: randomName, avatar: randomAvatar, score: 0, isBot: true }
    });
  };

  const handleStartGame = async () => {
     if (!user || room.hostId !== user.uid) return;
     const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.id);
     
     // İlk el için kullanılmamış harf seçimi (dizi boş)
     const startingLetter = getUnusedLetter([]); 
     const newRound = { letter: startingLetter, startTime: Date.now() + 5000, answers: {}, scores: {} };
     await updateDoc(roomRef, { status: 'playing', currentRound: 0, rounds: [newRound] });
  };

  const handleSubmitAnswers = async (userAnswers, timeTaken) => {
     if (!user || !room) return;
     const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.id);
     
     const currentRoundData = room.rounds[room.currentRound];
     const validationResults = await validateAnswersWithAI(userAnswers, currentRoundData.letter, room.settings.categories);
     
     const submission = { answers: validationResults, timeTaken, submittedAt: Date.now() };

     try {
       const snap = await getDoc(roomRef);
       if(snap.exists()){
          const data = snap.data();
          const updatedRounds = [...data.rounds];
          updatedRounds[data.currentRound].answers[user.uid] = submission;
          
          if (data.hostId === user.uid) {
             const bots = Object.values(data.players).filter(p => p.isBot);
             for (const bot of bots) {
                if (!updatedRounds[data.currentRound].answers[bot.id]) {
                   updatedRounds[data.currentRound].answers[bot.id] = generateBotSubmission(data.rounds[data.currentRound].letter, data.settings.categories);
                }
             }
          }
          
          const playerIds = Object.keys(data.players);
          const submittedIds = Object.keys(updatedRounds[data.currentRound].answers);
          const isEveryoneSubmitted = playerIds.every(id => submittedIds.includes(id));

          if (isEveryoneSubmitted) {
             const roundData = updatedRounds[data.currentRound];
             const calculatedScores = calculateRoundScores(roundData.answers, data.settings.categories);
             roundData.scores = calculatedScores;
             
             const updatedPlayers = { ...data.players };
             for (const [pid, sData] of Object.entries(calculatedScores)) {
                updatedPlayers[pid].score = (updatedPlayers[pid].score || 0) + sData.points;
             }
             await updateDoc(roomRef, { rounds: updatedRounds, status: 'results', players: updatedPlayers });
          } else {
             await updateDoc(roomRef, { rounds: updatedRounds });
          }
       }
     } catch (e) {
       console.error("Submit error:", e);
     }
  };

  const handleNextRound = async () => {
     if (!user || room.hostId !== user.uid) return;
     const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.id);
     const isLastRound = room.currentRound + 1 >= room.settings.rounds;
     
     if (isLastRound) {
        await updateDoc(roomRef, { status: 'finished' });
     } else {
        const snap = await getDoc(roomRef);
        if(snap.exists()) {
           const data = snap.data();
           // Önceki tüm ellerin harflerini çıkarıp benzersiz yeni bir harf üret
           const usedLetters = data.rounds.map(r => r.letter);
           const nextLetter = getUnusedLetter(usedLetters);

           const newRound = { letter: nextLetter, startTime: Date.now() + 5000, answers: {}, scores: {} };
           await updateDoc(roomRef, { status: 'playing', currentRound: data.currentRound + 1, rounds: [...data.rounds, newRound] });
        }
     }
  };

  // Puan hesaplama motoru (Benzersiz = 10 Puan, Aynı = 3 Puan)
  const calculateRoundScores = (allAnswers, categories) => {
     const scores = {};
     let fastestUser = null;
     let minTime = Infinity;

     for (const uid of Object.keys(allAnswers)) {
        scores[uid] = { points: 0, breakDown: {} };
        if (allAnswers[uid].timeTaken < minTime && Object.values(allAnswers[uid].answers).some(a => a.isValid)) {
           minTime = allAnswers[uid].timeTaken;
           fastestUser = uid;
        }
     }
     if (fastestUser) {
        allAnswers[fastestUser].isFastest = true;
        scores[fastestUser].points += 5; 
     }

     for (const cat of categories) {
        const wordFrequency = {};
        for (const uid of Object.keys(allAnswers)) {
           const ansObj = allAnswers[uid].answers[cat];
           if (ansObj && ansObj.isValid) {
              const normalizedWord = ansObj.word.toLowerCase().trim();
              wordFrequency[normalizedWord] = (wordFrequency[normalizedWord] || 0) + 1;
           }
        }
        for (const uid of Object.keys(allAnswers)) {
           const ansObj = allAnswers[uid].answers[cat];
           if (ansObj && ansObj.isValid) {
              const normalizedWord = ansObj.word.toLowerCase().trim();
              const freq = wordFrequency[normalizedWord];
              if (freq === 1) {
                 scores[uid].points += 10; // Eşsiz cevap
                 allAnswers[uid].answers[cat].isUnique = true;
              } else if (freq > 1) {
                 scores[uid].points += 3;  // Aynı cevap (cezalandırılmış düşük puan)
                 allAnswers[uid].answers[cat].isUnique = false;
              }
           }
        }
     }
     return scores;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative">
         <TopBar isMuted={isMuted} toggleMute={toggleMute} />
         <div className="animate-spin text-cyan-500 mb-4"><RefreshCw size={64} /></div>
         <p className="text-slate-400 font-bold tracking-widest uppercase text-sm">ForgeAndPlay Bağlantısı Kuruluyor...</p>
      </div>
    );
  }

  return (
     <>
        <TopBar isMuted={isMuted} toggleMute={toggleMute} />
        {!room && <SetupScreen onJoin={handleJoinRoom} onCreate={handleCreateRoom} />}
        {room?.status === 'lobby' && <LobbyScreen room={room} user={user} onStartGame={handleStartGame} onLeave={() => setRoom(null)} onAddBot={handleAddBot} />}
        {room?.status === 'playing' && <GameScreen room={room} user={user} onSubmitAnswers={handleSubmitAnswers} />}
        {room?.status === 'results' && <RoundResultsScreen room={room} user={user} onNextRound={handleNextRound} />}
        {room?.status === 'finished' && <FinalScoreScreen room={room} user={user} />}
     </>
  )
}