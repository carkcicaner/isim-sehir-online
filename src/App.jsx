import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Play, Users, Plus, LogIn, Crown, Clock, 
  Trophy, ArrowRight, CheckCircle, XCircle, 
  Share2, RefreshCw, Star, Zap, User, Sparkles, Bot, Volume2, VolumeX, Globe, ArrowDown,
  Shield, Lock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, getDocs } from 'firebase/firestore';

// ─── GÜVENLİK: Sadece forgeandplay.com'dan erişim ────────────────────────────
const ALLOWED_ORIGINS = [
  'https://www.forgeandplay.com',
  'https://forgeandplay.com',
  'http://localhost:5173',   // geliştirme için
  'http://localhost:3000',
];

function checkOriginAccess() {
  const origin = window.location.origin;
  const hostname = window.location.hostname;
  // Local geliştirme
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  // Vercel preview URL'leri (sadece forgeandplay ekibine ait)
  if (hostname.includes('vercel.app') && hostname.includes('isim-sehir')) return true;
  // İzin verilen originler
  return ALLOWED_ORIGINS.some(o => origin.startsWith(o));
}

const IS_AUTHORIZED = checkOriginAccess();

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
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

// ─── SABİTLER ─────────────────────────────────────────────────────────────────
const ALPHABET = "ABCÇDEFGHIİJKLMNOÖPRSŞTUÜVYZ".split("");
const DEFAULT_CATEGORIES = ["İsim", "Şehir", "Hayvan", "Bitki", "Eşya", "Sanatçı"];

const AVATARS = [
  "👽","🤖","🦊","🦖","🦄","🐼","🐸","🐱","🐶","🦁",
  "🐯","🐰","👻","💩","😎","🤠","🍓","🍄","🔥","⚡",
  "🎮","🏆","🦋","🐉","🦜","🐺","🦝","🐨","🦩","🎭",
];

// ─── SES MOTORU ───────────────────────────────────────────────────────────────
let GLOBAL_MUTED = false;
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

export const playSound = (name) => {
  if (GLOBAL_MUTED || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const playTone = (freq, type, duration, vol = 0.1) => {
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
      playTone(523.25, 'sine', 0.2, 0.15);
      setTimeout(() => playTone(659.25, 'sine', 0.3, 0.15), 100);
      break;
    case 'win':
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, i) => {
        setTimeout(() => playTone(f, 'square', 0.4, 0.1), i * 120);
      });
      break;
    case 'error': playTone(150, 'sawtooth', 0.3, 0.1); break;
    default: break;
  }
};

// ─── YARDIMCI FONKSİYONLAR ────────────────────────────────────────────────────
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

const getUnusedLetter = (usedLetters = []) => {
  // X, Q, W gibi Türkçe'de az kullanılan harfleri çıkar
  const TURKISH_LETTERS = "ABCÇDEFGHIİJKLMNOÖPRSŞTUÜVYZ".split("");
  const available = TURKISH_LETTERS.filter(l => !usedLetters.includes(l));
  if (available.length === 0) return TURKISH_LETTERS[Math.floor(Math.random() * TURKISH_LETTERS.length)];
  return available[Math.floor(Math.random() * available.length)];
};

// Metin temizleme - XSS koruması
const sanitize = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[<>'"&]/g, '')
    .trim()
    .substring(0, 50);
};

// ─── OYUN SÖZLÜĞÜ ─────────────────────────────────────────────────────────────
const GAME_DICTIONARY = {
  'İsim': [
    // A
    'Abbas','Abdullah','Abdurrahman','Adem','Adnan','Ahmet','Ahu','Ajda','Akın','Akif',
    'Alara','Alev','Aleyna','Ali','Alican','Alp','Alparslan','Alper','Altan','Altay',
    'Amine','Anıl','Aras','Arda','Arif','Armağan','Arzu','Asena','Aslı','Aslıhan',
    'Asya','Ata','Atakan','Atalay','Ateş','Ayaz','Ayberk','Aybike','Aycan','Ayça',
    'Aydın','Ayfer','Aygül','Ayhan','Ayla','Aylin','Aynur','Aysel','Aysu','Aysun',
    'Ayşe','Ayşegül','Aziz','Azra',
    // B
    'Bahar','Bahattin','Barış','Başak','Batuhan','Batu','Baturay','Bayram','Begüm',
    'Behçet','Bekir','Belgin','Berat','Beren','Berk','Berkay','Berke','Berna',
    'Berrak','Beste','Betül','Beyhan','Beyza','Bilal','Bilge','Buğra','Buket',
    'Bulut','Burak','Burcu','Buse','Bülent','Büşra',
    // C
    'Can','Canan','Caner','Cansu','Cem','Cemal','Cemre','Cengiz','Cenk','Ceren',
    'Ceyda','Ceylan','Cihan','Coşkun','Cüneyt',
    // Ç
    'Çağatay','Çağdaş','Çağla','Çağrı','Çiğdem','Çınar','Çisem',
    // D
    'Damla','Defne','Demet','Deniz','Derya','Didem','Dilan','Dilara','Dilek',
    'Doğan','Doğu','Doruk','Duygu',
    // E
    'Ece','Eda','Efe','Ege','Egemen','Elif','Emel','Emin','Emine','Emir',
    'Emirhan','Emre','Enes','Engin','Eren','Erdem','Erhan','Esin','Esma','Esra',
    'Evren','Eylem','Eylül','Ezgi',
    // F
    'Fatih','Fatma','Ferdi','Ferhat','Fidan','Figen','Fikret','Filiz','Furkan',
    // G
    'Gamze','Gizem','Gonca','Gökhan','Gökçe','Gökçen','Gönül','Görkem','Gözde',
    'Gül','Gülay','Gülben','Gülcan','Gülce','Gülşen','Güneş','Güven',
    // H
    'Hakan','Hale','Halil','Hamza','Hande','Hanife','Hasan','Hatice','Hazal',
    'Hira','Hülya','Hüseyin',
    // I/İ
    'Irmak','Işık','Işıl','İbrahim','İlayda','İlker','İlknur','İnci','İpek',
    'İrem','İrfan','İsa','İsmail','İsmet',
    // J
    'Jale',
    // K
    'Kaan','Kadir','Kağan','Kamil','Kaya','Kemal','Kenan','Kerem','Kerim',
    'Kıvanç','Koray','Korhan','Korkut','Kübra','Kürşat',
    // L
    'Lale','Lara','Levent','Leyla',
    // M
    'Mahsun','Manolya','Mehmet','Melek','Meral','Mert','Merve','Meryem',
    'Mesut','Mete','Metin','Mevlüt','Mina','Mine','Mira','Miray','Murat',
    'Musa','Mustafa','Mutlu','Müge','Müjde',
    // N
    'Nalan','Namık','Narin','Nazan','Nazlı','Nergis','Nermin','Neslihan',
    'Nesrin','Neşe','Nil','Nilay','Nilüfer','Nisa','Nisan','Nur','Nuran',
    'Nuray','Nurcan','Nuri',
    // O/Ö
    'Oğuz','Oğuzhan','Okan','Oktay','Onur','Orhan','Osman','Ozan',
    'Ömer','Ömür','Önder','Öykü','Özge','Özgür','Özlem',
    // P
    'Pelin','Pınar',
    // R
    'Rüya','Rüzgar',
    // S/Ş
    'Seda','Sedat','Sefa','Selin','Selim','Selma','Serdar','Seren','Serhat',
    'Serkan','Serpil','Sevda','Sevgi','Sevil','Sibel','Simge','Sinan','Sinem',
    'Soner','Su','Sude','Sultan','Suna','Süleyman','Sümeyra','Sümeyye',
    'Şafak','Şahin','Şebnem','Şevval','Şeyda','Şeyma','Şule',
    // T
    'Taha','Tahsin','Tamer','Tan','Taner','Tarık','Tarkan','Tolga','Toprak',
    'Tuba','Tuğba','Tuğçe','Tuğrul','Tuna','Tuncer','Tunç',
    // U/Ü
    'Uğur','Ulaş','Umut','Utku','Uygar',
    'Ülkü','Ümit',
    // V
    'Volkan','Vuslat',
    // Y
    'Yağız','Yağmur','Yahya','Yalçın','Yaman','Yasemin','Yaşar','Yavuz',
    'Yeliz','Yener','Yılmaz','Yiğit','Yonca','Yusuf','Yüksel',
    // Z
    'Zafer','Zehra','Zeki','Zeliha','Zeynep','Zübeyde','Zühal','Zülal','Zümrüt',
  ],

  'Şehir': [
    // Türkiye 81 İl
    'Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara',
    'Antalya','Ardahan','Artvin','Aydın','Balıkesir','Bartın','Batman',
    'Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa',
    'Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce',
    'Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep',
    'Giresun','Gümüşhane','Hakkari','Hatay','Iğdır','Isparta',
    'İstanbul','İzmir','Kahramanmaraş','Karabük','Karaman','Kars',
    'Kastamonu','Kayseri','Kırıkkale','Kırklareli','Kırşehir','Kilis',
    'Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin',
    'Muğla','Muş','Nevşehir','Niğde','Ordu','Osmaniye','Rize',
    'Sakarya','Samsun','Siirt','Sinop','Sivas','Şanlıurfa','Şırnak',
    'Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova',
    'Yozgat','Zonguldak',
    // Büyük Dünya Şehirleri (kategori genişletme)
    'Amsterdam','Atina','Barselona','Berlin','Bern','Brüksel','Budapeşte',
    'Buenos Aires','Cakarta','Chicago','Delhi','Doha','Dubai','Dublin',
    'Havana','Hong Kong','Kahire','Karachi','Kuala Lumpur','Lagos',
    'Londra','Los Angeles','Madrid','Manila','Melbourne','Meksiko',
    'Miami','Milano','Moskova','Mumbai','Münih','Nairobi','New York',
    'Oslo','Paris','Pekin','Prag','Rio de Janeiro','Roma','Seul',
    'Seyhan','Singapur','Stokholm','Sydney','Şangay','Tahran',
    'Tiflis','Tokyo','Varşova','Vatikan','Viyana','Washington',
    'Zürih','Bakü','Lefkoşa','Minsk','Sofya','Tiran',
  ],

  'Hayvan': [
    // A
    'Ahtapot','Akrep','Akbaba','Alabalık','Alpaka','Anakonda','Antilop',
    'Arı','Aslan','At','Ayı','Atmaca',
    // B
    'Babun','Balina','Balık','Baykuş','Bizon','Bıldırcın','Bülbül','Böcek',
    'Boa','Boğa','Bokböceği','Bozayı',
    // C/Ç
    'Ceylan','Civciv','Çakal','Çekirge','Çita','Çaylak','Çipura',
    // D
    'Dana','Deve','Devekuşu','Denizanası','Denizatı','Dingo','Domuz','Doğan',
    'Dülger Balığı',
    // E
    'Eşek','Engerek','Emu',
    // F
    'Fare','Fil','Flamingo','Fok',
    // G
    'Gelincik','Gergedan','Geyik','Geyik Böceği','Gökdoğan','Goril',
    'Güvercin','Guguk Kuşu',
    // H
    'Hamamböceği','Hamsi','Hindi','Hipopotam','Horoz','Hamster',
    // I/İ
    'Iguana','Istakoz','İnek','İpekböceği','İstavrit','İspinoz',
    // J
    'Jaguar','Japon Balığı',
    // K
    'Kaplan','Kanguru','Kanarya','Kaplumbağa','Karınca','Karga','Kartal',
    'Katır','Kaz','Kedi','Kelebek','Kertenkele','Kırlangıç','Kirpi',
    'Koala','Kobra','Koç','Koyun','Köpek','Köpekbalığı','Köstebek',
    'Kurbağa','Kurt','Kuş','Kuzgun','Kuzu','Kunduz','Kuğu',
    // L
    'Lama','Leopar','Leylek','Levrek','Lüfer','Lemur',
    // M
    'Manda','Martı','Maymun','Mors','Midye','Mürekkepbalığı','Mamut',
    // N
    'Narval',
    // O/Ö
    'Orangutan','Orkinos','Ördek','Örümcek','Öküz',
    // P
    'Panda','Panter','Papağan','Pelikan','Penguen','Piton','Puma','Porsuk',
    // R
    'Rakun','Ren Geyiği','Ringa Balığı',
    // S/Ş
    'Salyangoz','Samur','Sardalya','Sazan','Serçe','Sığır','Sincap',
    'Solucan','Sırtlan','Somon','Su Aygırı','Sülük','Sülün',
    'Şahin','Şempanze','Şinşilla',
    // T
    'Tarantula','Tavşan','Tavuk','Tavuskuşu','Tay','Timsah','Tilki','Turna',
    'Tapir','Tırtak',
    // U
    'Uğurböceği','Uçan Balık','Uçan Sincap',
    // V
    'Vatoz','Vaşak','Vizon','Vampir Yarasa','Varan',
    // Y
    'Yaban Domuzu','Yarasa','Yılan','Yunus','Yusufçuk','Yengeç',
    'Yalıçapkını','Yılan Balığı',
    // Z
    'Zebra','Zürafa','Zıpzıp',
  ],

  'Bitki': [
    // A
    'Abanoz','Acur','Açelya','Ahududu','Akasya','Akçaağaç','Ananas','Anason',
    'Ardıç','Armut','Arpa','Asma','Aspir','Ayçiçeği','Ayva','Adaçayı',
    'Avokado','Ateşdikeni','At Kestanesi',
    // B
    'Badem','Bakla','Bambu','Bamya','Barbunya','Begonya','Bezelye','Biber',
    'Biberiye','Böğürtlen','Brokoli','Buğday',
    // C/Ç
    'Ceviz','Civanperçemi','Cennet Kuşu Çiçeği',
    'Çalı','Çam','Çavdar','Çay','Çınar','Çiğdem','Çilek','Çörekotu',
    // D
    'Defne','Dereotu','Domates','Dut','Düğünçiçeği','Devedikeni',
    // E
    'Ebegümeci','Eğreltiotu','Elma','Enginar','Erik',
    // F
    'Fasulye','Fesleğen','Fındık','Fıstık','Funda','Frezya',
    // G
    'Gül','Greyfurt','Glayöl','Gürgen','Gelincik','Ginseng',
    // H
    'Hardal','Haşhaş','Havuç','Hindiba','Hindistancevizi','Hurma','Hanımeli',
    'Hatmi','Hıyar',
    // I/İ
    'Ihlamur','Ispanak','Itır','İğde','İncir',
    // J
    'Jalapeno',
    // K
    'Kabak','Kahve','Kakao','Kaktüs','Karanfil','Karnabahar','Karpuz',
    'Kavak','Kavun','Kayısı','Kekik','Kereviz','Kestane','Keten','Kivi',
    'Krizantem','Kuşburnu','Kayın','Kiraz','Kimyon','Kişniş','Kızılcık',
    'Kadife Çiçeği','Karabiber',
    // L
    'Lale','Lavanta','Lahana','Limon','Leylak','Ladin',
    // M
    'Mandalina','Mantar','Manolya','Marul','Maydanoz','Meşe','Mısır','Muz',
    'Menekşe','Mimoza','Mersin','Mine Çiçeği',
    // N
    'Nane','Nar','Nergis','Nohut','Nilüfer',
    // O/Ö
    'Orkide','Okaliptüs',
    'Ökseotu',
    // P
    'Papatya','Pamuk','Pancar','Patates','Patlıcan','Pelin','Pırasa',
    'Pirinç','Portakal','Palmiye',
    // R
    'Reyhan','Roka','Rezene',
    // S/Ş
    'Sardunya','Sarımsak','Sarmaşık','Saz','Selvi','Söğüt','Soğan','Soya',
    'Sümbül','Susam','Sedir','Semizotu','Sumak','Safran','Siklamen',
    'Şeftali','Şalgam','Şimşir','Şakayık',
    // T
    'Tarçın','Turp','Tütün','Tere','Turunç','Tarhun',
    // U
    'Unutma Beni Çiçeği',
    // Ü
    'Üvez','Üzüm','Üzerlik',
    // V
    'Vişne','Vanilya',
    // Y
    'Yabanmersini','Yosun','Yasemin','Yulaf','Yonca','Yıldız Çiçeği',
    'Yüksükotu','Yer Fıstığı',
    // Z
    'Zakkum','Zambak','Zerdali','Zeytin','Zencefil','Zerdeçal',
  ],

  'Eşya': [
    // A
    'Abajur','Adaptör','Ampul','Anahtar','Ayna','Ayakkabı','Ataç','Askı',
    'Ajanda','Aspiratör','Ateşölçer','Ayakkabılık',
    // B
    'Bıçak','Balta','Bant','Bardak','Baston','Bavul','Beşik','Bilgisayar',
    'Bilezik','Biberon','Boru','Buzdolabı','Battaniye','Bisiklet','Bere',
    'Bileklik','Balon','Büyüteç',
    // C/Ç
    'Ceket','Cetvel','Cımbız','Cüzdan','Cezve','Cep Telefonu',
    'Çadır','Çakı','Çakmak','Çan','Çanta','Çarşaf','Çatal','Çaydanlık',
    'Çekiç','Çengel','Çerçeve','Çivi','Çizme','Çuval','Çöp Kutusu',
    // D
    'Dambıl','Defter','Dolap','Düğme','Dürbün','Davlumbaz','Delgeç',
    'Deodorant','Dikiş Makinesi','Dolma Kalem',
    // E
    'Eldiven','Elbise','Emzik','Etek','Ekmek Kızartma Makinesi','Ekran',
    // F
    'Fener','Fırça','Fırın','Fincan','Fotoğraf Makinesi','Fön Makinesi',
    'Flash Bellek',
    // G
    'Gözlük','Gömlek','Gardırop','Gramofon','Güneş Gözlüğü',
    // H
    'Halı','Hamak','Hançer','Harita','Havlu','Havan','Hırka','Hoparlör',
    'Huni','Hortum','Hesap Makinesi','Havya',
    // I/İ
    'Izgara','Isıtıcı',
    'İbrik','İğne','İlaç','İplik','İskemle','İp','İngiliz Anahtarı',
    // J
    'Jilet','Jeneratör','Jaluzi','Jant',
    // K
    'Kablo','Kaban','Kadeh','Kafes','Kağıt','Kalem','Kamera','Kanca',
    'Kanepe','Kapı','Kaşık','Kavanoz','Kazan','Kazak','Kazma','Keman',
    'Kemer','Kilit','Kitap','Klavye','Koltuk','Kova','Kulaklık','Küpe',
    'Kürek','Kombi','Klima','Kibrit','Kravat','Kolye','Küvet','Kırlent',
    'Kumanda','Kaşkol','Kahve Makinesi','Kalorifer',
    // L
    'Lamba','Lastik','Lavabo','Leğen','Limon Sıkacağı',
    // M
    'Maşa','Makas','Makyaj','Mandal','Manto','Maske','Masa','Matara',
    'Matkap','Mendil','Merdiven','Mikrofon','Minder','Motor','Mum',
    'Musluk','Merdane','Mont','Mangal','Mouse',
    // N
    'Nargile','Nazar Boncuğu',
    // O/Ö
    'Ocak','Oje','Ok','Oklava','Olta','Oturak','Oyun Konsolu','Oyuncak',
    'Önlük','Örs','Örtü',
    // P
    'Pano','Pantolon','Paspas','Paten','Pense','Perde','Pijama','Pil',
    'Piyano','Priz','Pusula','Parfüm',
    // R
    'Radyo','Ranza','Raptiye','Rende','Robot','Ruj','Rulo','Radyatör','Raket',
    // S/Ş
    'Saat','Sabun','Saksı','Sandalye','Sandık','Süpürge','Silah','Silgi',
    'Soba','Sürahi','Sehpa','Süzgeç',
    'Şamdan','Şapka','Şarj','Şemsiye','Şışe','Şort','Şezlong','Şömine',
    'Şal','Şilte','Şofben','Şarj Aleti',
    // T
    'Tabak','Tabanca','Tabela','Tabure','Tarak','Tava','Tekerlek','Telefon',
    'Televizyon','Tencere','Terazi','Terlik','Testere','Toka','Top',
    'Tornavida','Tablet','Termos','Tost Makinesi','Tepsi','Tutkal',
    // U/Ü
    'Uçurtma','Urgan','Ustura','Uydu',
    'Ütü','Üniforma',
    // V
    'Vagon','Valiz','Vantilatör','Vazo','Vida','Vinç','Vitrin',
    // Y
    'Yaka','Yastık','Yatak','Yay','Yorgan','Yüzük','Yelek','Yelpaze',
    'Yapıştırıcı','Yazıcı','Yağmurluk',
    // Z
    'Zarf','Zil','Zımba','Zincir','Zımpara',
  ],

  'Sanatçı': [
    // A
    'Acun Ilıcalı','Adile Naşit','Ajda Pekkan','Alişan','Altan Erkekli',
    'Aras Bulut İynemli','Ata Demirer','Aleyna Tilki','Ahmet Kaya',
    'Ahmet Kural','Ayşen Gruda','Aydilge','Alpay','Arif Sağ',
    'Aydemir Akbaş','Ayça Ayşin Turan','Ali Poyrazoğlu','Ayşegül Aldinç',
    'Ayla Algan','Ali Atay','Aytaç Arman',
    // B
    'Barış Manço','Beren Saat','Bergüzar Korel','Beyazıt Öztürk',
    'Burak Özçivit','Bülent Ersoy','Buray','Bülent Ortaçgil','Bergen',
    'Barış Akarsu','Burak Deniz','Bensu Soral','Bora Öztoprak','Bendeniz',
    // C/Ç
    'Candan Erçetin','Cem Karaca','Cem Yılmaz','Cüneyt Arkın',
    'Çağatay Ulusoy','Çetin Tekindor','Cem Adrian','Can Bonomo',
    'Caner Cindoruk','Coşkun Sabah','Çolpan İlhan','Çelik',
    // D
    'Demet Akalın','Demet Evgar','Demet Akbağ','Doğu Demirkol',
    'Defne Samyeli','Deniz Seki','Doğuş','Duman','Devrim Yakut',
    // E
    'Ebru Gündeş','Edis','Engin Akyürek','Engin Altan Düzyatan',
    'Erol Evgin','Eser Yenenler','Ezgi Mola','Emre Altuğ','Emel Sayın',
    'Ece Seçkin','Emircan İğrek','Erkin Koray','Edip Akbayram',
    'Emre Aydın','Engin Günaydın','Elçin Sangu',
    // F
    'Fahriye Evcen','Fatih Ürek','Fatma Girik','Ferdi Tayfur',
    'Filiz Akın','Funda Arar','Fatih Erkoç','Ferhat Göçer',
    'Furkan Andıç','Fikret Hakan','Furkan Palalı',
    // G
    'Gökhan Özoğuz','Gökçe Bahadır','Gülben Ergen','Gülse Birsel',
    'Gülşen','Gökhan Tepe','Gökhan Türkmen','Gripin','Gupse Özay',
    'Gürkan Uygun','Gökçe','Güven Kıraç','Gökhan Kırdar','Gökhan Özen',
    'Göksel',
    // H
    'Hadise','Halit Ergenç','Haluk Bilginer','Haluk Levent','Hande Erçel',
    'Hande Yener','Hayko Cepkin','Hülya Avşar','Hülya Koçyiğit',
    'Hakan Altun','Hazal Kaya','Hümeyra','Halil Sezai',
    'Hasan Can Kaya','Hande Doğandemir',
    // I/İ
    'Işın Karaca','İbrahim Büyükak','İbrahim Çelikkol','İbrahim Tatlıses',
    'İlker Ayrık','İrem Derici','İlyas Yalçıntaş','Irmak Arıcı',
    'İclal Aydın','İsmail YK','İlyas Salman',
    // J
    'Janset',
    // K
    'Kaan Urgancıoğlu','Kadir İnanır','Kadir Doğulu','Kemal Sunal',
    'Kenan Doğulu','Kenan İmirzalıoğlu','Kıvanç Tatlıtuğ','Kibariye',
    'Koray Avcı','Kıraç','Kayahan','Kutsi','Kerem Bursin','Keremcem',
    // L
    'Leman Sam','Levent Yüksel','Linet','Latif Doğan',
    // M
    'Mabel Matiz','Mahsun Kırmızıgül','Mehmet Ali Erbil','Mehmet Günsür',
    'Melek Mosso','Merve Dizdar','Murat Boz','Murat Dalkılıç',
    'Mustafa Ceceli','Mustafa Sandal','Müslüm Gürses','Müjdat Gezen',
    'Manga','Mirkelam','Muazzez Abacı','Musa Eroğlu','Mazhar Alanson',
    'Metin Akpınar','Murat Kekilli','Murat Yıldırım','Melis Sezen',
    'Mert Fırat',
    // N
    'Nebahat Çehre','Necati Şaşmaz','Nejat İşler','Neşet Ertaş',
    'Nil Karaibrahimgil','Nilüfer','Nurgül Yeşilçay','Nazan Öncel',
    'Nükhet Duru','Neslihan Atagül','Nur Fettahoğlu',
    // O/Ö
    'Oğuzhan Koç','Okan Bayülgen','Orhan Gencebay','Ozan Güven',
    'Özcan Deniz','Özgü Namal','Özlem Tekin','Onur Akın','Oktay Kaynarca',
    'Ozan Çolakoğlu','Ozan Doğulu','Oya Aydoğan',
    // P
    'Pelin Karahan','Pınar Altuğ','Pınar Deniz','Pinhani',
    'Perihan Savaş','Petek Dinçöz',
    // R
    'Rafet El Roman','Reynmen','Rober Hatemo','Rutkay Aziz',
    'Resul Dindar','Redd','Reyhan Karaca',
    // S/Ş
    'Seda Sayan','Sefo','Selda Bağcan','Serdar Ortaç','Serenay Sarıkaya',
    'Sertab Erener','Sezen Aksu','Sıla','Sibel Can','Sinan Akçıl',
    'Şahan Gökbakar','Şener Şen','Şevval Sam','Sagopa Kajmer',
    'Soner Sarıkabadayı','Suavi','Sadri Alışık','Sarp Akkaya',
    'Sinem Kobal','Songül Öden','Sibel Tüzün','Şebnem Ferah',
    'Şafak Sezer','Şükrü Özyıldız',
    // T
    'Tarkan','Teoman','Tolga Çevik','Tolgahan Sayışman','Türkan Şoray',
    'Tan Taşçı','Tuğba Yurt','Toygar Işıklı','Tarık Akan',
    'Tolga Sarıtaş','Tuba Büyüküstün','Tuba Ünsal',
    // U/Ü
    'Uğur Yücel','Uraz Kaygılaroğlu','Ümit Besen','Ufuk Beydemir',
    'Uğur Işılak',
    // V
    'Vahide Perçin','Volkan Konak','Vildan Atasever','Vatan Şaşıaz',
    // Y
    'Yalın','Yaşar','Yıldız Tilbe','Yılmaz Erdoğan','Yılmaz Morgül',
    'Yüksek Sadakat','Yusuf Güney','Yonca Evcimik','Yalçın Dümer',
    'Yavuz Bingöl','Yiğit Özşener','Yağmur Tanrısevsin',
    // Z
    'Zara','Zeki Müren','Zerrin Özer','Zeynep Bastık','Zuhal Olcay',
    'Zülfü Livaneli','Zeynep Dizdar','Zeki Alasya','Zuhal Topal',
  ],
};

// Normalize edilmiş sözlük (büyük/küçük harf bağımsız arama için)
const NORMALIZED_DICTIONARY = {};
Object.keys(GAME_DICTIONARY).forEach(cat => {
  NORMALIZED_DICTIONARY[cat] = GAME_DICTIONARY[cat].map(w => w.trim().toLocaleLowerCase('tr-TR'));
});

// ─── BOT MANTIĞI ──────────────────────────────────────────────────────────────
const generateBotSubmission = (letter, categories) => {
  const answers = {};
  const lowerLetter = letter.toLocaleLowerCase('tr-TR');
  categories.forEach(cat => {
    let word = "";
    let isValid = false;
    // %15 ihtimalle boş bırak (bot da bazen bilmeyebilir)
    if (Math.random() > 0.15) {
      if (GAME_DICTIONARY[cat]) {
        const matches = GAME_DICTIONARY[cat].filter(w =>
          w.toLocaleLowerCase('tr-TR').startsWith(lowerLetter)
        );
        if (matches.length > 0) {
          word = matches[Math.floor(Math.random() * matches.length)];
          isValid = true;
        }
      }
    }
    answers[cat] = { word, isValid };
  });
  return {
    answers,
    timeTaken: Math.floor(Math.random() * 20) + 8,
    submittedAt: Date.now()
  };
};

// ─── CEVAP DOĞRULAMA ──────────────────────────────────────────────────────────
const validateAnswers = async (answers, letter, categories) => {
  const results = {};
  const lowerLetter = letter.toLocaleLowerCase('tr-TR');

  for (const cat of categories) {
    const word = answers[cat] || "";
    const normalized = word.trim().toLocaleLowerCase('tr-TR');
    const isValidFormat = normalized.length > 1 && normalized.startsWith(lowerLetter);

    if (!isValidFormat) {
      results[cat] = { word: word.trim(), isValid: false };
      continue;
    }

    // Sözlükte ara
    if (NORMALIZED_DICTIONARY[cat]?.includes(normalized)) {
      results[cat] = { word: word.trim(), isValid: true };
    } else {
      // Kısmi eşleşme: sözlükteki bir kelimeyle başlıyor mu?
      // (örn: "Kıvanç Tatlıtuğ" için "kıvanç" yazılmışsa kabul et)
      const partialMatch = NORMALIZED_DICTIONARY[cat]?.some(w => w.startsWith(normalized) && normalized.length >= 3);
      results[cat] = { word: word.trim(), isValid: !!partialMatch };
    }
  }

  return results;
};

// ─── PUAN HESAPLAMA ───────────────────────────────────────────────────────────
const calculateRoundScores = (allAnswers, categories) => {
  const scores = {};
  let fastestUser = null;
  let minTime = Infinity;

  // Başlangıç puanları
  for (const uid of Object.keys(allAnswers)) {
    scores[uid] = { points: 0 };
  }

  // En hızlı oyuncuyu bul (en az 1 doğru cevabı olan)
  for (const uid of Object.keys(allAnswers)) {
    const hasValidAnswer = Object.values(allAnswers[uid].answers || {}).some(a => a?.isValid);
    if (hasValidAnswer && (allAnswers[uid].timeTaken || 999) < minTime) {
      minTime = allAnswers[uid].timeTaken || 999;
      fastestUser = uid;
    }
  }

  // Her kategori için puan ver
  for (const cat of categories) {
    const wordFrequency = {};

    // Önce tüm geçerli cevapları frekans tablosuna ekle
    for (const uid of Object.keys(allAnswers)) {
      const ansObj = allAnswers[uid]?.answers?.[cat];
      const isEmpty = !ansObj?.word || ansObj.word.trim() === '';
      const isInvalid = !ansObj?.isValid;

      if (isEmpty) {
        scores[uid].points -= 1; // Boş = -1
      } else if (isInvalid) {
        scores[uid].points -= 2; // Yanlış = -2
      } else {
        const normalized = ansObj.word.toLocaleLowerCase('tr-TR').trim();
        wordFrequency[normalized] = (wordFrequency[normalized] || 0) + 1;
      }
    }

    // Frekansa göre puan ver
    for (const uid of Object.keys(allAnswers)) {
      const ansObj = allAnswers[uid]?.answers?.[cat];
      if (ansObj?.isValid && ansObj.word?.trim()) {
        const normalized = ansObj.word.toLocaleLowerCase('tr-TR').trim();
        const freq = wordFrequency[normalized] || 1;
        if (freq === 1) {
          scores[uid].points += 5; // Eşsiz = +5
          allAnswers[uid].answers[cat].isUnique = true;
        } else {
          scores[uid].points += 3; // Ortak = +3
          allAnswers[uid].answers[cat].isUnique = false;
        }
      }
    }
  }

  // En hızlı bonusu
  if (fastestUser && scores[fastestUser]) {
    allAnswers[fastestUser].isFastest = true;
    scores[fastestUser].points += 2;
  }

  return scores;
};

// ─── ERİŞİM ENGEL EKRANI ──────────────────────────────────────────────────────
const BlockedScreen = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
    <div className="bg-slate-900 border-2 border-red-500/50 rounded-3xl p-10 max-w-md text-center">
      <Lock className="w-16 h-16 text-red-500 mx-auto mb-4"/>
      <h1 className="text-2xl font-black text-red-400 mb-2">Erişim Kısıtlı</h1>
      <p className="text-slate-300 text-sm mb-6">Bu oyuna yalnızca <strong className="text-orange-400">Forge&Play</strong> üzerinden erişilebilir.</p>
      <a
        href="https://www.forgeandplay.com"
        className="inline-block bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black px-8 py-4 rounded-2xl text-lg hover:scale-105 transition-transform"
      >
        forgeandplay.com'a Git
      </a>
    </div>
  </div>
);

// ─── TOP BAR ──────────────────────────────────────────────────────────────────
const TopBar = ({ isMuted, toggleMute }) => (
  <div className="fixed top-4 left-4 right-4 flex justify-between items-start z-50 pointer-events-none">
    <a href="https://forgeandplay.com" target="_blank" rel="noreferrer"
      className="pointer-events-auto flex items-center gap-2 md:gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-2 md:px-4 md:py-2 rounded-2xl border border-fuchsia-500/30 shadow-xl shadow-fuchsia-500/10 hover:scale-105 hover:border-cyan-400/50 transition-all group">
      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-fuchsia-600 to-cyan-500 rounded-xl flex items-center justify-center font-black text-white text-xs md:text-sm shadow-inner group-hover:rotate-12 transition-transform">FP</div>
      <div className="flex flex-col leading-none">
        <span className="text-[8px] md:text-[10px] text-fuchsia-300 font-bold uppercase tracking-widest mb-1">Geliştirici</span>
        <span className="text-xs md:text-sm font-black text-white tracking-wide">Forge<span className="text-cyan-400">And</span>Play</span>
      </div>
    </a>
    <button onClick={toggleMute}
      className="pointer-events-auto bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all shadow-xl">
      {isMuted ? <VolumeX className="w-6 h-6 text-red-400"/> : <Volume2 className="w-6 h-6 text-cyan-400"/>}
    </button>
  </div>
);

// ─── SETUP SCREEN ─────────────────────────────────────────────────────────────
const SetupScreen = ({ onJoin, onCreate, onShowLeaderboard }) => {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState('home');
  const [rounds, setRounds] = useState(10);

  const isFormValid = name.trim().length > 1 && Number(age) >= 5 && Number(age) <= 99;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute top-[10%] left-[10%] w-64 h-64 md:w-96 md:h-96 bg-fuchsia-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse"></div>
      <div className="absolute bottom-[10%] right-[10%] w-64 h-64 md:w-96 md:h-96 bg-cyan-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse" style={{animationDelay:'1s'}}></div>

      <div className="relative z-10 max-w-md w-full bg-slate-900/60 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] border-2 border-slate-700/50 shadow-2xl shadow-cyan-900/20 mt-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-3xl mb-4 transform rotate-6 hover:rotate-12 transition-transform shadow-xl shadow-fuchsia-500/30">
            <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-white"/>
          </div>
          <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-fuchsia-400">İsim Şehir</h1>
          <div className="inline-block bg-white text-black font-black uppercase tracking-widest text-[10px] md:text-xs px-3 py-1 rounded-full mt-2 transform -translate-y-2">Online</div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <input type="text" maxLength={15} value={name}
              onChange={e => setName(sanitize(e.target.value))}
              placeholder="Oyuncu Adın..." autoComplete="off"
              className="w-2/3 bg-slate-950/50 border-2 border-slate-700 rounded-2xl px-4 py-4 text-white text-[16px] md:text-lg font-bold placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all text-center"/>
            <input type="number" min="5" max="99" value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="Yaşın"
              className="w-1/3 bg-slate-950/50 border-2 border-slate-700 rounded-2xl px-4 py-4 text-white text-[16px] md:text-lg font-bold placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all text-center"/>
          </div>

          <div className="flex flex-wrap gap-2 justify-center bg-slate-950/30 p-4 rounded-3xl border border-slate-800 h-40 overflow-y-auto">
            {AVATARS.map(a => (
              <button key={a} onClick={() => { playSound('pop'); setAvatar(a); }}
                className={`text-2xl md:text-3xl w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${avatar === a ? 'bg-gradient-to-br from-fuchsia-500 to-cyan-500 scale-110 shadow-lg shadow-cyan-500/30 rotate-3' : 'bg-slate-800/50 hover:bg-slate-700 hover:scale-105'}`}>
                {a}
              </button>
            ))}
          </div>

          {mode === 'home' && (
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={() => { playSound('pop'); setMode('create'); }} disabled={!isFormValid}
                className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white font-black text-lg py-4 px-4 rounded-2xl shadow-xl transform transition hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                <Plus className="w-6 h-6"/> Yeni Oda Kur
              </button>
              <button onClick={() => { playSound('pop'); setMode('join'); }} disabled={!isFormValid}
                className="w-full bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 text-white font-black text-lg py-4 px-4 rounded-2xl shadow-lg transform transition hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                <LogIn className="w-6 h-6"/> Odaya Katıl
              </button>
              <button onClick={() => { playSound('pop'); onShowLeaderboard(); }}
                className="w-full bg-indigo-900/50 hover:bg-indigo-800/50 border-2 border-indigo-500/50 text-indigo-300 font-black text-sm py-3 px-4 rounded-2xl transition flex items-center justify-center gap-2 mt-2">
                <Globe className="w-5 h-5"/> Global Liderlik Tablosu
              </button>
            </div>
          )}

          {mode === 'create' && (
            <div className="pt-2 space-y-4">
              <div className="bg-slate-950/30 p-4 rounded-3xl border border-slate-800">
                <label className="block text-sm font-bold text-slate-400 mb-3 text-center uppercase tracking-widest">Tur Sayısı</label>
                <div className="flex justify-center gap-2">
                  {[5, 10, 20, 30, 50].map(r => (
                    <button key={r} onClick={() => { playSound('pop'); setRounds(r); }}
                      className={`w-12 h-12 rounded-xl font-black text-xl transition-all ${rounds === r ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/50 scale-110' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => { playSound('pop'); onCreate({ name: sanitize(name), avatar, age: Number(age), rounds }); }}
                className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-black text-xl py-4 px-4 rounded-2xl shadow-xl transform transition hover:-translate-y-1 flex items-center justify-center gap-2">
                <Play className="w-6 h-6"/> Macerayı Başlat
              </button>
              <button onClick={() => { playSound('pop'); setMode('home'); }} className="w-full font-bold text-slate-400 hover:text-white transition-colors py-2">Geri Dön</button>
            </div>
          )}

          {mode === 'join' && (
            <div className="pt-2 space-y-4">
              <input type="text" maxLength={4} value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="KODU GİR" autoComplete="off"
                className="w-full bg-slate-950/50 border-2 border-slate-700 rounded-2xl px-4 py-4 text-white text-center font-black text-3xl tracking-[0.5em] focus:outline-none focus:border-fuchsia-500 uppercase"/>
              <button onClick={() => { playSound('pop'); onJoin(roomCode, { name: sanitize(name), avatar, age: Number(age) }); }}
                disabled={roomCode.length !== 4}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xl py-4 px-4 rounded-2xl shadow-xl transform transition hover:-translate-y-1 disabled:opacity-50 flex items-center justify-center gap-2">
                <LogIn className="w-6 h-6"/> İçeri Dal!
              </button>
              <button onClick={() => { playSound('pop'); setMode('home'); }} className="w-full font-bold text-slate-400 hover:text-white transition-colors py-2">Geri Dön</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── LİDERLİK TABLOSU ─────────────────────────────────────────────────────────
const LeaderboardScreen = ({ onBack }) => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const lbRef = collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard');
        const snap = await getDocs(lbRef);
        const data = [];
        snap.forEach(d => data.push(d.data()));
        data.sort((a, b) => b.totalScore - a.totalScore);
        setLeaders(data.slice(0, 50));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchLeaders();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 py-20 relative overflow-hidden">
      <div className="relative z-10 w-full max-w-2xl bg-slate-900/80 backdrop-blur-2xl border-2 border-indigo-500/30 p-8 rounded-[3rem] shadow-2xl">
        <div className="text-center mb-8">
          <Globe className="w-16 h-16 mx-auto text-indigo-400 mb-4"/>
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 uppercase tracking-widest">Global Sıralama</h2>
        </div>
        <div className="bg-slate-950/50 rounded-3xl p-4 min-h-[300px] max-h-[500px] overflow-y-auto mb-8 border border-slate-800">
          {loading ? (
            <div className="flex justify-center items-center h-full"><RefreshCw className="w-8 h-8 animate-spin text-indigo-500"/></div>
          ) : leaders.length === 0 ? (
            <p className="text-center text-slate-500 font-bold mt-10">Henüz kimse oyun oynamadı. İlk sen ol!</p>
          ) : (
            <div className="space-y-3">
              {leaders.map((l, i) => (
                <div key={i} className={`flex items-center justify-between p-4 rounded-2xl ${i===0?'bg-yellow-500/20 border border-yellow-500/50':i===1?'bg-slate-300/10':i===2?'bg-amber-700/20':'bg-slate-900'}`}>
                  <div className="flex items-center gap-4">
                    <span className={`font-black text-xl w-6 text-center ${i===0?'text-yellow-400':i===1?'text-slate-300':i===2?'text-amber-500':'text-slate-500'}`}>#{i+1}</span>
                    <span className="text-3xl">{l.avatar}</span>
                    <span className="font-bold text-lg">{l.name}</span>
                  </div>
                  <span className="font-black text-xl text-indigo-400 bg-indigo-950/50 px-4 py-2 rounded-xl">{l.totalScore} Puan</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={onBack} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition">Ana Menüye Dön</button>
      </div>
    </div>
  );
};

// ─── LOBBY SCREEN ─────────────────────────────────────────────────────────────
const LobbyScreen = ({ room, user, onStartGame, onLeave, onAddBot }) => {
  const isHost = room.hostId === user.uid;
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full mt-24">
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/60 backdrop-blur-xl border-2 border-fuchsia-500/30 p-6 md:p-8 rounded-[2rem] mb-8 shadow-2xl">
          <div className="text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-black flex items-center justify-center md:justify-start gap-3 text-white mb-2">
              <Users className="text-cyan-400 w-8 h-8"/> Bekleme Salonu
            </h2>
            <p className="text-slate-400 font-medium text-sm md:text-lg">Herkes hazırsa oyunu başlat!</p>
          </div>
          <div className="mt-6 md:mt-0 bg-black/50 border-2 border-slate-700 px-6 py-3 rounded-3xl text-center">
            <span className="text-xs md:text-sm text-cyan-400 uppercase tracking-widest font-black block mb-1">Katılım Kodu</span>
            <span className="text-4xl md:text-5xl font-mono tracking-[0.2em] font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">{room.id}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {Object.values(room.players || {}).map(p => (
            <div key={p.id} className={`bg-slate-900/80 border-2 ${p.isBot?'border-cyan-500/50':'border-slate-700'} rounded-3xl p-4 md:p-6 flex flex-col items-center`}>
              <div className="text-5xl md:text-6xl mb-3">{p.avatar}</div>
              <span className="font-black text-lg text-white truncate w-full text-center">{p.name}</span>
              {!p.isBot && <span className="text-xs text-fuchsia-400 font-bold bg-fuchsia-950/50 px-2 py-1 rounded-md mt-1">{p.age} Yaş</span>}
              {p.isBot && <span className="mt-1 text-[10px] font-bold bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full uppercase tracking-wider">Bot</span>}
            </div>
          ))}
          {Object.values(room.players || {}).length < 8 && (
            <div className="bg-slate-900/30 border-2 border-dashed border-slate-700/50 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-500 min-h-[160px]">
              <RefreshCw className="w-8 h-8 mb-2 opacity-50"/>
              <span className="text-xs font-bold uppercase tracking-widest text-center">Oyuncu<br/>Bekleniyor</span>
            </div>
          )}
        </div>

        {isHost ? (
          <div className="bg-slate-900/80 border-2 border-fuchsia-500/20 p-6 md:p-8 rounded-[2rem] text-center">
            <p className="text-slate-300 mb-6 font-bold text-sm md:text-lg">Oda Kurucusu sensin!</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => { playSound('pop'); onAddBot(); }}
                className="bg-slate-800 border-2 border-cyan-500/50 hover:bg-cyan-900/30 text-cyan-400 font-black py-4 px-6 rounded-2xl transition flex items-center justify-center gap-3">
                <Bot className="w-5 h-5"/> Bot Ekle
              </button>
              <button onClick={() => { playSound('pop'); onStartGame(); }}
                className="bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-black py-4 px-8 rounded-2xl shadow-xl transition hover:-translate-y-1 text-lg flex items-center justify-center gap-3">
                <Play className="w-6 h-6 fill-current"/> OYUNU BAŞLAT
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 bg-slate-900/80 rounded-[2rem] border-2 border-slate-800">
            <p className="text-cyan-400 animate-pulse text-xl font-black flex items-center justify-center gap-3">
              <Clock className="w-6 h-6"/> Kurucunun başlatması bekleniyor...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── GAME SCREEN ──────────────────────────────────────────────────────────────
const GameScreen = ({ room, user, onSubmitAnswers }) => {
  const currentRoundData = room.rounds[room.currentRound];
  const [phase, setPhase] = useState('roulette');
  const [displayLetter, setDisplayLetter] = useState('?');
  const [timeLeft, setTimeLeft] = useState(currentRoundData?.durationSecs || 60);
  const [answers, setAnswers] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    setPhase('roulette');
    setHasSubmitted(false);
    setAnswers({});
    setTimeLeft(currentRoundData?.durationSecs || 60);

    let ticks = 0;
    const interval = setInterval(() => {
      setDisplayLetter(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
      ticks++;
      if (ticks > 30) {
        clearInterval(interval);
        setDisplayLetter(currentRoundData.letter);
        setPhase('playing');
        playSound('ding');
      }
    }, 100);
    return () => clearInterval(interval);
  }, [currentRoundData?.letter, room.currentRound]);

  useEffect(() => {
    if (phase === 'playing' && !hasSubmitted) {
      if (timeLeft <= 0) { handleSubmit(); return; }
      const timerId = setTimeout(() => {
        setTimeLeft(prev => {
          if (prev <= 6 && prev > 1) playSound('tick');
          return prev - 1;
        });
      }, 1000);
      return () => clearTimeout(timerId);
    }
  }, [phase, timeLeft, hasSubmitted]);

  const handleSubmit = () => {
    if (hasSubmitted) return;
    playSound('ding');
    setHasSubmitted(true);
    const timeTaken = Math.max(1, (currentRoundData?.durationSecs || 60) - timeLeft);
    onSubmitAnswers(answers, timeTaken);
  };

  if (phase === 'roulette') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/20 to-cyan-900/20 animate-pulse"></div>
        <h3 className="text-xl md:text-3xl text-cyan-400 font-black mb-8 uppercase tracking-[0.3em] z-10 text-center">Harf Çekiliyor</h3>
        <div className="w-48 h-48 md:w-64 md:h-64 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(217,70,239,0.4)] border-8 border-white/10 z-10 animate-bounce">
          <span className="text-7xl md:text-[140px] font-black text-white">{displayLetter}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl mt-16 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-6 bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700/50 p-4 md:p-6 rounded-3xl sticky top-20 z-20 shadow-2xl">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-2xl flex items-center justify-center text-4xl md:text-5xl font-black shadow-[0_0_30px_rgba(217,70,239,0.4)] -rotate-3 border-4 border-slate-900">
              {currentRoundData.letter}
            </div>
            <div>
              <div className="text-xs md:text-sm text-fuchsia-400 uppercase tracking-widest font-black mb-1">TUR {room.currentRound + 1}/{room.settings.rounds}</div>
              <div className="font-black text-slate-300 text-xs md:text-sm">Enter ile alt satıra geç!</div>
            </div>
          </div>
          <div className={`flex flex-col items-center justify-center w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl border-4 ${timeLeft <= 10 ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-slate-950 border-cyan-500 text-cyan-400'}`}>
            <Clock className="w-5 h-5 md:w-8 md:h-8 mb-1"/>
            <span className="font-black text-2xl md:text-3xl leading-none">{timeLeft}</span>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6 flex-1 pb-32">
          {room.settings.categories.map((cat, idx) => (
            <div key={cat} className="group relative bg-slate-900 border-2 border-slate-700 rounded-3xl md:rounded-[2rem] p-1 md:p-2 focus-within:border-cyan-400 focus-within:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all">
              <div className="absolute top-0 left-4 md:left-6 -translate-y-1/2 bg-slate-950 px-3 py-1 md:px-4 md:py-1 rounded-full border-2 border-inherit text-xs md:text-sm font-black uppercase tracking-widest z-10 group-focus-within:text-cyan-400 text-slate-400">
                {cat}
              </div>
              <input
                ref={el => inputRefs.current[idx] = el}
                type="text"
                value={answers[cat] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [cat]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (idx + 1 < room.settings.categories.length) {
                      inputRefs.current[idx + 1]?.focus();
                    } else {
                      handleSubmit();
                    }
                  }
                }}
                disabled={hasSubmitted}
                placeholder={`${currentRoundData.letter} ile başlayan...`}
                autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck="false"
                className="w-full bg-transparent text-white px-5 py-5 md:px-6 md:py-6 text-[16px] md:text-2xl font-black focus:outline-none placeholder-slate-700 disabled:opacity-50"
              />
              {idx < room.settings.categories.length - 1 && (
                <ArrowDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-700 group-focus-within:text-cyan-500/50"/>
              )}
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-30 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            {hasSubmitted ? (
              <div className="bg-slate-900 border-2 border-cyan-500/50 text-center py-5 md:py-6 rounded-3xl text-cyan-400 font-black text-lg flex items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin"/> Rakipler bekleniyor...
              </div>
            ) : (
              <button onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-black py-5 md:py-6 px-6 rounded-3xl shadow-[0_10px_40px_rgba(217,70,239,0.4)] transform transition hover:-translate-y-2 text-xl md:text-2xl flex items-center justify-center gap-3">
                <Zap className="w-6 h-6 md:w-8 md:h-8 fill-current"/> GÖNDER VE BİTİR
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ROUND RESULTS ────────────────────────────────────────────────────────────
const RoundResultsScreen = ({ room, user, onNextRound }) => {
  const isHost = room.hostId === user.uid;
  const currentRoundData = room.rounds[room.currentRound];
  const { scores, answers, letter } = currentRoundData;
  const sortedPlayers = Object.values(room.players).sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto mt-20">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-cyan-500 mb-4">TUR SONUCU</h2>
          <div className="inline-flex items-center gap-3 md:gap-4 bg-slate-900 border-2 border-slate-700 px-4 py-2 md:px-6 md:py-2 rounded-full">
            <span className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-widest">Oynanan Harf</span>
            <span className="text-2xl md:text-3xl font-black text-white bg-fuchsia-600 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl -rotate-6">{letter}</span>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6 mb-24 md:mb-12">
          {sortedPlayers.map((player, index) => {
            const pScores = scores?.[player.id];
            const pAnswers = answers?.[player.id]?.answers || {};
            const isFastest = answers?.[player.id]?.isFastest;

            return (
              <div key={player.id} className="bg-slate-900/80 border-2 border-slate-800 rounded-3xl md:rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="bg-slate-950/50 p-4 md:p-6 flex flex-col md:flex-row justify-between md:items-center border-b-2 border-slate-800 gap-4">
                  <div className="flex items-center gap-3 md:gap-4">
                    <span className="text-2xl md:text-3xl font-black text-slate-600 w-8 md:w-10">#{index + 1}</span>
                    <span className="text-4xl md:text-5xl">{player.avatar}</span>
                    <div className="flex flex-col">
                      <span className="font-black text-xl md:text-2xl tracking-wide">
                        {player.name} {player.id === user.uid && <span className="text-fuchsia-400 text-xs ml-1 uppercase">(SEN)</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 md:gap-4 self-end md:self-auto">
                    <div className={`border-2 px-3 py-2 md:px-6 md:py-3 rounded-2xl flex flex-col items-center ${pScores?.points < 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                      <span className="text-xl md:text-3xl font-black">{pScores?.points > 0 ? '+' : ''}{pScores?.points || 0}</span>
                      <span className="text-[8px] md:text-[10px] uppercase font-black mt-1 opacity-80">Bu Tur</span>
                    </div>
                    <div className="bg-indigo-500/10 border-2 border-indigo-500/30 px-4 py-2 md:px-6 md:py-3 rounded-2xl flex flex-col items-center">
                      <span className="text-2xl md:text-3xl font-black text-indigo-400">{player.score}</span>
                      <span className="text-[8px] md:text-[10px] text-indigo-500/80 uppercase font-black mt-1">Toplam</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 md:p-6 bg-slate-900/30">
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    {room.settings.categories.map(cat => {
                      const answerObj = pAnswers[cat];
                      if (!answerObj || !answerObj.word || answerObj.word.trim() === '') {
                        return <div key={cat} className="text-xs md:text-sm font-bold bg-slate-800 text-slate-500 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-slate-700">{cat}: <span className="italic">Boş</span> <span className="text-red-400 ml-1 opacity-80">(-1)</span></div>;
                      }
                      if (!answerObj.isValid) {
                        return <div key={cat} className="text-xs md:text-sm font-bold bg-red-950/40 border border-red-500/30 text-red-400 px-3 py-1.5 md:px-4 md:py-2 rounded-xl line-through decoration-red-500 decoration-2">{cat}: {answerObj.word} <span className="decoration-transparent">(-2)</span></div>;
                      }
                      return (
                        <div key={cat} className={`text-xs md:text-sm font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-xl border-2 ${answerObj.isUnique ? 'bg-fuchsia-900/30 border-fuchsia-500 text-fuchsia-100' : 'bg-cyan-900/30 border-cyan-500/50 text-cyan-100'}`}>
                          <span className="opacity-70 mr-1">{cat}:</span>
                          <span className="text-white text-[14px] md:text-base">{answerObj.word}</span>
                          <span className="ml-1 md:ml-2 text-[10px] md:text-xs font-black opacity-80">(+{answerObj.isUnique ? 5 : 3})</span>
                        </div>
                      );
                    })}
                    {isFastest && (
                      <div className="text-xs md:text-sm font-black bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400 px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-1.5">
                        <Zap className="w-4 h-4 fill-current"/> En Hızlı (+2)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isHost ? (
          <div className="text-center fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-10 md:static md:bg-none">
            <button onClick={() => { playSound('pop'); onNextRound(); }}
              className="w-full md:w-auto bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-black py-5 md:py-6 px-8 md:px-16 rounded-3xl md:rounded-[2rem] shadow-[0_10px_40px_rgba(6,182,212,0.4)] transform transition hover:-translate-y-2 text-xl md:text-2xl flex items-center justify-center gap-3 md:gap-4 mx-auto">
              {room.currentRound + 1 >= room.settings.rounds ? 'FİNAL TABLOSU' : 'SONRAKİ TUR'} <ArrowRight className="w-6 h-6 md:w-8 md:h-8"/>
            </button>
          </div>
        ) : (
          <div className="text-center p-6 md:p-8 bg-slate-900/90 backdrop-blur-md rounded-t-3xl md:rounded-[2rem] border-t-2 md:border-2 border-slate-700 shadow-2xl fixed bottom-0 left-0 right-0 md:static z-10">
            <p className="text-cyan-400 animate-pulse text-lg md:text-2xl font-black flex items-center justify-center gap-2 md:gap-3">
              <Sparkles className="w-6 h-6 md:w-8 md:h-8"/> Kurucu bekleniyor...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── FİNAL SCORE ─────────────────────────────────────────────────────────────
const FinalScoreScreen = ({ room, user }) => {
  const sortedPlayers = Object.values(room.players).sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  useEffect(() => { playSound('win'); }, []);

  const handleShare = () => {
    playSound('pop');
    const myPlayer = Object.values(room.players).find(p => p.id === user.uid);
    const text = `İsim Şehir Online'da ${myPlayer?.score || 0} puan yaptım! Forge&Play'de oynamak için: https://www.forgeandplay.com`;
    if (navigator.share) {
      navigator.share({ title: 'İsim Şehir Online', text, url: 'https://www.forgeandplay.com' });
    } else {
      navigator.clipboard.writeText(text).then(() => alert("Paylaşım metni kopyalandı!")).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 py-16 md:py-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-80">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="absolute w-3 h-3 rounded-full animate-ping" style={{ left:`${Math.random()*100}%`, top:`${Math.random()*100}%`, animationDelay:`${Math.random()*2}s`, animationDuration:`${1+Math.random()*3}s`, backgroundColor:['#d946ef','#06b6d4','#10b981','#f59e0b','#ec4899','#8b5cf6'][Math.floor(Math.random()*6)]}}/>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-3xl bg-slate-900/80 backdrop-blur-2xl border-4 border-yellow-500/50 p-8 md:p-16 rounded-[3rem] shadow-[0_0_120px_rgba(234,179,8,0.2)] text-center mt-10">
        <div className="relative inline-block mt-4 mb-10 group">
          <Crown className="w-20 h-20 md:w-32 md:h-32 text-yellow-400 absolute -top-12 md:-top-20 left-1/2 transform -translate-x-1/2 -rotate-12 drop-shadow-[0_10px_20px_rgba(250,204,21,0.6)] z-20 animate-bounce" fill="currentColor"/>
          <div className="relative text-[100px] md:text-[160px]">{winner?.avatar}</div>
        </div>

        <h1 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 mb-2 md:mb-4">Oyunun Yıldızı</h1>
        <p className="text-3xl md:text-5xl font-black text-white mb-10 md:mb-16 tracking-wide">{winner?.name}</p>

        <div className="space-y-3 md:space-y-4 mb-10 md:mb-16 text-left">
          {sortedPlayers.map((player, idx) => (
            <div key={player.id} className={`flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-[2rem] transform transition hover:scale-[1.02] ${idx===0?'bg-gradient-to-r from-yellow-500/30 to-yellow-600/10 border-2 border-yellow-400 scale-105':'bg-slate-950/50 border-2 border-slate-800'}`}>
              <div className="flex items-center gap-3 md:gap-6">
                <div className={`w-8 md:w-12 text-center font-black text-xl md:text-3xl ${idx===0?'text-yellow-400':idx===1?'text-slate-300':idx===2?'text-amber-600':'text-slate-600'}`}>#{idx+1}</div>
                <div className="text-3xl md:text-5xl">{player.avatar}</div>
                <div className="font-black text-lg md:text-2xl text-white truncate max-w-[120px] md:max-w-none">
                  {player.name} {player.id === user.uid && <span className="text-fuchsia-400 text-xs ml-1 uppercase">(SEN)</span>}
                </div>
              </div>
              <div className="text-2xl md:text-4xl font-black text-white bg-slate-900 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl border-2 border-slate-700">
                {player.score} <span className="text-[10px] md:text-sm font-bold text-slate-500 uppercase ml-1 hidden sm:inline-block">Puan</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
          <button onClick={handleShare}
            className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black py-4 px-8 md:py-5 md:px-10 rounded-2xl shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2">
            <Share2 className="w-5 h-5"/> ZAFERİ PAYLAŞ
          </button>
          <button onClick={() => { playSound('pop'); window.location.reload(); }}
            className="w-full sm:w-auto bg-slate-800 border-2 border-slate-700 text-white font-black py-4 px-8 md:py-5 md:px-10 rounded-2xl hover:bg-slate-700 hover:scale-105 transition-all flex items-center justify-center gap-2">
            YENİDEN OYNA
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ANA UYGULAMA ─────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(GLOBAL_MUTED);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Erişim kontrolü
  if (!IS_AUTHORIZED) return <BlockedScreen/>;

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
      try { await signInAnonymously(auth); }
      catch (err) { console.error("Auth Error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !room?.id) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.id);
    const unsubscribe = onSnapshot(roomRef, snapshot => {
      if (snapshot.exists()) {
        setRoom(snapshot.data());
      } else {
        setRoom(null);
        alert("Oda kapatıldı veya bulunamadı.");
      }
    }, error => console.error("Room sync error:", error));
    return () => unsubscribe();
  }, [user, room?.id]);

  const getDynamicTime = (players) => {
    const playerList = Object.values(players || {});
    const ages = playerList.filter(p => !p.isBot && p.age).map(p => Number(p.age));
    if (ages.length === 0) return 45;
    const minAge = Math.min(...ages);
    if (minAge <= 9) return 90;
    if (minAge <= 14) return 60;
    return 45;
  };

  const handleCreateRoom = async (profile) => {
    if (!user) return;
    const roomId = generateRoomCode();
    const newRoom = {
      id: roomId,
      hostId: user.uid,
      status: 'lobby',
      settings: { rounds: profile.rounds || 10, categories: DEFAULT_CATEGORIES },
      players: {
        [user.uid]: { id: user.uid, name: profile.name, avatar: profile.avatar, age: profile.age, score: 0, isBot: false }
      },
      currentRound: 0,
      rounds: [],
      createdAt: Date.now()
    };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId), newRoom);
      setRoom(newRoom);
    } catch (e) { alert("Oda oluşturulamadı: " + e.message); }
  };

  const handleJoinRoom = async (roomId, profile) => {
    if (!user) return;
    if (!roomId || roomId.length !== 4) { alert("Geçersiz oda kodu!"); return; }
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) { alert("Oda bulunamadı!"); return; }
      if (snap.data().status !== 'lobby') { alert("Oyun zaten başlamış!"); return; }
      if (Object.keys(snap.data().players || {}).length >= 8) { alert("Oda dolu!"); return; }
      await updateDoc(roomRef, {
        [`players.${user.uid}`]: { id: user.uid, name: profile.name, avatar: profile.avatar, age: profile.age, score: 0, isBot: false }
      });
      setRoom({ id: roomId });
    } catch (e) { alert("Odaya katılınamadı: " + e.message); }
  };

  const handleAddBot = async () => {
    if (!user || room.hostId !== user.uid) return;
    const currentPlayers = Object.keys(room.players || {}).length;
    if (currentPlayers >= 8) { alert("Oda dolu!"); return; }
    const botId = 'bot_' + Math.random().toString(36).substring(7);
    const botNames = ["Robot Rıza", "Cyborg Cem", "AI Ayşe", "Bot Berk", "T-800 Temel", "Yapay Yaşar", "Digital Deniz"];
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.id);
    await updateDoc(roomRef, {
      [`players.${botId}`]: {
        id: botId,
        name: botNames[Math.floor(Math.random() * botNames.length)],
        avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
        age: 99, score: 0, isBot: true
      }
    });
  };

  const handleStartGame = async () => {
    if (!user || room.hostId !== user.uid) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.id);
    const durationSecs = getDynamicTime(room.players);
    const newRound = { letter: getUnusedLetter([]), durationSecs, answers: {}, scores: {} };
    await updateDoc(roomRef, { status: 'playing', currentRound: 0, rounds: [newRound] });
  };

  const handleSubmitAnswers = async (userAnswers, timeTaken) => {
    if (!user || !room) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.id);
    const currentRoundData = room.rounds[room.currentRound];

    const validationResults = await validateAnswers(userAnswers, currentRoundData.letter, room.settings.categories);
    const submission = { answers: validationResults, timeTaken: timeTaken || 1, submittedAt: Date.now() };

    try {
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const updatedRounds = [...data.rounds];
      updatedRounds[data.currentRound] = { ...updatedRounds[data.currentRound] };
      updatedRounds[data.currentRound].answers = { ...(updatedRounds[data.currentRound].answers || {}) };
      updatedRounds[data.currentRound].answers[user.uid] = submission;

      // Host botları için cevap üret
      if (data.hostId === user.uid) {
        const bots = Object.values(data.players).filter(p => p.isBot);
        for (const bot of bots) {
          if (!updatedRounds[data.currentRound].answers[bot.id]) {
            updatedRounds[data.currentRound].answers[bot.id] = generateBotSubmission(
              data.rounds[data.currentRound].letter,
              data.settings.categories
            );
          }
        }
      }

      // Herkes cevapladı mı?
      const playerIds = Object.keys(data.players);
      const submittedIds = Object.keys(updatedRounds[data.currentRound].answers);
      const allSubmitted = playerIds.every(id => submittedIds.includes(id));

      if (allSubmitted) {
        const calculatedScores = calculateRoundScores(
          updatedRounds[data.currentRound].answers,
          data.settings.categories
        );
        updatedRounds[data.currentRound].scores = calculatedScores;

        const updatedPlayers = { ...data.players };
        for (const [pid, sData] of Object.entries(calculatedScores)) {
          if (updatedPlayers[pid]) {
            updatedPlayers[pid] = { ...updatedPlayers[pid], score: (updatedPlayers[pid].score || 0) + sData.points };
          }
        }
        await updateDoc(roomRef, { rounds: updatedRounds, status: 'results', players: updatedPlayers });
      } else {
        await updateDoc(roomRef, { rounds: updatedRounds });
      }
    } catch (e) { console.error("Submit error:", e); }
  };

  const handleNextRound = async () => {
    if (!user || room.hostId !== user.uid) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.id);
    const isLastRound = room.currentRound + 1 >= room.settings.rounds;

    if (isLastRound) {
      // Liderlik tablosunu güncelle
      try {
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
          const data = snap.data();
          const updates = Object.values(data.players)
            .filter(p => !p.isBot)
            .map(async p => {
              const lbRef = doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', p.id);
              const lbSnap = await getDoc(lbRef);
              const prevTotal = lbSnap.exists() ? (lbSnap.data().totalScore || 0) : 0;
              return setDoc(lbRef, {
                id: p.id,
                name: p.name,
                avatar: p.avatar,
                totalScore: prevTotal + (p.score || 0)
              });
            });
          await Promise.all(updates);
        }
      } catch (e) { console.error("Leaderboard Error:", e); }
      await updateDoc(roomRef, { status: 'finished' });
    } else {
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const usedLetters = data.rounds.map(r => r.letter);
      const durationSecs = getDynamicTime(data.players);
      const newRound = { letter: getUnusedLetter(usedLetters), durationSecs, answers: {}, scores: {} };
      await updateDoc(roomRef, {
        status: 'playing',
        currentRound: data.currentRound + 1,
        rounds: [...data.rounds, newRound]
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <RefreshCw className="w-16 h-16 animate-spin text-cyan-500 mb-4"/>
        <p className="text-slate-400 font-bold">Yükleniyor...</p>
      </div>
    );
  }

  if (showLeaderboard && !room) {
    return (
      <>
        <TopBar isMuted={isMuted} toggleMute={toggleMute}/>
        <LeaderboardScreen onBack={() => setShowLeaderboard(false)}/>
      </>
    );
  }

  return (
    <>
      <TopBar isMuted={isMuted} toggleMute={toggleMute}/>
      {!room && <SetupScreen onJoin={handleJoinRoom} onCreate={handleCreateRoom} onShowLeaderboard={() => setShowLeaderboard(true)}/>}
      {room?.status === 'lobby' && <LobbyScreen room={room} user={user} onStartGame={handleStartGame} onLeave={() => setRoom(null)} onAddBot={handleAddBot}/>}
      {room?.status === 'playing' && <GameScreen room={room} user={user} onSubmitAnswers={handleSubmitAnswers}/>}
      {room?.status === 'results' && <RoundResultsScreen room={room} user={user} onNextRound={handleNextRound}/>}
      {room?.status === 'finished' && <FinalScoreScreen room={room} user={user}/>}
    </>
  );
}
