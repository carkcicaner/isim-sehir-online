import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Play, Users, Plus, LogIn, Crown, Clock, 
  Trophy, ArrowRight, CheckCircle, XCircle, 
  Share2, RefreshCw, Star, Zap, User, Sparkles, Bot, Volume2, VolumeX, Globe, ArrowDown
} from 'lucide-react';
import { 
  initializeApp 
} from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, getDocs
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
const ALPHABET = "ABCÇDEFGHIİJKLMNOÖPRSŞTUÜVYZ".split("");
const DEFAULT_CATEGORIES = ["İsim", "Şehir", "Hayvan", "Bitki", "Eşya", "Sanatçı"];

const AVATARS = [
  "👽", "🤖", "🦊", "🦖", "🦄", "🐼", "🐸", "🐱", "🐶", "🦁", "🐯", "🐰", "👻", "💩", "😎", "🤠", "🍓", "🍄", "🔥", "⚡"
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
      playTone(523.25, 'sine', 0.2, 0.15);
      setTimeout(() => playTone(659.25, 'sine', 0.3, 0.15), 100);
      break;
    case 'win':
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, i) => {
        setTimeout(() => playTone(f, 'square', 0.4, 0.1), i * 120);
      });
      break;
    case 'error':
      playTone(150, 'sawtooth', 0.3, 0.1);
      break;
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

const getUnusedLetter = (usedLetters = []) => {
  const available = ALPHABET.filter(l => !usedLetters.includes(l));
  if (available.length === 0) return ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; 
  return available[Math.floor(Math.random() * available.length)];
};

// ==========================================
// DEVASA OYUN SÖZLÜĞÜ (KUSURSUZ & KAPSAMLI)
// ==========================================
const GAME_DICTIONARY = {
  'İsim': [
    'Abbas', 'Abdi', 'Abdullah', 'Abdurrahman', 'Acar', 'Acun', 'Açelya', 'Adem', 'Adil', 'Adile', 'Adnan', 'Afet', 'Affan', 'Afife', 'Afşin', 'Agah', 'Ahmet', 'Ahu', 'Ajda', 'Akasya', 'Akay', 'Akın', 'Akif', 'Aksel', 'Aktuğ', 'Alaattin', 'Alara', 'Alçin', 'Aleda', 'Alev', 'Aleyna', 'Ali', 'Alican', 'Alihan', 'Alim', 'Alişan', 'Aliye', 'Almira', 'Alp', 'Alparslan', 'Alpay', 'Alper', 'Alperen', 'Altan', 'Altay', 'Altuğ', 'Amine', 'Amir', 'Anıl', 'Aras', 'Arda', 'Arel', 'Arif', 'Arife', 'Armağan', 'Armin', 'Arslan', 'Artun', 'Arzu', 'Asaf', 'Asena', 'Asım', 'Asil', 'Asiye', 'Aslı', 'Aslıhan', 'Asu', 'Asuman', 'Asya', 'Aşkın', 'Ata', 'Ataberk', 'Atagün', 'Atahan', 'Atakan', 'Atalay', 'Ataol', 'Atay', 'Ateş', 'Atıf', 'Atıl', 'Atılgan', 'Atilla', 'Avni', 'Ayaz', 'Aybar', 'Ayberk', 'Aybike', 'Aybüke', 'Ayca', 'Aycan', 'Ayça', 'Aydan', 'Aydın', 'Aydoğan', 'Ayfer', 'Aygül', 'Aygün', 'Ayhan', 'Aykut', 'Ayla', 'Aylin', 'Aynur', 'Ayperi', 'Aysan', 'Aysel', 'Aysu', 'Aysun', 'Ayşe', 'Ayşegül', 'Ayşen', 'Ayşenur', 'Aytekin', 'Ayten', 'Aytuğ', 'Aytunç', 'Azat', 'Azer', 'Aziz', 'Azize', 'Azmi', 'Azra',
    'Babür', 'Baha', 'Bahadır', 'Bahattin', 'Bahar', 'Bahri', 'Bahriye', 'Bahtiyar', 'Baki', 'Banu', 'Baran', 'Baray', 'Barbaros', 'Barın', 'Barış', 'Barkan', 'Barlas', 'Bartu', 'Basri', 'Başak', 'Başar', 'Batıkan', 'Batu', 'Batuhan', 'Batur', 'Baturay', 'Baykal', 'Bayram', 'Bedia', 'Bedir', 'Bedirhan', 'Bedri', 'Bedriye', 'Begüm', 'Behçet', 'Behiç', 'Behiye', 'Behlül', 'Behzat', 'Bekir', 'Belgin', 'Belkıs', 'Belma', 'Benan', 'Bengi', 'Bengisu', 'Bengü', 'Bennu', 'Berat', 'Beren', 'Berfin', 'Berfu', 'Beril', 'Berk', 'Berkan', 'Berkant', 'Berkay', 'Berke', 'Berkin', 'Berna', 'Berrak', 'Berrin', 'Besim', 'Beste', 'Beşir', 'Betül', 'Beyhan', 'Beyza', 'Bilal', 'Bilge', 'Bilgehan', 'Bilgen', 'Bilgütay', 'Billur', 'Binnaz', 'Binnur', 'Bircan', 'Birce', 'Birgül', 'Birol', 'Birsen', 'Bora', 'Boran', 'Bozkurt', 'Böğrü', 'Buğra', 'Buğrahan', 'Buket', 'Bulut', 'Bumin', 'Burak', 'Burcu', 'Burçin', 'Burhan', 'Burhanettin', 'Buse', 'Bülent', 'Bünyamin', 'Büşra',
    'Cabir', 'Cahit', 'Can', 'Canan', 'Cana', 'Canberk', 'Candan', 'Caner', 'Cankut', 'Cansu', 'Cansel', 'Cavit', 'Cavidan', 'Celal', 'Celalettin', 'Celasun', 'Celil', 'Cem', 'Cemal', 'Cemalettin', 'Cemil', 'Cemile', 'Cemre', 'Cenap', 'Cengiz', 'Cengizhan', 'Cenk', 'Ceren', 'Cevahir', 'Cevat', 'Cevdet', 'Ceyda', 'Ceyhun', 'Ceylan', 'Ceylin', 'Cihan', 'Cihangir', 'Cihat', 'Civan', 'Coşkun', 'Cuma', 'Cumali', 'Cumbul', 'Cüneyt',
    'Çağatay', 'Çağdaş', 'Çağla', 'Çağlar', 'Çağrı', 'Çakır', 'Çapan', 'Çelebi', 'Çelik', 'Çetin', 'Çevik', 'Çıdam', 'Çınar', 'Çiğdem', 'Çilem', 'Çise', 'Çisem', 'Çisil', 'Çolpan', 'Çöteli',
    'Dağhan', 'Daha', 'Dahi', 'Dalan', 'Damla', 'Daniş', 'Dara', 'Davut', 'Defne', 'Değer', 'Deha', 'Demet', 'Demir', 'Demirhan', 'Deniz', 'Derin', 'Derman', 'Derya', 'Destan', 'Deste', 'Devran', 'Devrim', 'Dicle', 'Didem', 'Dila', 'Dilan', 'Dilara', 'Dilay', 'Dilek', 'Dilhan', 'Diler', 'Dilsaz', 'Dinç', 'Dinçer', 'Diren', 'Direnç', 'Doğa', 'Doğan', 'Doğanay', 'Doğu', 'Doğukan', 'Doğuş', 'Dora', 'Doruk', 'Dorukhan', 'Döndü', 'Döne', 'Duhan', 'Dursun', 'Durdu', 'Durmuş', 'Duygu', 'Dünya', 'Dürdane', 'Düş',
    'Ebru', 'Ebubekir', 'Ece', 'Ecem', 'Ecemnur', 'Ecenaz', 'Eda', 'Edanur', 'Edhem', 'Edip', 'Efe', 'Efecan', 'Efehan', 'Efekan', 'Efsun', 'Ege', 'Egemen', 'Ejder', 'Ekrem', 'Ela', 'Elanur', 'Elçin', 'Elif', 'Elmas', 'Elvan', 'Emel', 'Emin', 'Emine', 'Emir', 'Emircan', 'Emirhan', 'Emrah', 'Emre', 'Emrullah', 'Ender', 'Enes', 'Engin', 'Enis', 'Ensar', 'Enver', 'Eralp', 'Eray', 'Erbatur', 'Erbil', 'Ercan', 'Ercüment', 'Erciyes', 'Erdal', 'Erdem', 'Erden', 'Erdi', 'Erdinç', 'Eren', 'Erenay', 'Ergin', 'Ergun', 'Ergüder', 'Ergül', 'Ergün', 'Erhan', 'Erim', 'Erimşah', 'Eriş', 'Erkan', 'Erkin', 'Erman', 'Erol', 'Erşan', 'Ersin', 'Ertan', 'Ertuğrul', 'Esad', 'Esat', 'Esen', 'Eser', 'Esin', 'Esma', 'Esmanur', 'Esra', 'Eşref', 'Etem', 'Ethem', 'Evindar', 'Evren', 'Evrim', 'Eylem', 'Eylül', 'Eyüp', 'Ezgi',
    'Fadime', 'Fahir', 'Fahrettin', 'Fahri', 'Fahriye', 'Faik', 'Fakir', 'Faruk', 'Fatih', 'Fatma', 'Fatmanur', 'Fatoş', 'Fazıl', 'Fazilet', 'Fehmi', 'Felek', 'Feramuz', 'Feray', 'Ferda', 'Ferdi', 'Ferhan', 'Ferhat', 'Ferhunde', 'Feridun', 'Feriha', 'Ferit', 'Ferruh', 'Fethiye', 'Fevzi', 'Fevziye', 'Feyyaz', 'Feyza', 'Feza', 'Fidan', 'Figen', 'Fikret', 'Fikri', 'Fikriye', 'Filiz', 'Firdevs', 'Fuat', 'Fulden', 'Fulya', 'Funda', 'Furkan',
    'Gaffar', 'Gaffur', 'Galip', 'Gamze', 'Gani', 'Garip', 'Gaye', 'Gazanfer', 'Gazi', 'Gediz', 'Gencer', 'Genco', 'Gevher', 'Geylani', 'Gıyasettin', 'Giray', 'Gizem', 'Gonca', 'Gökberk', 'Gökcan', 'Gökçe', 'Gökçen', 'Gökhan', 'Göksel', 'Göksu', 'Göktuğ', 'Gönenç', 'Gönül', 'Görkem', 'Gözde', 'Gül', 'Gülay', 'Gülbahar', 'Gülben', 'Gülcan', 'Gülce', 'Gülçin', 'Gülden', 'Güleser', 'Gülfem', 'Gülhan', 'Gülhanım', 'Gülizar', 'Güllü', 'Gülnaz', 'Gülnihal', 'Gülnur', 'Gülşah', 'Gülşen', 'Gülten', 'Gün', 'Günal', 'Günay', 'Günden', 'Gündüz', 'Güneş', 'Güney', 'Günhan', 'Günnur', 'Güray', 'Gürbüz', 'Gürcan', 'Gürkan', 'Gürol', 'Gürsel', 'Güven', 'Güvenç', 'Güzide', 'Güzin',
    'Habib', 'Habibe', 'Habil', 'Hacer', 'Hafize', 'Hafsa', 'Hakan', 'Hakkı', 'Haldun', 'Hale', 'Halid', 'Halil', 'Halim', 'Halime', 'Halis', 'Halit', 'Haluk', 'Hamdi', 'Hamdiye', 'Hami', 'Hamit', 'Hamza', 'Handan', 'Hande', 'Hanife', 'Harun', 'Hasan', 'Hasibe', 'Hasret', 'Haşmet', 'Hatice', 'Hatem', 'Hayati', 'Haydar', 'Hayrettin', 'Hayri', 'Hayriye', 'Hayrünnisa', 'Hazal', 'Hazar', 'Hazım', 'Hediye', 'Hıdır', 'Hıfzı', 'Hicran', 'Hidayet', 'Hikmet', 'Hilal', 'Hilmi', 'Hilmiye', 'Himmet', 'Hira', 'Hiranur', 'Hulki', 'Hulusi', 'Huri', 'Huriye', 'Hurşit', 'Hülya', 'Hüma', 'Hümeyra', 'Hür', 'Hürkan', 'Hürrem', 'Hürriyet', 'Hüsamettin', 'Hüseyin', 'Hüsnü', 'Hüsniye', 'Hüsran',
    'Ilgaz', 'Ilgın', 'Irak', 'Irmak', 'Işık', 'Işıl', 'Işılay', 'Işıltı', 'Işıtan', 'Itır', 'Itri',
    'İbrahim', 'İclal', 'İçim', 'İdil', 'İdris', 'İffet', 'İhsan', 'İkbal', 'İlayda', 'İlber', 'İlbey', 'İlhami', 'İlhan', 'İlkay', 'İlke', 'İlker', 'İlkim', 'İlknur', 'İlkyaz', 'İlyas', 'İmdat', 'İnanç', 'İnci', 'İncilay', 'İpek', 'İrem', 'İrfan', 'İsa', 'İshak', 'İskender', 'İslam', 'İsmail', 'İsmet', 'İstem', 'İstemi', 'İsrafil', 'İşcan', 'İzel', 'İzzet', 'İzzettin',
    'Jale', 'Janset', 'Jeyan', 'Jir', 'Jülide',
    'Kaan', 'Kabel', 'Kader', 'Kadife', 'Kadir', 'Kadri', 'Kadriye', 'Kağan', 'Kahraman', 'Kamber', 'Kamil', 'Kamile', 'Kamuran', 'Kansu', 'Kaplan', 'Karaca', 'Karahan', 'Kardelen', 'Karmen', 'Kasım', 'Kaya', 'Kayahan', 'Kayıhan', 'Kazım', 'Kelami', 'Kemal', 'Kemalettin', 'Kenan', 'Kerem', 'Kerim', 'Keriman', 'Kezban', 'Kılıç', 'Kıvanç', 'Kıvılcım', 'Kıymet', 'Kibariye', 'Kiper', 'Koray', 'Korel', 'Korhan', 'Korkut', 'Kudret', 'Kumru', 'Kuntay', 'Kurtuluş', 'Kutay', 'Kutlay', 'Kutlu', 'Kutsal', 'Kutsi', 'Kuzey', 'Kübra', 'Kürşad', 'Kürşat',
    'Laçin', 'Lale', 'Lami', 'Lamia', 'Lara', 'Latif', 'Latife', 'Leda', 'Leman', 'Lemide', 'Lerzan', 'Levent', 'Leyla', 'Lidya', 'Lila', 'Linet', 'Lokman', 'Lütfi', 'Lütfiye', 'Lütfü',
    'Macit', 'Mahir', 'Mahmut', 'Mahsun', 'Mahur', 'Makbule', 'Manolya', 'Mansur', 'Mazhar', 'Mecit', 'Medine', 'Mefa', 'Mehir', 'Mehmet', 'Mehtap', 'Mekin', 'Melda', 'Melek', 'Melih', 'Meliha', 'Melik', 'Melike', 'Melis', 'Melisa', 'Melodi', 'Meltem', 'Memduh', 'Menderes', 'Menduh', 'Mengü', 'Meral', 'Meriç', 'Meriçhan', 'Merih', 'Mert', 'Mertcan', 'Merve', 'Meryem', 'Mesut', 'Mete', 'Metehan', 'Metin', 'Mevlüt', 'Meyra', 'Mısra', 'Mihriban', 'Mina', 'Mine', 'Mira', 'Miraç', 'Miran', 'Miray', 'Mirkelam', 'Mirza', 'Misak', 'Mithat', 'Mualla', 'Muammer', 'Mucize', 'Muhammed', 'Muhammet', 'Muharrem', 'Muhittin', 'Muhsin', 'Muhterem', 'Mukadder', 'Mukaddes', 'Murat', 'Musa', 'Mustafa', 'Mutlu', 'Muzaffer', 'Mücella', 'Mücahit', 'Müesser', 'Müfit', 'Müge', 'Müjdat', 'Müjde', 'Mükerrem', 'Mükremin', 'Mülayim', 'Mümin', 'Mümine', 'Mümtaz', 'Münerver', 'Münir', 'Münire', 'Müslüm', 'Müşerref', 'Müşfik', 'Müzeyyen',
    'Naci', 'Naciye', 'Nadir', 'Nadire', 'Nafiz', 'Nagehan', 'Nahit', 'Nail', 'Naile', 'Naim', 'Naime', 'Nalan', 'Nalın', 'Namık', 'Narin', 'Nasihat', 'Nasip', 'Nasrettin', 'Nazan', 'Nazım', 'Nazif', 'Nazife', 'Nazlı', 'Nazmi', 'Nazmiye', 'Nebi', 'Nebahat', 'Nebil', 'Nebile', 'Necati', 'Necla', 'Necmettin', 'Necmi', 'Necmiye', 'Nedim', 'Nedime', 'Nehir', 'Nejat', 'Nejla', 'Nergis', 'Nermin', 'Nesim', 'Nesimi', 'Neslihan', 'Nesrin', 'Neşe', 'Neşet', 'Neval', 'Nevin', 'Nevzat', 'Nezahat', 'Nezih', 'Nezihe', 'Nida', 'Nigar', 'Nihal', 'Nihan', 'Nihat', 'Nil', 'Nilay', 'Nilgün', 'Nilüfer', 'Nimet', 'Nisa', 'Nisan', 'Nisanur', 'Niyazi', 'Nizamettin', 'Noyan', 'Numan', 'Nur', 'Nural', 'Nuran', 'Nuray', 'Nurcan', 'Nurdan', 'Nurgül', 'Nurhan', 'Nuri', 'Nuriye', 'Nursel', 'Nursen', 'Nurten', 'Nurullah', 'Nusret',
    'Oğuz', 'Oğuzhan', 'Okan', 'Okay', 'Oktay', 'Okşan', 'Okyanus', 'Olcay', 'Olgay', 'Olgun', 'Omay', 'Ömür', 'Onur', 'Oray', 'Orçun', 'Orhan', 'Orkun', 'Osman', 'Oya', 'Oytun', 'Ozan',
    'Öcal', 'Ödemiş', 'Öge', 'Ögeday', 'Ökkeş', 'Ömer', 'Ömür', 'Önder', 'Öner', 'Övünç', 'Öykü', 'Özay', 'Özbey', 'Özbil', 'Özcan', 'Özden', 'Özdil', 'Özer', 'Özge', 'Özgen', 'Özgül', 'Özgür', 'Özhan', 'Özkan', 'Özlem', 'Özlen', 'Özüm',
    'Pakize', 'Pamir', 'Pars', 'Paşa', 'Pekcan', 'Peker', 'Pelin', 'Pelinsu', 'Pembe', 'Perihan', 'Perran', 'Pervin', 'Petek', 'Pınar', 'Piraye', 'Polat', 'Poyraz', 'Püren', 'Pürtelaş',
    'Rabia', 'Raci', 'Rafi', 'Rafet', 'Ragıp', 'Rahim', 'Rahime', 'Rahmi', 'Rahmiye', 'Rahşan', 'Raif', 'Rakım', 'Ramazan', 'Ramiz', 'Rasim', 'Raşit', 'Rauf', 'Rebia', 'Recep', 'Recai', 'Refik', 'Refika', 'Reha', 'Remzi', 'Remziye', 'Renan', 'Rengin', 'Resul', 'Reşat', 'Reşit', 'Reyhan', 'Rezan', 'Rıdvan', 'Rıfat', 'Rıfkı', 'Rıza', 'Rojin', 'Roza', 'Ruhi', 'Ruhan', 'Ruken', 'Ruşen', 'Rüstem', 'Rüştü', 'Rüya', 'Rüzgar',
    'Saadet', 'Sabahattin', 'Saban', 'Sabri', 'Sabriye', 'Sacit', 'Sacide', 'Sadettin', 'Sadık', 'Sadri', 'Sadullah', 'Safa', 'Saffet', 'Sait', 'Sakıp', 'Salih', 'Saliha', 'Salim', 'Salime', 'Sami', 'Samiye', 'Samet', 'Sanberk', 'Sancak', 'Saniye', 'Sarp', 'Sarper', 'Savaş', 'Sayan', 'Saygın', 'Seçil', 'Seçkin', 'Seda', 'Sedat', 'Sefa', 'Sefer', 'Seher', 'Selahattin', 'Selami', 'Selçuk', 'Selda', 'Selen', 'Selin', 'Selinay', 'Selim', 'Selime', 'Selma', 'Selman', 'Selmin', 'Semih', 'Serap', 'Serdal', 'Serdar', 'Seren', 'Serenay', 'Serhat', 'Serkan', 'Sermet', 'Serpil', 'Sertaç', 'Servet', 'Sevda', 'Sevgi', 'Sevil', 'Sevilay', 'Sevim', 'Sevinç', 'Seyfi', 'Seyfettin', 'Seyhan', 'Seyit', 'Sezai', 'Sezgin', 'Sezin', 'Sıla', 'Sıtkı', 'Sırma', 'Sibel', 'Simge', 'Sinan', 'Sinem', 'Soner', 'Songül', 'Su', 'Suat', 'Sude', 'Sudi', 'Sultan', 'Suna', 'Sunay', 'Suriye', 'Suphi', 'Süleyman', 'Sümbül', 'Sümer', 'Sümeyra', 'Sümeyye', 'Süreyya',
    'Şaban', 'Şadi', 'Şadiye', 'Şafak', 'Şahap', 'Şahin', 'Şahika', 'Şamil', 'Şaziye', 'Şebnem', 'Şecaattin', 'Şefik', 'Şefika', 'Şehrazat', 'Şehriban', 'Şelale', 'Şemsettin', 'Şemsi', 'Şenol', 'Şenay', 'Şengül', 'Şennur', 'Şeref', 'Şerif', 'Şerife', 'Şermin', 'Şevket', 'Şevki', 'Şevval', 'Şeyda', 'Şeyma', 'Şiar', 'Şinasi', 'Şiir', 'Şimal', 'Şirin', 'Şiyar', 'Şükran', 'Şükrü', 'Şükriye', 'Şule',
    'Taceddin', 'Taci', 'Taha', 'Tahir', 'Tahsin', 'Talat', 'Talha', 'Talu', 'Tamer', 'Tan', 'Taner', 'Tanju', 'Tansel', 'Tansu', 'Tarık', 'Tarkan', 'Taşkın', 'Tayfun', 'Tayfur', 'Taylan', 'Tayyar', 'Tayyip', 'Tebessüm', 'Tecer', 'Tekin', 'Teksen', 'Temel', 'Teoman', 'Tercan', 'Terim', 'Teslime', 'Tevfik', 'Tezcan', 'Tezel', 'Tınaz', 'Timur', 'Timuçin', 'Toker', 'Tolga', 'Tolgahan', 'Tolunay', 'Toprak', 'Toygar', 'Tuba', 'Tufan', 'Tugay', 'Tuğba', 'Tuğberk', 'Tuğçe', 'Tuğkan', 'Tuğra', 'Tuğrul', 'Tuğsan', 'Tuna', 'Tunahan', 'Tuncay', 'Tuncer', 'Tunç', 'Turan', 'Turgay', 'Turgut', 'Turhan', 'Tülay', 'Tülin', 'Türkan', 'Türker', 'Türkeş',
    'Ufuk', 'Uğur', 'Uğurcan', 'Ulaş', 'Uluç', 'Ulvi', 'Ulviye', 'Umur', 'Umurbey', 'Umut', 'Umutcan', 'Unsur', 'Ural', 'Uraz', 'Utku', 'Uygar', 'Uyar', 'Uysal', 'Uzay',
    'Ülgen', 'Ülker', 'Ülkü', 'Ümmet', 'Ümit', 'Ümmiye', 'Ümran', 'Ünal', 'Ünlem', 'Ünsal', 'Ünzile', 'Üstün', 'Üzeyir',
    'Vacip', 'Vahap', 'Vahdet', 'Vahide', 'Vahit', 'Vakkas', 'Valid', 'Valide', 'Varol', 'Vasfi', 'Vasfiye', 'Vatan', 'Veda', 'Vedat', 'Vefa', 'Vefik', 'Vehbi', 'Veli', 'Vera', 'Verda', 'Veysel', 'Veysi', 'Vicdan', 'Vildan', 'Volkan', 'Vural', 'Vuslat',
    'Yağız', 'Yağmur', 'Yahya', 'Yakut', 'Yakup', 'Yalçın', 'Yalgın', 'Yalın', 'Yalvaç', 'Yaman', 'Yamaç', 'Yankı', 'Yarkın', 'Yasin', 'Yasemin', 'Yaşar', 'Yavuz', 'Yekta', 'Yelda', 'Yeliz', 'Yener', 'Yılmaz', 'Yiğit', 'Yiğithan', 'Yıldırım', 'Yıldız', 'Yonca', 'Yosun', 'Yurdagül', 'Yurdanur', 'Yusuf', 'Yücel', 'Yüksel', 'Yümni', 'Yümniye',
    'Zabit', 'Zafer', 'Zahir', 'Zahit', 'Zahide', 'Zakir', 'Zaman', 'Zambak', 'Zarife', 'Zehra', 'Zeki', 'Zekiye', 'Zeliha', 'Zerrin', 'Zeycan', 'Zeynep', 'Zeynel', 'Ziya', 'Ziyafet', 'Ziyaret', 'Zübeyde', 'Zühal', 'Zülal', 'Züleyha', 'Zülfikar', 'Zülfü', 'Zümrüt'
  ],
  'Şehir': [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
  ],
  'Hayvan': [
    'Ahtapot', 'Ağaçkakan', 'Akrep', 'Akbaba', 'Ala Geyik', 'Alpaka', 'Anakonda', 'Antilop', 'Arı', 'Aslan', 'At', 'Ayı', 'Aygır', 'Armadillo', 'Alabalık', 'Atmaca', 'Ateşböceği', 'Albatros', 'Ağustos Böceği', 'Anaconda', 'Angut', 'Arıkuşu',
    'Babun', 'Balina', 'Balık', 'Bukalemun', 'Bülbül', 'Böcek', 'Boğa', 'Baykuş', 'Bizon', 'Boa', 'Bıldırcın', 'Böğü', 'Boğa Yılanı', 'Bit', 'Bokböceği', 'Bozayı', 'Barbun', 'Balerin Balığı',
    'Ceylan', 'Cırcır Böceği', 'Cennet Kuşu', 'Civciv', 'Cennet Papağanı', 'Camgöz', 'Cennetbalığı', 'Cırcır',
    'Çakal', 'Çıngıraklı Yılan', 'Çekirge', 'Çita', 'Çulluk', 'Çamurcun', 'Çaylak', 'Çipura', 'Çaprazgaga', 'Çizgili Sincap',
    'Dana', 'Deve', 'Devekuşu', 'Denizanası', 'Denizatı', 'Dinozor', 'Domuz', 'Dodo', 'Doğan', 'Deniz Aslanı', 'Deniz İneği', 'Deniz Kaplumbağası', 'Deniz Yıldızı', 'Dülger Balığı', 'Dingo', 'Dağ Keçisi', 'Dikenli Karıncayiyen',
    'Eşek', 'Engerek', 'Eşek Arısı', 'Etiyopya Kurdu', 'Emu', 'Eğrelti Böceği', 'Ejderha',
    'Fanus Balığı', 'Fare', 'Fil', 'Flamingo', 'Fok', 'Fırkateyn Kuşu', 'Fındık Faresi',
    'Gelincik', 'Gergedan', 'Geyik', 'Goril', 'Göçmen Kuş', 'Güvercin', 'Guguk Kuşu', 'Gümüş Balığı', 'Geyik Böceği', 'Gökdoğan', 'Gül Kurbağası', 'Guanako', 'Ginepig', 'Güneşkuşu',
    'Hamamböceği', 'Hamsi', 'Hindi', 'Hipopotam', 'Horoz', 'Hörgüçlü Deve', 'Hani Balığı', 'Himalaya Kurdu', 'Hamster', 'Habeş Maymunu', 'Halkalı Solucan',
    'Iguana', 'Istakoz', 'İnek', 'İguana', 'İpekböceği', 'İstavrit', 'İstiridye', 'İmpala', 'İspinoz', 'İskorpit', 'İbibik', 'İncik',
    'Jaguar', 'Jako Papağanı', 'Japon Balığı', 'Jelatin Balığı', 'Jaguag', 'Jalapeno Börtüsü',
    'Kaplan', 'Kangal', 'Kanarya', 'Kaplumbağa', 'Karınca', 'Karga', 'Kartal', 'Katır', 'Kaz', 'Kedi', 'Kelebek', 'Kertenkele', 'Kırlangıç', 'Kirpi', 'Koala', 'Kobra', 'Koç', 'Koyun', 'Köpek', 'Köpekbalığı', 'Köstebek', 'Kurbağa', 'Kurt', 'Kuş', 'Kuzgun', 'Kuzu', 'Kirpi Balığı', 'Kalkan Balığı', 'Karabatak', 'Karagöz', 'Kunduz', 'Karakulak', 'Karıncayiyen', 'Kılıçbalığı', 'Kırlangıçbalığı', 'Kızılcık', 'Kokarca', 'Kudu', 'Kuğu',
    'Lama', 'Leopar', 'Leylek', 'Levrek', 'Lüfer', 'Lepistes', 'Lemur', 'Loris', 'Lir Kuşu', 'Lagos',
    'Manda', 'Martı', 'Maymun', 'Mezgit', 'Midilli', 'Midye', 'Mors', 'Mürekkepbalığı', 'Mırmır', 'Mersin Balığı', 'Mamut', 'Makağı', 'Mavi Balina', 'Mercan', 'Mersin', 'Mirket', 'Müren',
    'Nandu', 'Narval', 'Nehir Yunusu', 'Neon Balığı', 'Nematod',
    'Oğlak', 'Okapi', 'Orangutan', 'Orkinos', 'Ornitorenk', 'Oryx', 'Ocelot', 'Oklu Kirpi', 'Okyanus Güneşi Balığı',
    'Ördek', 'Örümcek', 'Öküz', 'Ötleğen', 'Örümcek Maymunu', 'Ökse Kuşu',
    'Palamut', 'Panda', 'Panter', 'Papağan', 'Pelikan', 'Penguen', 'Piton', 'Puma', 'Porsuk', 'Pire', 'Pisi Balığı', 'Puhu', 'Pars', 'Pangolin', 'Pırpır',
    'Rakun', 'Ren Geyiği', 'Ringa Balığı', 'Rhesus Maymunu',
    'Salyangoz', 'Saka', 'Samur', 'Sardalya', 'Sazan', 'Serçe', 'Sığır', 'Sincap', 'Sinekkapan', 'Solucan', 'Sırtlan', 'Sinek', 'Sivrisinek', 'Somon', 'Su Aygırı', 'Sülük', 'Sülün', 'Sünger', 'Sarı Asma', 'Sibirya Kurdu', 'Su Yılanı',
    'Şahin', 'Şempanze', 'Şeritli Yılan', 'Şinşilla', 'Şebek',
    'Tahtakurusu', 'Tarantula', 'Tavşan', 'Tavuk', 'Tavuskuşu', 'Tay', 'Timsah', 'Tırtıl', 'Tilki', 'Turna', 'Tembel Hayvan', 'Teke', 'Tapir', 'Tirsi', 'Tuygun', 'Tasmanian Canavarı', 'Tırtak', 'Turna Balığı',
    'Uskumru', 'Uğurböceği', 'Ustura Balığı', 'Uçan Balık', 'Uçan Sincap', 'Uçan Fare',
    'Üveyik', 'Üsküf', 'Üzengi Balığı',
    'Vatoz', 'Vaşak', 'Vizon', 'Vampir Yarasa', 'Varan', 'Vombat', 'Vicuña',
    'Yaban Domuzu', 'Yarasa', 'Yılan', 'Yunus', 'Yusufçuk', 'Yengeç', 'Yediuyur', 'Yaban Keçisi', 'Yılan Balığı', 'Yalıçapkını', 'Yaprak Böceği', 'Yassı Solucan',
    'Zebra', 'Zargana', 'Zürafa', 'Zebu', 'Zehirli Ok Kurbağası', 'Zarkan', 'Zar Kanatlı', 'Zıpzıp'
  ],
  'Bitki': [
    'Abanoz', 'Acur', 'Açelya', 'Ahududu', 'Ağaç', 'Akasya', 'Akçaağaç', 'Ananas', 'Anason', 'Andız', 'Antepfıstığı', 'Ardıç', 'Armut', 'Arpa', 'Asma', 'Aspir', 'Ayçiçeği', 'Ayva', 'Ay Çiçeği', 'Altınotu', 'Adaçayı', 'Avokado', 'Ayıkulağı', 'Acıbakla', 'Ayrıkotu', 'Ateşdikeni', 'At Kestanesi',
    'Badem', 'Bakla', 'Bambu', 'Bamya', 'Barbunya', 'Begonya', 'Bezelye', 'Biber', 'Biberiye', 'Böğürtlen', 'Brokoli', 'Buğday', 'Burçak', 'Boyboy', 'Baldıran', 'Balsıra', 'Bambulotu', 'Bodur Ağaç',
    'Ceviz', 'Cibes', 'Cıvınotu', 'Civanperçemi', 'Cennet Kuşu Çiçeği', 'Cezayir Menekşesi', 'Ceviz Ağacı',
    'Çalı', 'Çam', 'Çavdar', 'Çay', 'Çınar', 'Çiçek', 'Çiğdem', 'Çilek', 'Çimen', 'Çörekotu', 'Çuha Çiçeği', 'Çam Ağacı', 'Çoban Çantası', 'Çitlembik', 'Çavşır', 'Çivit', 'Çuha',
    'Defne', 'Dereotu', 'Domates', 'Dut', 'Dulavratotu', 'Deniz Kadayıfı', 'Diken', 'Dut Ağacı', 'Düğünçiçeği', 'Devedikeni', 'Dar Yapraklı', 'Damkoruğu',
    'Ebegümeci', 'Eğreltiotu', 'Elma', 'Enginar', 'Erik', 'Ekin', 'Eşek Dikeni', 'Eğrelti', 'Engerek Otu', 'Eşek Marulu',
    'Fasulye', 'Fesleğen', 'Fındık', 'Fıstık', 'Funda', 'Frenk İnciri', 'Fındık Ağacı', 'Fıstık Çamı', 'Frezya', 'Fırıldak Çiçeği',
    'Gül', 'Greyfurt', 'Glayöl', 'Gürgen', 'Gecesefası', 'Ginseng', 'Göknar', 'Gladiyöl', 'Gül Ağacı', 'Gelincik', 'Gelinparmağı',
    'Hardal', 'Haşhaş', 'Havuç', 'Hindiba', 'Hindistancevizi', 'Hurma', 'Hanımeli', 'Hasekiküpesi', 'Hodan', 'Huş Ağacı', 'Hatmi', 'Hıyar',
    'Ihlarmur', 'Ispanak', 'Ilgın', 'Itır', 'Ihlamur Ağacı', 'Ispanak Otu',
    'İğde', 'İncir', 'İğne Yapraklı', 'İnci Çiçeği', 'İrmik', 'İnci', 'İğde Ağacı', 'İğneadaotu',
    'Jalapeno', 'Jüt', 'Japon Gülü', 'Japon Şemsiyesi',
    'Kabak', 'Kahve', 'Kakao', 'Kaktüs', 'Karanfil', 'Karnabahar', 'Karpuz', 'Kavak', 'Kavun', 'Kayısı', 'Kekik', 'Kereviz', 'Kestane', 'Keten', 'Kivi', 'Krizantem', 'Kuşburnu', 'Kayın', 'Kiraz', 'Kimyon', 'Kişniş', 'Kızılcık', 'Karaağaç', 'Kamkat', 'Kantaron', 'Kanola', 'Karahindiba', 'Kadife Çiçeği', 'Karabiber',
    'Lale', 'Lavanta', 'Lahana', 'Limon', 'Leylak', 'Limonotu', 'Ladin', 'Lale Devri', 'Liken', 'Limon Ağacı',
    'Mandalina', 'Mantar', 'Manolya', 'Marul', 'Maydanoz', 'Meşe', 'Mısır', 'Muz', 'Menekşe', 'Mimoza', 'Muşmula', 'Mersin', 'Meyan', 'Mürver', 'Mabet Ağacı', 'Meşe Palamudu', 'Mine Çiçeği',
    'Nane', 'Nar', 'Nergis', 'Nohut', 'Nilüfer', 'Nane Otu', 'Nar Ağacı', 'Nergis Çiçeği',
    'Orkide', 'Ormangülü', 'Ökseotu', 'Okaliptüs', 'Oğulotu', 'Otsu', 'Osmanlı Çileği', 'Orakotu', 'Okaliptus Ağacı',
    'Ökseotu', 'Ödağacı', 'Öd Ağacı', 'Örümcek Otu',
    'Papatya', 'Pamuk', 'Pancar', 'Patates', 'Patlıcan', 'Pelin', 'Pırasa', 'Pirinç', 'Portakal', 'Pikan Cevizi', 'Pelinotu', 'Porsuk Ağacı', 'Palmiye', 'Peygamber Çiçeği',
    'Reyhan', 'Roka', 'Rezene', 'Rvent', 'Rambutan', 'Ravend',
    'Sardunya', 'Sarımsak', 'Sarmaşık', 'Saz', 'Selvi', 'Söğüt', 'Soğan', 'Soya', 'Sümbül', 'Susam', 'Sedir', 'Semizotu', 'Sumak', 'Safran', 'Sarı Papatya', 'Servi', 'Sarı Kantaron', 'Sığla', 'Siklamen',
    'Şeftali', 'Şalgam', 'Şimşir', 'Şakayık', 'Şekerpancarı', 'Şahtere Otu', 'Şerbetçiotu', 'Şeftali Ağacı',
    'Tarçın', 'Turp', 'Tütün', 'Tere', 'Turunç', 'Tarhun', 'Tirfil', 'Teber', 'Tamarillo', 'Töngel', 'Trabzon Hurması', 'Turunçgil',
    'Urmu', 'Unut Beni', 'Unutma Beni Çiçeği', 'Uçkun', 'Uyuzotu',
    'Üvez', 'Üzüm', 'Üzerlik', 'Üvez Ağacı',
    'Vişne', 'Vanilya', 'Vapur Dumanı', 'Vişne Ağacı',
    'Yabanmersini', 'Yosun', 'Yasemin', 'Yulaf', 'Yenibahar', 'Yonca', 'Yıldız Çiçeği', 'Yaban Gülü', 'Yüksükotu', 'Yer Fıstığı', 'Yer Elması',
    'Zakkum', 'Zambak', 'Zerdali', 'Zeytin', 'Zencefil', 'Zerdeçal', 'Zufa Otu', 'Zemberek', 'Zümrüt Ağacı', 'Zeytin Ağacı', 'Zembil Otu'
  ],
  'Eşya': [
    'Abajur', 'Adaptör', 'Afiş', 'Ağ', 'Akü', 'Alyans', 'Ampul', 'Anahtar', 'Anfi', 'Anten', 'Araba', 'Atkı', 'Avize', 'Ayna', 'Ayakkabı', 'Ataç', 'Alet Çantası', 'Askı', 'Ayraç', 'Ajanda', 'Ankastre', 'Aspiratör', 'Ateşölçer', 'Ambalaj', 'Ayakkabılık', 'Askılık',
    'Baca', 'Bıçak', 'Balta', 'Bant', 'Bardak', 'Baston', 'Bavul', 'Beşik', 'Bilgisayar', 'Bilezik', 'Biberon', 'Boru', 'Buzdolabı', 'Buzluk', 'Battaniye', 'Bisiklet', 'Bere', 'Banyo Dolabı', 'Bileklik', 'Balon', 'Baza', 'Bilardo', 'Barkod Okuyucu', 'Bozuk Para', 'Bulaşık Makinesi', 'Büyüteç',
    'Cam', 'Ceket', 'Cep', 'Cetvel', 'Cımbız', 'Cüzdan', 'Cezve', 'Camsil', 'Cıvata', 'Ceviz Kıracağı', 'CD', 'Cevşen', 'Cam Bezi', 'Cep Telefonu', 'Çorap',
    'Çadır', 'Çakı', 'Çakmak', 'Çam', 'Çan', 'Çanak', 'Çanta', 'Çapa', 'Çarşaf', 'Çatal', 'Çaydanlık', 'Çekiç', 'Çengel', 'Çerçeve', 'Çivi', 'Çizme', 'Çuval', 'Çamaşır Makinesi', 'Çöp Kutusu', 'Çengelli İğne', 'Çekyat', 'Çanak Anten', 'Çay Bardağı', 'Çay Tabağı', 'Çöp Poşeti', 'Çöpçü', 'Çatı', 'Çapa Makinesi',
    'Daktilo', 'Dambıl', 'Dantel', 'Davul', 'Defter', 'Demir', 'Denge', 'Denizaltı', 'Deterjan', 'Dikiş', 'Direk', 'Dolap', 'Düğme', 'Dürbün', 'Düdük', 'Damlalık', 'Davlumbaz', 'Dekoder', 'Dosya', 'Dikiş Makinesi', 'Damacana', 'Delgeç', 'Deodorant', 'Diksiyon', 'Disket', 'Dizüstü Bilgisayar', 'Dolma Kalem',
    'Eldiven', 'Elbise', 'Elek', 'Emzik', 'Etek', 'Eyer', 'Elektrikli Süpürge', 'Ekmek Kızartma Makinesi', 'Ekran', 'Ekmeklik', 'El Feneri', 'Emniyet Kemeri', 'Emaye', 'Eskiz Defteri', 'Eyeliner',
    'Fare', 'Fatura', 'Fener', 'Fırça', 'Fırın', 'Fincan', 'Fiş', 'Fıçı', 'Fular', 'Fotoğraf Makinesi', 'Fermuar', 'Fritöz', 'Fosforlu Kalem', 'Fön Makinesi', 'Fanus', 'Far', 'Fırın Tepsisi', 'Filtre', 'Flash Bellek', 'Fosfor',
    'Gemi', 'Giysi', 'Gitar', 'Gözlük', 'Gömlek', 'Gümüş', 'Gardırop', 'Gırgır', 'Guguklu Saat', 'Gönye', 'Gazete', 'Gelinlik', 'Göz Kalemi', 'Gözlük Kılıfı', 'Gramofon', 'Gül Suyu',
    'Halı', 'Halka', 'Hamak', 'Hançer', 'Harita', 'Havlu', 'Havan', 'Hırka', 'Hoparlör', 'Huni', 'Hortum', 'Hesap Makinesi', 'Hap', 'Halı Saha', 'Hamur Açma Makinesi', 'Hap Kutusu', 'Hasır', 'Havlu Kenarı', 'Havya', 'Hediye Paketi',
    'Işık', 'Izgara', 'Isıtıcı', 'Ilıca', 'Isıölçer', 'Isıcam',
    'İbrik', 'İğne', 'İlaç', 'İplik', 'İskelet', 'İskemle', 'İp', 'İlmek', 'İkiz Yatak', 'İmza', 'İngiliz Anahtarı', 'İş Makinesi', 'İşlemci',
    'Jeton', 'Jile', 'Jilet', 'Jeneratör', 'Jaluzi', 'Jant', 'Jel', 'Joystick', 'Jelatin',
    'Kablo', 'Kaban', 'Kadeh', 'Kafes', 'Kağıt', 'Kalem', 'Kalkan', 'Kamera', 'Kamyon', 'Kanca', 'Kanepe', 'Kap', 'Kapı', 'Kar', 'Kaşık', 'Kavanoz', 'Kazan', 'Kazak', 'Kazma', 'Keman', 'Kemer', 'Kılıç', 'Kılıf', 'Kilit', 'Kiremit', 'Kitap', 'Klavye', 'Koltuk', 'Kova', 'Kulaklık', 'Kutu', 'Küpe', 'Kürek', 'Kombi', 'Klima', 'Kibrit', 'Kravat', 'Kolye', 'Küvet', 'Kırlent', 'Kumanda', 'Kaşkol', 'Kaset', 'Kartlık', 'Kar Küresi', 'Kalorifer', 'Kalemtraş', 'Kahve Makinesi',
    'Lamba', 'Lastik', 'Lavabo', 'Lehim', 'Levha', 'Litre', 'Leğen', 'Lif', 'Limon Sıkacağı', 'Lazer', 'Lamba Fanusu', 'Lastik Toka', 'Levye', 'Lale Devri', 'Lipgloss', 'Lojik',
    'Maşa', 'Makas', 'Makara', 'Makyaj', 'Mandal', 'Manto', 'Maske', 'Masa', 'Matara', 'Matkap', 'Mekik', 'Mektup', 'Mendil', 'Merdiven', 'Mermi', 'Metre', 'Mikrofon', 'Minder', 'Motor', 'Mum', 'Musluk', 'Merdane', 'Makine', 'Mont', 'Mangal', 'Mürekkep', 'Mouse', 'Maket Bıçağı', 'Makine Yağı', 'Makyaj Pamuğu', 'Masa Örtüsü', 'Maşrapa', 'Matbaa Makinesi', 'Matematik', 'Megafon', 'Menengiç', 'Mercek',
    'Nal', 'Naylon', 'Ney', 'Nacak', 'Nargile', 'Neşter', 'Nihavend', 'Nalbant', 'Namazlık', 'Nazar Boncuğu', 'Navigasyon Cihazı',
    'Ocak', 'Oje', 'Ok', 'Oklava', 'Olta', 'Orak', 'Oturak', 'Oto', 'Oyun Konsolu', 'Oyuncak', 'Oto Koltuğu', 'Objektif', 'Oda Spreyi', 'Oksijen Tüpü', 'Okul Çantası', 'Oltu Taşı',
    'Ökçe', 'Önlük', 'Örs', 'Örtü', 'Özçekim Çubuğu', 'Örgü Şişi', 'Ölçü Kabı', 'Öğütücü', 'Ödül', 'Örümcek Ağı',
    'Pano', 'Pantolon', 'Paspas', 'Paten', 'Pense', 'Perde', 'Pergel', 'Pervane', 'Pijama', 'Pil', 'Pipo', 'Piyano', 'Priz', 'Pusula', 'Panjur', 'Paket', 'Pompa', 'Pikçer', 'Pedal', 'Parfüm', 'Peruk', 'Para', 'Pamuk', 'Papatya', 'Paratoner', 'Perde Kornişi', 'Pet Şişe',
    'Radyo', 'Ranza', 'Raptiye', 'Rende', 'Resim', 'Robot', 'Ruj', 'Rulo', 'Röntgen', 'Radyatör', 'Raket', 'Reçete', 'Römork', 'Rimel', 'Rulman', 'Radyatör Suyu', 'Raf', 'Rahle', 'Ramp', 'Raptiye Kutusu', 'Rehber',
    'Saat', 'Sabun', 'Saksı', 'Sandalye', 'Sandık', 'Süpürge', 'Silah', 'Silgi', 'Soba', 'Sokak', 'Süngü', 'Sürahi', 'Şamdan', 'Şapka', 'Şarj', 'Şemsiye', 'Şırınga', 'Şişe', 'Şort', 'Sabunluk', 'Sehpa', 'Süzgeç', 'Spula', 'Sayaç', 'Soba Borusu', 'Sac', 'Samanlık', 'Samur', 'Sarık', 'Sarkaç', 'Sayvan', 'Seccade', 'Sedir', 'Siper', 'Soket',
    'Şezlong', 'Şömine', 'Şal', 'Şilte', 'Şiş', 'Şofben', 'Şurup', 'Şarj Aleti', 'Şap', 'Şerit Metre', 'Şifoniyer', 'Şişme Bot', 'Şırınga İğnesi',
    'Tabak', 'Tabanca', 'Tabela', 'Tabure', 'Taç', 'Tarak', 'Tava', 'Tekerlek', 'Telefon', 'Televizyon', 'Tencere', 'Terazi', 'Terlik', 'Testere', 'Testi', 'Teyp', 'Tıraş', 'Toka', 'Top', 'Tornavida', 'Törpü', 'Traktör', 'Tuğla', 'Tuzluk', 'Tablet', 'Termos', 'Tost Makinesi', 'Tıraş Makinesi', 'Tepsi', 'Tutkal', 'Tahta', 'Takvim', 'Tambur', 'Tapan', 'Tapa', 'Tarayıcı', 'Tas', 'Tasma',
    'Uçak', 'Uçurtma', 'Urgan', 'Ustura', 'Uydu', 'Ufo', 'Uç', 'Uc', 'Uçak Bileti', 'Un', 'Uyku Tulumu', 'Uydu Alıcısı',
    'Ütü', 'Ütü Masası', 'Üniforma', 'Üreteç', 'Üzengi', 'Üçlü Priz', 'Üfleyici', 'Üst Geçit',
    'Vagon', 'Valiz', 'Vantilatör', 'Vazo', 'Vida', 'Vinç', 'Vites', 'Voleybol Topu', 'Vurmalı Çalgı', 'Vitrin', 'Vişne Açacağı', 'Vampir Dişi', 'Vapur', 'Varil', 'Vatometre', 'Velet', 'Vestiyer', 'Video',
    'Yaka', 'Yastık', 'Yatak', 'Yatay', 'Yay', 'Yelken', 'Yorgan', 'Yüzük', 'Yelek', 'Yelpaze', 'Yüksük', 'Yapıştırıcı', 'Yazıcı', 'Yağmurluk', 'Yaba', 'Yağdanlık', 'Yaka İğnesi', 'Yakıt Tankı', 'Yalıtım', 'Yama', 'Yamaç Paraşütü', 'Yastık Kılıfı',
    'Zarf', 'Zil', 'Zımba', 'Zincir', 'Zoka', 'Zurna', 'Zemberek', 'Zembil', 'Zıpkın', 'Zigon', 'Zımpara', 'Zırh', 'Zar', 'Zarflık', 'Zarf Açacağı', 'Zemberek Taşı', 'Zıbın', 'Zil Teli'
  ],
  'Sanatçı': [
    'Acun Ilıcalı', 'Adile Naşit', 'Ajda Pekkan', 'Ali Sunal', 'Alişan', 'Altan Erkekli', 'Aras Bulut İynemli', 'Aslı Enver', 'Ata Demirer', 'Aleyna Tilki', 'Ahmet Kaya', 'Ahmet Kural', 'Ayşen Gruda', 'Aylin Aslım', 'Athena Gökhan', 'Aydilge', 'Alpay', 'Arif Sağ', 'Ataol Behramoğlu', 'Avni Dilligil', 'Ayhan Işık', 'Aydemir Akbaş', 'Arif Susam', 'Atilla Taş', 'Ayça Ayşin Turan', 'Ali Poyrazoğlu', 'Ahmet Mümtaz Taylan', 'Ayşegül Aldinç', 'Aytaç Arman', 'Ayla Algan', 'Aysel Gürel', 'Ali Atay',
    'Barış Manço', 'Beren Saat', 'Bergüzar Korel', 'Beyazıt Öztürk', 'Burak Özçivit', 'Bülent Ersoy', 'Buray', 'Büşra Pekin', 'Bülent Ortaçgil', 'Bedia Akartürk', 'Belkıs Akkale', 'Burcu Esmersoy', 'Bergen', 'Barış Akarsu', 'Binnur Kaya', 'Bahar Öztan', 'Bülent İnal', 'Batu Mutlugil', 'Burcu Biricik', 'Burak Deniz', 'Bensu Soral', 'Bahar Candan', 'Bora Öztoprak', 'Bendeniz', 'Burak Yılmaz',
    'Candan Erçetin', 'Cem Karaca', 'Cem Yılmaz', 'Cüneyt Arkın', 'Çağatay Ulusoy', 'Çetin Tekindor', 'Çağla Şıkel', 'Cem Adrian', 'Cem Belevi', 'Cem Seymen', 'Cemal Hünal', 'Can Bonomo', 'Celil Nalçakan', 'Cansel Elçin', 'Civan Canova', 'Cem Öğretir', 'Coşkun Sabah', 'Can Gürzap', 'Caner Cindoruk', 'Cem Kılıç', 'Cem Gelinoğlu', 'Caner Özyurtlu',
    'Çolpan İlhan', 'Çiğdem Tunç', 'Çelik', 'Çağlar Ertuğrul', 'Çetin Altan', 'Çağlar Çorumlu', 'Çetin Alp',
    'Demet Akalın', 'Demet Evgar', 'Demet Akbağ', 'Doğu Demirkol', 'Doğa Rutkay', 'Defne Samyeli', 'Deniz Seki', 'Derya Uluğ', 'Doğuş', 'Duman', 'Demet Sağıroğlu', 'Deniz Uğur', 'Devrim Yakut', 'Deniz Çakır', 'Dilek Türkan', 'Devrim Evin', 'Doğa Bora', 'Defne Joy Foster',
    'Ebru Gündeş', 'Edis', 'Engin Akyürek', 'Engin Altan Düzyatan', 'Erol Evgin', 'Eser Yenenler', 'Ezgi Mola', 'Emre Altuğ', 'Emel Sayın', 'Ebru Yaşar', 'Ece Seçkin', 'Emircan İğrek', 'Ekin Uzunlar', 'Erkin Koray', 'Edip Akbayram', 'Erol Büyükburç', 'Ersay Üner', 'Emre Aydın', 'Ebru Şallı', 'Esra Erol', 'Erdal Özyağcılar', 'Ertan Saban', 'Erkan Can', 'Engin Günaydın', 'Erkan Petekkaya', 'Ezgi Eyüboğlu', 'Elçin Sangu', 'Ege', 'Ebru Cündübeyoğlu', 'Emre Kınay', 'Engin Öztürk', 'Eser West',
    'Fahriye Evcen', 'Fatih Ürek', 'Fatma Girik', 'Ferdi Tayfur', 'Filiz Akın', 'Funda Arar', 'Fatih Erkoç', 'Ferhat Göçer', 'Fırat Tanış', 'Faruk Tınaz', 'Fedon', 'Fikret Kızılok', 'Fatma Turgut', 'Ferhan Şensoy', 'Furkan Andıç', 'Fikret Hakan', 'Faruk Peker', 'Fırat Çelik', 'Furkan Palalı', 'Fadik Sevin Atasoy',
    'Gökhan Özoğuz', 'Gökçe Bahadır', 'Gülben Ergen', 'Gülse Birsel', 'Gülşen', 'Gülnaz', 'Gökhan Tepe', 'Gökhan Türkmen', 'Gülşen Bubikoğlu', 'Gönül Yazar', 'Gripin', 'Gülhanım', 'Gupse Özay', 'Gürkan Uygun', 'Gizem Karaca', 'Gökçe', 'Güven Kıraç', 'Gökhan Kırdar', 'Gökhan Özen', 'Gülcan Arslan', 'Gamze Özçelik', 'Göksel', 'Gökhan Keser',
    'Hadise', 'Halit Ergenç', 'Haluk Bilginer', 'Haluk Levent', 'Hande Erçel', 'Hande Yener', 'Hayko Cepkin', 'Hülya Avşar', 'Hülya Koçyiğit', 'Hakkı Bulut', 'Hakan Altun', 'Hakan Peker', 'Hande Ataizi', 'Hazal Kaya', 'Hümeyra', 'Hüseyin Turan', 'Hakan Taşıyan', 'Halil Sezai', 'Hasan Can Kaya', 'Hande Doğandemir', 'Hande Soral', 'Hakan Yılmaz', 'Halil Ergün', 'Hazal Subaşı',
    'Işın Karaca', 'İbrahim Büyükak', 'İbrahim Çelikkol', 'İbrahim Tatlıses', 'İlker Ayrık', 'İlker Kaleli', 'İrem Derici', 'İlyas Yalçıntaş', 'Irmak Arıcı', 'İlhan Şeşen', 'İntizar', 'İzel', 'İclal Aydın', 'İsmail YK', 'İlyas Salman', 'İhsan Yüce', 'İpek Tuzcuoğlu', 'İlker Aksum', 'İrem Sak', 'İsmail Hacıoğlu', 'İlhan İrem', 'Işıl Yücesoy', 'İlker İnanoğlu', 'İpek Filiz Yazıcı',
    'Jale', 'Janset', 'Jülide Kural', 'Jess Molho', 'Jülide Ateş',
    'Kaan Urgancıoğlu', 'Kadir İnanır', 'Kadir Doğulu', 'Kemal Sunal', 'Kenan Doğulu', 'Kenan İmirzalıoğlu', 'Kıvanç Tatlıtuğ', 'Kibariye', 'Koray Avcı', 'Kıraç', 'Kayahan', 'Kutsi', 'Kamil Sönmez', 'Kenan Işık', 'Kaan Tangöze', 'Kerem Bursin', 'Kaan Yıldırım', 'Kadir Çöpdemir', 'Kadir Savun', 'Kerem Alışık', 'Kıvanç Kasabalı', 'Kemal Doğulu', 'Kenan Çoban', 'Keremcem', 'Kuşum Aydın',
    'Leman Sam', 'Levent Yüksel', 'Linet', 'Latif Doğan', 'Lale Belkıs', 'Levent Kırca', 'Lütfiye', 'Lale Mansur', 'Lara', 'Leman Süheyl',
    'Mabel Matiz', 'Mahsun Kırmızıgül', 'Mehmet Ali Erbil', 'Mehmet Günsür', 'Melek Mosso', 'Merve Dizdar', 'Mine Tugay', 'Murat Boz', 'Murat Dalkılıç', 'Mustafa Ceceli', 'Mustafa Sandal', 'Müslüm Gürses', 'Müjdat Gezen', 'Manga', 'Mirkelam', 'Muazzez Abacı', 'Muazzez Ersoy', 'Musa Eroğlu', 'Mazhar Alanson', 'Müşfik Kenter', 'Münir Özkul', 'Metin Akpınar', 'Metin Şentürk', 'Murat Göğebakan', 'Murat Kekilli', 'Murat Yıldırım', 'Melis Sezen', 'Mert Fırat', 'Mert Ramazan Demir', 'Merve Boluğur', 'Mehmet Aslantuğ', 'Meltem Cumbul', 'Mustafa Uğurlu', 'Mazlum Çimen', 'Metin Arolat', 'Mert Yazıcıoğlu',
    'Nebahat Çehre', 'Necati Şaşmaz', 'Nejat İşler', 'Neşet Ertaş', 'Nil Karaibrahimgil', 'Nilüfer', 'Nurgül Yeşilçay', 'Nazan Öncel', 'Nükhet Duru', 'Nadir Göktürk', 'Nev', 'Nuri Sesigüzel', 'Nurettin Rençber', 'Nurhan Damcıoğlu', 'Neco', 'Nergis Kumbasar', 'Neslihan Atagül', 'Numan Çakır', 'Nur Fettahoğlu', 'Nur Sürer', 'Necla Nazır', 'Naşide Göktürk', 'Nehir Erdoğan', 'Nadir Sarıbacak', 'Nuri Alço', 'Nazan Şoray',
    'Oğuzhan Koç', 'Okan Bayülgen', 'Orhan Gencebay', 'Ozan Güven', 'Özcan Deniz', 'Özgü Namal', 'Özlem Tekin', 'Onur Akın', 'Oktay Kaynarca', 'Orhan Hakalmaz', 'Ozan Çolakoğlu', 'Ozan Doğulu', 'Orhan Kemal', 'Oya Aydoğan', 'Özkan Uğur', 'Özlem Yılmaz', 'Özge Özpirinçci', 'Öykü Karayel', 'Özge Gürel', 'Özlem Conker', 'Önder Açıkbaş', 'Onur Saylak', 'Onur Tuna', 'Ozan Arif', 'Özge Ulusoy', 'Oya Başar', 'Oya Eren', 'Onur Büyüktopçu', 'Onur Atilla',
    'Pelin Karahan', 'Perran Kutman', 'Pınar Altuğ', 'Pınar Deniz', 'Pinhani', 'Pelin Akil', 'Pınar Aylin', 'Perihan Savaş', 'Peker Açıkalın', 'Pelin Öztekin', 'Pelin Batu', 'Pamela', 'Pınar Dilşeker', 'Pelin Diştaş', 'Pars', 'Petek Dinçöz',
    'Rafet El Roman', 'Reynmen', 'Rober Hatemo', 'Rutkay Aziz', 'Resul Dindar', 'Redd', 'Reyhan Karaca', 'Rıza Kocaoğlu', 'Rüştü Asyalı', 'Rasim Öztekin', 'Rıza Akın', 'Rıza Çalımbay', 'Rojda', 'Reha Özcan', 'Ragıp Savaş', 'Recep Aktuğ', 'Recep İvedik', 'Rıza Silahlıpoda',
    'Seda Sayan', 'Sefo', 'Selda Bağcan', 'Serdar Ortaç', 'Serenay Sarıkaya', 'Sertab Erener', 'Sezen Aksu', 'Sıla', 'Sibel Can', 'Sinan Akçıl', 'Şahan Gökbakar', 'Şener Şen', 'Şevval Sam', 'Sagopa Kajmer', 'Soner Sarıkabadayı', 'Seksendört', 'Sami Özer', 'Suavi', 'Seçkin Özdemir', 'Salih Kalyon', 'Sadri Alışık', 'Sarp Apak', 'Serkan Çayoğlu', 'Sarp Akkaya', 'Serhat Teoman', 'Sinem Kobal', 'Selçuk Yöntem', 'Songül Öden', 'Sinan Özen', 'Serenay Aktaş', 'Seda Bakan', 'Selin Şekerci', 'Saadet Işıl Aksoy', 'Sümer Tilmaç', 'Suna Yıldızoğlu', 'Selçuk Balcı', 'Sibel Tüzün', 'Seden Gürel', 'Serkan Kaya', 'Seyfi Dursunoğlu',
    'Şebnem Ferah', 'Şükriye Tutkun', 'Şafak Sezer', 'Şükrü Özyıldız', 'Şafak Pavey', 'Şevket Çoruh', 'Şirin Ediger', 'Şevket Altuğ', 'Şebnem Bozoklu', 'Şoray Uzun', 'Şebnem Dönmez', 'Şükrü Avşar', 'Şehrazat', 'Şükran Ovalı',
    'Tarkan', 'Teoman', 'Tolga Çevik', 'Tolgahan Sayışman', 'Türkan Şoray', 'Tan Taşçı', 'Tuğba Yurt', 'Tuğçe Tayfur', 'Toygar Işıklı', 'Tarık Mengüç', 'Timur Selçuk', 'Tarık Akan', 'Tolga Sarıtaş', 'Tamer Karadağlı', 'Tuba Büyüküstün', 'Timuçin Esen', 'Talat Bulut', 'Tekin Akmansoy', 'Tuncel Kurtiz', 'Tarık Tarcan', 'Tanju Okan', 'Tolga Karel', 'Tuğba Ekinci', 'Tuba Ünsal', 'Tarık Papuççuoğlu', 'Tuna Kiremitçi', 'Tansel Öngel', 'Toprak Sağlam',
    'Uğur Yücel', 'Uraz Kaygılaroğlu', 'Ümit Besen', 'Umut Kaya', 'Ufuk Beydemir', 'Uğur Işılak', 'Uğur Aslan', 'Uğur Pektaş', 'Ushan Çakır', 'Uğur Polat', 'Uğur Çavuşoğlu', 'Uğur Güneş', 'Ümit Sayın', 'Ümit Erdim', 'Ümit Kantarcılar', 'Ufuk Özkan', 'Uğur Arslan', 'Utku Barış', 'Umut Akyürek', 'Umur Bugay', 'Ülkü Duru', 'Ümit Yaşar Oğuzcan',
    'Vahide Perçin', 'Volkan Konak', 'Vedat Sakman', 'Veysel Mutlu', 'Volkan Severcan', 'Vildan Atasever', 'Vatan Şaşmaz', 'Vahdet Vural', 'Volkan Demirel',
    'Yalın', 'Yaşar', 'Yıldız Tilbe', 'Yılmaz Erdoğan', 'Yılmaz Morgül', 'Yüksek Sadakat', 'Yusuf Güney', 'Yıldız Usmanova', 'Yılmaz Vural', 'Yonca Evcimik', 'Yıldız Kenter', 'Yalçın Dümer', 'Yavuz Bingöl', 'Yılmaz Zafer', 'Yiğit Özşener', 'Yunus Emre Yıldırımer', 'Yetkin Dikinciler', 'Yasemin Allen', 'Yağmur Tanrısevsin', 'Yalçın Hafızoğlu', 'Yonca Lodi', 'Yavuz Seçkin', 'Yıldız Asyalı', 'Yusuf Çim', 'Yeşim Salkım', 'Yaşar Alptekin',
    'Zara', 'Zeki Müren', 'Zerrin Özer', 'Zeynep Bastık', 'Zuhal Olcay', 'Zülfü Livaneli', 'Zeynep Dizdar', 'Zafer Algöz', 'Zeki Alasya', 'Zeynep Casalini', 'Zeynep Çamcı', 'Zeynep Beşerler', 'Zeyno Gönenç', 'Zerrin Tekindor', 'Zuhal Topal', 'Zafer Ergin', 'Zeynep Farah Abdullah', 'Zeynep Tokuş', 'Zekeriya Önge'
  ]
};

// ==========================================
// KÜÇÜK/BÜYÜK HARF (CASE INSENSITIVITY) OPTİMİZASYONU
// ==========================================
const NORMALIZED_DICTIONARY = {};
Object.keys(GAME_DICTIONARY).forEach(cat => {
   NORMALIZED_DICTIONARY[cat] = GAME_DICTIONARY[cat].map(w => w.trim().toLocaleLowerCase('tr-TR'));
});

// Bot Logic
const generateBotSubmission = (letter, categories) => {
  const answers = {};
  const lowerLetter = letter.toLocaleLowerCase('tr-TR');
  categories.forEach(cat => {
      let word = "";
      let isValid = false;
      if (Math.random() > 0.10) {
          if (GAME_DICTIONARY[cat]) {
              const matches = GAME_DICTIONARY[cat].filter(w => w.toLocaleLowerCase('tr-TR').startsWith(lowerLetter));
              if (matches.length > 0) {
                  word = matches[Math.floor(Math.random() * matches.length)];
                  isValid = true;
              }
          }
      }
      answers[cat] = { word, isValid };
  });
  return { answers, timeTaken: Math.floor(Math.random() * 15) + 3, submittedAt: Date.now() };
};

const validateAnswersWithAI = async (answers, letter, categories) => {
  const apiKey = ""; 
  const results = {};
  const wordsToCheck = [];
  const lowerLetter = letter.toLocaleLowerCase('tr-TR');

  for (const cat of categories) {
    const word = answers[cat] || "";
    // TAM KÜÇÜK HARF UYUMU VE BOŞLUK TEMİZLİĞİ
    const normalized = word.trim().toLocaleLowerCase('tr-TR');
    
    const isValidFormat = normalized.length > 1 && normalized.startsWith(lowerLetter);

    results[cat] = { word: word.trim(), isValid: isValidFormat };

    if (isValidFormat) {
      if (NORMALIZED_DICTIONARY[cat].includes(normalized)) {
        results[cat].isValid = true;
      } else {
        wordsToCheck.push({ category: cat, word: normalized });
      }
    }
  }

  if (wordsToCheck.length > 0) {
     if (apiKey) {
        try {
           const prompt = `Aşağıdaki kelimelerin belirtilen kategorilere gerçekten uygun, anlamlı ve doğru yazılmış Türkçe kelimeler olup olmadığını kontrol et. 
           ÖNEMLİ KURALLAR:
           1- Uydurma kelimeleri (örneğin "göpek"), yanlış yazımları veya kategorisine uymayan kelimeleri KESİNLİKLE "false" olarak işaretle. 
           2- 'Şehir' kategorisinde SADECE Türkiye'nin 81 ilinden biri kabul edilmelidir. 
           3- 'Sanatçı' kategorisinde tanınmış Türk şarkıcı, sanatçı veya oyuncular kabul edilmelidir.
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
                 results[item.category].isValid = aiValidation[item.category] === true;
              }
           }
        } catch (e) {
           console.error("AI Error:", e);
           for (const item of wordsToCheck) results[item.category].isValid = false;
        }
     } else {
        for (const item of wordsToCheck) {
           results[item.category].isValid = false;
        }
     }
  }

  return results;
};


// --- UI COMPONENTS ---
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
      >
        {isMuted ? <VolumeX className="w-6 h-6 text-red-400" /> : <Volume2 className="w-6 h-6 text-cyan-400" />}
      </button>
  </div>
);

// 1. Setup Screen
const SetupScreen = ({ onJoin, onCreate, onShowLeaderboard }) => {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState('home'); 
  const [rounds, setRounds] = useState(10); 

  const handleActionClick = (action) => {
    playSound('pop');
    action();
  }

  const isFormValid = name.trim().length > 1 && age >= 5 && age <= 99;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute top-[10%] left-[10%] w-64 h-64 md:w-96 md:h-96 bg-fuchsia-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse"></div>
      <div className="absolute bottom-[10%] right-[10%] w-64 h-64 md:w-96 md:h-96 bg-cyan-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse" style={{animationDelay: '1s'}}></div>

      <div className="relative z-10 max-w-md w-full bg-slate-900/60 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] border-2 border-slate-700/50 shadow-2xl shadow-cyan-900/20 transform transition-all mt-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-3xl mb-4 transform rotate-6 hover:rotate-12 transition-transform shadow-xl shadow-fuchsia-500/30">
             <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-fuchsia-400 animate-gradient-x">
            İsim Şehir
          </h1>
          <div className="inline-block bg-white text-black font-black uppercase tracking-widest text-[10px] md:text-xs px-3 py-1 rounded-full mt-2 transform -translate-y-2">Online</div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
             <input 
               type="text" 
               maxLength={15}
               value={name}
               onChange={(e) => setName(e.target.value)}
               placeholder="Oyuncu Adın..." 
               autoComplete="off"
               className="w-2/3 bg-slate-950/50 border-2 border-slate-700 rounded-2xl px-4 py-4 text-white text-[16px] md:text-lg font-bold placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all text-center"
             />
             <input 
               type="number" 
               min="5" max="99"
               value={age}
               onChange={(e) => setAge(e.target.value)}
               placeholder="Yaşın" 
               className="w-1/3 bg-slate-950/50 border-2 border-slate-700 rounded-2xl px-4 py-4 text-white text-[16px] md:text-lg font-bold placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all text-center"
             />
          </div>
          {!age && mode !== 'home' && <p className="text-xs text-red-400 text-center animate-pulse">Lütfen oyuna başlamadan önce yaşını gir (Süre yaşa göre belirlenir).</p>}

          <div>
             <div className="flex flex-wrap gap-2 justify-center bg-slate-950/30 p-4 rounded-3xl border border-slate-800 h-40 overflow-y-auto">
                {AVATARS.map(a => (
                  <button 
                    key={a}
                    onClick={() => { playSound('pop'); setAvatar(a); }}
                    className={`text-2xl md:text-3xl w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${avatar === a ? 'bg-gradient-to-br from-fuchsia-500 to-cyan-500 scale-110 shadow-lg shadow-cyan-500/30 rotate-3' : 'bg-slate-800/50 hover:bg-slate-700 hover:scale-105'}`}
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
                disabled={!isFormValid}
                className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white font-black text-lg py-4 px-4 rounded-2xl shadow-xl shadow-fuchsia-500/20 transform transition hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <Plus className="w-6 h-6" /> Yeni Oda Kur
              </button>
              <button 
                onClick={() => handleActionClick(() => setMode('join'))}
                disabled={!isFormValid}
                className="w-full bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 text-white font-black text-lg py-4 px-4 rounded-2xl shadow-lg transform transition hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <LogIn className="w-6 h-6" /> Odaya Katıl
              </button>
              <button 
                onClick={() => handleActionClick(onShowLeaderboard)}
                className="w-full bg-indigo-900/50 hover:bg-indigo-800/50 border-2 border-indigo-500/50 text-indigo-300 font-black text-sm py-3 px-4 rounded-2xl transition flex items-center justify-center gap-2 mt-2"
              >
                <Globe className="w-5 h-5" /> Global Liderlik Tablosu
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
                  onClick={() => handleActionClick(() => onCreate({ name, avatar, age, rounds }))}
                  className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-black text-xl py-4 px-4 rounded-2xl shadow-xl transform transition hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  <Play className="w-6 h-6" /> Macerayı Başlat
                </button>
                <button onClick={() => handleActionClick(() => setMode('home'))} className="w-full font-bold text-slate-400 hover:text-white transition-colors py-2">Geri Dön</button>
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
                  className="w-full bg-slate-950/50 border-2 border-slate-700 rounded-2xl px-4 py-4 text-white text-center font-black text-3xl tracking-[0.5em] focus:outline-none focus:border-fuchsia-500 uppercase"
                />
                <button 
                  onClick={() => handleActionClick(() => onJoin(roomCode, { name, avatar, age }))}
                  disabled={roomCode.length !== 4}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xl py-4 px-4 rounded-2xl shadow-xl transform transition hover:-translate-y-1 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-6 h-6" /> İçeri Dal!
                </button>
                <button onClick={() => handleActionClick(() => setMode('home'))} className="w-full font-bold text-slate-400 hover:text-white transition-colors py-2">Geri Dön</button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Liderlik Tablosu Component
const LeaderboardScreen = ({ onBack }) => {
   const [leaders, setLeaders] = useState([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchLeaders = async () => {
         try {
            const lbRef = collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard');
            const snap = await getDocs(lbRef);
            const data = [];
            snap.forEach(doc => data.push(doc.data()));
            data.sort((a, b) => b.totalScore - a.totalScore);
            setLeaders(data.slice(0, 50));
         } catch (e) {
            console.error(e);
         } finally {
            setLoading(false);
         }
      };
      fetchLeaders();
   }, []);

   return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 py-20 relative overflow-hidden">
         <div className="relative z-10 w-full max-w-2xl bg-slate-900/80 backdrop-blur-2xl border-2 border-indigo-500/30 p-8 rounded-[3rem] shadow-2xl">
            <div className="text-center mb-8">
               <Globe className="w-16 h-16 mx-auto text-indigo-400 mb-4 drop-shadow-lg" />
               <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 uppercase tracking-widest">Global Sıralama</h2>
            </div>
            
            <div className="bg-slate-950/50 rounded-3xl p-4 min-h-[300px] max-h-[500px] overflow-y-auto mb-8 border border-slate-800">
               {loading ? (
                  <div className="flex justify-center items-center h-full"><RefreshCw className="w-8 h-8 animate-spin text-indigo-500" /></div>
               ) : leaders.length === 0 ? (
                  <p className="text-center text-slate-500 font-bold mt-10">Henüz kimse oyun oynamadı. İlk sen ol!</p>
               ) : (
                  <div className="space-y-3">
                     {leaders.map((l, i) => (
                        <div key={i} className={`flex items-center justify-between p-4 rounded-2xl ${i===0 ? 'bg-yellow-500/20 border border-yellow-500/50' : i===1 ? 'bg-slate-300/10' : i===2 ? 'bg-amber-700/20' : 'bg-slate-900'}`}>
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
   )
}

// 2. Lobby Screen
const LobbyScreen = ({ room, user, onStartGame, onLeave, onAddBot }) => {
  const isHost = room.hostId === user.uid;
  
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center">
       <div className="max-w-4xl w-full mt-24">
          <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/60 backdrop-blur-xl border-2 border-fuchsia-500/30 p-6 md:p-8 rounded-[2rem] mb-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px]"></div>
             <div className="relative z-10 text-center md:text-left">
               <h2 className="text-3xl md:text-4xl font-black flex items-center justify-center md:justify-start gap-3 text-white mb-2">
                 <Users className="text-cyan-400 w-8 h-8 md:w-10 md:h-10" /> Bekleme Salonu
               </h2>
               <p className="text-slate-400 font-medium text-sm md:text-lg">Herkes hazırsa oyunu başlat!</p>
             </div>
             <div className="relative z-10 mt-6 md:mt-0 bg-black/50 border-2 border-slate-700 px-6 py-3 rounded-3xl text-center shadow-inner">
               <span className="text-xs md:text-sm text-cyan-400 uppercase tracking-widest font-black block mb-1">Katılım Kodu</span>
               <span className="text-4xl md:text-5xl font-mono tracking-[0.2em] font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">{room.id}</span>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
            {Object.values(room.players || {}).map((p, i) => (
               <div key={p.id} className={`bg-slate-900/80 border-2 ${p.isBot ? 'border-cyan-500/50 shadow-cyan-500/20' : 'border-slate-700 shadow-slate-900/50'} rounded-3xl p-4 md:p-6 flex flex-col items-center justify-center relative group shadow-xl`}>
                  <div className="text-5xl md:text-6xl mb-3 drop-shadow-2xl">{p.avatar}</div>
                  <span className="font-black text-lg text-white truncate w-full text-center">{p.name}</span>
                  {!p.isBot && <span className="text-xs text-fuchsia-400 font-bold bg-fuchsia-950/50 px-2 py-1 rounded-md mt-1">{p.age} Yaş</span>}
                  {p.isBot && <span className="mt-1 text-[10px] font-bold bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full uppercase tracking-wider">Bot</span>}
               </div>
            ))}
            {Object.values(room.players || {}).length < 8 && (
               <div className="bg-slate-900/30 border-2 border-dashed border-slate-700/50 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-500 min-h-[160px]">
                  <RefreshCw className="w-8 h-8 mb-2 animate-spin-slow opacity-50" />
                  <span className="text-xs font-bold uppercase tracking-widest text-center">Oyuncu<br/>Bekleniyor</span>
               </div>
            )}
          </div>

          {isHost ? (
            <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 border-2 border-fuchsia-500/20 p-6 md:p-8 rounded-[2rem] text-center shadow-2xl relative">
               <p className="text-slate-300 mb-6 font-bold text-sm md:text-lg">Oda Kurucusu sensin! Oyunu dilediğin zaman başlat.</p>
               <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button onClick={() => { playSound('pop'); onAddBot(); }} className="bg-slate-800 border-2 border-cyan-500/50 hover:bg-cyan-900/30 hover:border-cyan-400 text-cyan-400 font-black py-4 px-6 md:px-8 rounded-2xl shadow-lg transition text-base md:text-lg flex items-center justify-center gap-3">
                     <Bot className="w-5 h-5" /> Bot Ekle
                  </button>
                  <button onClick={() => { playSound('pop'); onStartGame(); }} className="bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-black py-4 px-8 md:px-12 rounded-2xl shadow-xl transition hover:-translate-y-1 text-lg md:text-xl flex items-center justify-center gap-3">
                     <Play className="w-6 h-6 fill-current" /> OYUNU BAŞLAT
                  </button>
               </div>
            </div>
          ) : (
             <div className="text-center p-6 md:p-8 bg-slate-900/80 rounded-[2rem] border-2 border-slate-800 shadow-2xl">
                <p className="text-cyan-400 animate-pulse text-xl md:text-2xl font-black flex items-center justify-center gap-3">
                   <Clock className="w-6 h-6" /> Kurucunun başlatması bekleniyor...
                </p>
             </div>
          )}
       </div>
    </div>
  );
};

// 3. Game Screen
const GameScreen = ({ room, user, onSubmitAnswers }) => {
  const currentRoundData = room.rounds[room.currentRound];
  const [phase, setPhase] = useState('roulette'); 
  const [displayLetter, setDisplayLetter] = useState('?');
  
  const [timeLeft, setTimeLeft] = useState(currentRoundData.durationSecs || 60);
  const [answers, setAnswers] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [localStartTime, setLocalStartTime] = useState(null);
  
  const inputRefs = useRef([]);

  useEffect(() => {
    setPhase('roulette');
    setHasSubmitted(false);
    setAnswers({});
    setTimeLeft(currentRoundData.durationSecs || 60);

    let ticks = 0;
    const interval = setInterval(() => {
      setDisplayLetter(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
      ticks++;
      if (ticks > 30) { 
         clearInterval(interval);
         setDisplayLetter(currentRoundData.letter);
         setPhase('playing');
         setLocalStartTime(Date.now()); 
         playSound('ding');
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentRoundData.letter, room.currentRound]);

  useEffect(() => {
    if (phase === 'playing' && !hasSubmitted) {
       if (timeLeft <= 0) {
          handleSubmit(); 
          return;
       }
       const timerId = setTimeout(() => {
          setTimeLeft(prev => {
             if (prev <= 6 && prev > 1) playSound('tick');
             return prev - 1;
          });
       }, 1000);
       return () => clearTimeout(timerId);
    }
  }, [phase, timeLeft, hasSubmitted]);

  const handleInputChange = (category, value) => {
    setAnswers(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = () => {
    if (hasSubmitted) return;
    playSound('ding');
    setHasSubmitted(true);
    const timeTaken = (currentRoundData.durationSecs || 60) - timeLeft;
    onSubmitAnswers(answers, timeTaken > 0 ? timeTaken : (currentRoundData.durationSecs || 60)); 
  };

  const handleKeyDown = (e, index) => {
     if (e.key === 'Enter') {
        e.preventDefault();
        if (index + 1 < room.settings.categories.length) {
           inputRefs.current[index + 1]?.focus();
        } else {
           handleSubmit();
        }
     }
  };

  if (phase === 'roulette') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/20 to-cyan-900/20 animate-pulse"></div>
         <h3 className="text-xl md:text-3xl text-cyan-400 font-black mb-8 uppercase tracking-[0.3em] drop-shadow-lg z-10 text-center">Harf Çekiliyor</h3>
         <div className="w-48 h-48 md:w-64 md:h-64 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(217,70,239,0.4)] border-8 border-white/10 z-10 animate-bounce">
            <span className="text-7xl md:text-[140px] font-black text-white drop-shadow-2xl z-20 leading-none">{displayLetter}</span>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center">
       <div className="w-full max-w-3xl mt-16 flex-1 flex flex-col">
           <div className="flex justify-between items-center mb-6 bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700/50 p-4 md:p-6 rounded-3xl sticky top-20 z-20 shadow-2xl">
              <div className="flex items-center gap-4 md:gap-6">
                 <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-2xl flex items-center justify-center text-4xl md:text-5xl font-black shadow-[0_0_30px_rgba(217,70,239,0.4)] transform -rotate-3 border-4 border-slate-900">
                   {currentRoundData.letter}
                 </div>
                 <div>
                   <div className="text-xs md:text-sm text-fuchsia-400 uppercase tracking-widest font-black mb-1">TUR {room.currentRound + 1}/{room.settings.rounds}</div>
                   <div className="font-black text-slate-300 text-xs md:text-sm">Enter ile alt satıra geç!</div>
                 </div>
              </div>
              <div className={`flex flex-col items-center justify-center w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl border-4 ${timeLeft <= 10 ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-slate-950 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'}`}>
                 <Clock className="w-5 h-5 md:w-8 md:h-8 mb-1" /> 
                 <span className="font-black text-2xl md:text-3xl leading-none">{timeLeft}</span>
              </div>
           </div>

           <div className="space-y-4 md:space-y-6 flex-1 pb-32">
             {room.settings.categories.map((cat, idx) => (
               <div key={cat} className="group relative bg-slate-900 border-2 border-slate-700 rounded-3xl md:rounded-[2rem] p-1 md:p-2 focus-within:border-cyan-400 focus-within:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all">
                 <div className="absolute top-0 left-4 md:left-6 -translate-y-1/2 bg-slate-950 px-3 py-1 md:px-4 md:py-1 rounded-full border-2 border-inherit text-xs md:text-sm font-black text-inherit uppercase tracking-widest z-10 group-focus-within:text-cyan-400 text-slate-400">
                    {cat}
                 </div>
                 <input 
                   ref={el => inputRefs.current[idx] = el}
                   type="text"
                   value={answers[cat] || ''}
                   onChange={(e) => handleInputChange(cat, e.target.value)}
                   onKeyDown={(e) => handleKeyDown(e, idx)}
                   disabled={hasSubmitted}
                   placeholder={`${currentRoundData.letter} ile başlayan...`}
                   autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck="false"
                   className="w-full bg-transparent text-white px-5 py-5 md:px-6 md:py-6 text-[16px] md:text-2xl font-black focus:outline-none placeholder-slate-700 disabled:opacity-50"
                 />
                 {idx < room.settings.categories.length -1 && (
                    <ArrowDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-700 group-focus-within:text-cyan-500/50" />
                 )}
               </div>
             ))}
           </div>

           <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-30 pointer-events-none">
             <div className="max-w-3xl mx-auto pointer-events-auto">
               {hasSubmitted ? (
                 <div className="bg-slate-900 border-2 border-cyan-500/50 text-center py-5 md:py-6 rounded-3xl md:rounded-[2rem] text-cyan-400 font-black text-lg md:text-xl flex items-center justify-center gap-3">
                   <RefreshCw className="w-6 h-6 md:w-8 md:h-8 animate-spin" /> Rakipler bekleniyor...
                 </div>
               ) : (
                 <button 
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-black py-5 md:py-6 px-6 rounded-3xl md:rounded-[2rem] shadow-[0_10px_40px_rgba(217,70,239,0.4)] transform transition hover:-translate-y-2 text-xl md:text-2xl flex items-center justify-center gap-3 md:gap-4"
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

  const sortedPlayers = Object.values(room.players).sort((a, b) => b.score - a.score);

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
                 <div key={player.id} className="bg-slate-900/80 border-2 border-slate-800 rounded-3xl md:rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="bg-slate-950/50 p-4 md:p-6 flex flex-col md:flex-row justify-between md:items-center border-b-2 border-slate-800 gap-4">
                       <div className="flex items-center gap-3 md:gap-4">
                         <span className="text-2xl md:text-3xl font-black text-slate-600 w-8 md:w-10">#{index + 1}</span>
                         <span className="text-4xl md:text-5xl drop-shadow-md">{player.avatar}</span>
                         <div className="flex flex-col">
                            <span className="font-black text-xl md:text-2xl tracking-wide">{player.name} {player.id === user.uid && <span className="text-fuchsia-400 text-xs ml-1 uppercase">(SEN)</span>}</span>
                         </div>
                       </div>
                       <div className="flex gap-2 md:gap-4 self-end md:self-auto">
                          <div className={`border-2 px-3 py-2 md:px-6 md:py-3 rounded-2xl flex flex-col items-center justify-center shadow-inner ${pScores?.points < 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                             <span className="text-xl md:text-3xl font-black">{pScores?.points > 0 ? '+' : ''}{pScores?.points || 0}</span>
                             <span className="text-[8px] md:text-[10px] uppercase font-black mt-1 opacity-80">Bu Tur</span>
                          </div>
                          <div className="bg-indigo-500/10 border-2 border-indigo-500/30 px-4 py-2 md:px-6 md:py-3 rounded-2xl flex flex-col items-center justify-center shadow-inner">
                             <span className="text-2xl md:text-3xl font-black text-indigo-400">{player.score}</span>
                             <span className="text-[8px] md:text-[10px] text-indigo-500/80 uppercase font-black mt-1">Toplam Puan</span>
                          </div>
                       </div>
                    </div>
                    <div className="p-4 md:p-6 bg-slate-900/30">
                       <div className="flex flex-wrap gap-2 md:gap-3">
                         {room.settings.categories.map(cat => {
                            const answerObj = pAnswers[cat];
                            
                            // BOŞ CEVAP (-1 Puan)
                            if (!answerObj || !answerObj.word || answerObj.word.trim() === '') {
                               return <div key={cat} className="text-xs md:text-sm font-bold bg-slate-800 text-slate-500 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-slate-700">{cat}: <span className="italic">Boş</span> <span className="text-red-400 ml-1 opacity-80">(-1)</span></div>;
                            }
                            // YANLIŞ CEVAP (-2 Puan)
                            if (!answerObj.isValid) {
                               return <div key={cat} className="text-xs md:text-sm font-bold bg-red-950/40 border border-red-500/30 text-red-400 px-3 py-1.5 md:px-4 md:py-2 rounded-xl line-through decoration-red-500 decoration-2">{cat}: {answerObj.word} <span className="text-red-400 ml-1 decoration-transparent">(-2)</span></div>;
                            }
                            
                            // DOĞRU CEVAP (+5 veya +3)
                            return (
                               <div key={cat} className={`text-xs md:text-sm font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-xl border-2 ${answerObj.isUnique ? 'bg-fuchsia-900/30 border-fuchsia-500 text-fuchsia-100 shadow-[0_0_15px_rgba(217,70,239,0.2)]' : 'bg-cyan-900/30 border-cyan-500/50 text-cyan-100'}`}>
                                  <span className="opacity-70 mr-1">{cat}:</span> <span className="text-white text-[14px] md:text-base">{answerObj.word}</span> <span className="ml-1 md:ml-2 text-[10px] md:text-xs font-black opacity-80">(+{answerObj.isUnique ? 5 : 3})</span>
                               </div>
                            );
                         })}
                         {/* HIZ BONUSU (+2) */}
                         {isFastest && (
                            <div className="text-xs md:text-sm font-black bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400 px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                               <Zap className="w-4 h-4 md:w-5 md:h-5 fill-current" /> En Hızlı (+2)
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
                 className="w-full md:w-auto bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-black py-5 md:py-6 px-8 md:px-16 rounded-3xl md:rounded-[2rem] shadow-[0_10px_40px_rgba(6,182,212,0.4)] transform transition hover:-translate-y-2 text-xl md:text-2xl flex items-center justify-center gap-3 md:gap-4 mx-auto"
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

  useEffect(() => { playSound('win'); }, []);

  const handleShare = () => {
    playSound('pop');
    const text = `İsim Şehir Online'da ${user.score || 0} puan yaptım! Sen de oynamak istersen tıkla!`;
    if (navigator.share) {
       navigator.share({ title: 'İsim Şehir Online', text, url: window.location.href });
    } else {
       const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); alert("Skorun panoya kopyalandı!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 py-16 md:py-20 relative overflow-hidden">
       <div className="absolute inset-0 pointer-events-none opacity-80">
          {[...Array(40)].map((_, i) => (
             <div key={i} className="absolute w-3 h-3 md:w-4 md:h-4 rounded-full animate-ping" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, animationDuration: `${1 + Math.random() * 3}s`, backgroundColor: ['#d946ef', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 6)] }} />
          ))}
       </div>

       <div className="relative z-10 w-full max-w-3xl bg-slate-900/80 backdrop-blur-2xl border-4 border-yellow-500/50 p-8 md:p-16 rounded-[3rem] shadow-[0_0_120px_rgba(234,179,8,0.2)] text-center mt-10">
          <div className="relative inline-block mt-4 mb-10 group">
             <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-fuchsia-400 rounded-full blur-3xl opacity-50 animate-spin-slow"></div>
             <Crown className="w-20 h-20 md:w-32 md:h-32 text-yellow-400 absolute -top-12 md:-top-20 left-1/2 transform -translate-x-1/2 -rotate-12 drop-shadow-[0_10px_20px_rgba(250,204,21,0.6)] z-20 animate-bounce" fill="currentColor" />
             <div className="relative text-[100px] md:text-[160px] drop-shadow-[0_0_40px_rgba(250,204,21,0.5)] z-10 transform group-hover:scale-110 transition-transform duration-500">{winner?.avatar}</div>
          </div>

          <h1 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 mb-2 md:mb-4 drop-shadow-xl">Oyunun Yıldızı</h1>
          <p className="text-3xl md:text-5xl font-black text-white mb-10 md:mb-16 tracking-wide drop-shadow-md">{winner?.name}</p>

          <div className="space-y-3 md:space-y-4 mb-10 md:mb-16 text-left">
             {sortedPlayers.map((player, idx) => (
                <div key={player.id} className={`flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-[2rem] transform transition hover:scale-[1.02] ${idx === 0 ? 'bg-gradient-to-r from-yellow-500/30 to-yellow-600/10 border-2 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.2)] scale-105' : 'bg-slate-950/50 border-2 border-slate-800'}`}>
                   <div className="flex items-center gap-3 md:gap-6">
                      <div className={`w-8 md:w-12 text-center font-black text-xl md:text-3xl ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-600'}`}>#{idx + 1}</div>
                      <div className="text-3xl md:text-5xl drop-shadow-lg">{player.avatar}</div>
                      <div className="font-black text-lg md:text-2xl text-white tracking-wide truncate max-w-[120px] md:max-w-none">{player.name} {player.id === user.uid && <span className="text-fuchsia-400 text-xs ml-1 md:text-sm uppercase">(SEN)</span>}</div>
                   </div>
                   <div className="text-2xl md:text-4xl font-black text-white bg-slate-900 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl border-2 border-slate-700 shadow-inner whitespace-nowrap">
                      {player.score} <span className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-widest ml-1 hidden sm:inline-block">Puan</span>
                   </div>
                </div>
             ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
             <button onClick={handleShare} className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black py-4 px-8 md:py-5 md:px-10 rounded-2xl md:rounded-[2rem] shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 md:gap-3 text-lg md:text-xl"><Share2 className="w-5 h-5 md:w-6 md:h-6" /> ZAFERİ PAYLAŞ</button>
             <button onClick={() => { playSound('pop'); window.location.reload(); }} className="w-full sm:w-auto bg-slate-800 border-2 border-slate-700 text-white font-black py-4 px-8 md:py-5 md:px-10 rounded-2xl md:rounded-[2rem] shadow-xl hover:bg-slate-700 hover:scale-105 transition-all flex items-center justify-center gap-2 md:gap-3 text-lg md:text-xl">YENİDEN OYNA</button>
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
        await signInAnonymously(auth);
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
      settings: { rounds: profile.rounds || 10, categories: DEFAULT_CATEGORIES },
      players: {
        [user.uid]: { id: user.uid, name: profile.name, avatar: profile.avatar, age: parseInt(profile.age), score: 0, isBot: false }
      },
      currentRound: 0,
      rounds: [],
      createdAt: Date.now()
    };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId), newRoom);
      setRoom(newRoom);
    } catch (e) { alert("Oda oluşturulamadı."); }
  };

  const handleJoinRoom = async (roomId, profile) => {
    if (!user) return;
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) { alert("Oda bulunamadı!"); return; }
      if (snap.data().status !== 'lobby') { alert("Oyun zaten başlamış!"); return; }
      
      await updateDoc(roomRef, {
        [`players.${user.uid}`]: { id: user.uid, name: profile.name, avatar: profile.avatar, age: parseInt(profile.age), score: 0, isBot: false }
      });
      setRoom({ id: roomId }); 
    } catch (e) { alert("Odaya katılınamadı."); }
  };

  const handleAddBot = async () => {
    if (!user || room.hostId !== user.uid) return;
    const botId = 'bot_' + Math.random().toString(36).substring(7);
    const botNames = ["Robot Rıza", "Cyborg Cem", "AI Ayşe", "Bot Berk", "Terminatör"];
    
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.id);
    await updateDoc(roomRef, {
      [`players.${botId}`]: { id: botId, name: botNames[Math.floor(Math.random() * botNames.length)], avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)], age: 99, score: 0, isBot: true }
    });
  };

  const getDynamicTime = (players) => {
     const ages = Object.values(players).filter(p => !p.isBot).map(p => p.age || 25);
     const minAge = Math.min(...ages);
     if (minAge <= 9) return 90; 
     if (minAge <= 14) return 60; 
     return 45; 
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
     } catch (e) { console.error("Submit error:", e); }
  };

  const handleNextRound = async () => {
     if (!user || room.hostId !== user.uid) return;
     const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.id);
     const isLastRound = room.currentRound + 1 >= room.settings.rounds;
     
     if (isLastRound) {
        try {
           const snap = await getDoc(roomRef);
           if (snap.exists()) {
              const data = snap.data();
              const updatePromises = Object.values(data.players).filter(p => !p.isBot).map(async (p) => {
                 const lbRef = doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', p.id);
                 const lbSnap = await getDoc(lbRef);
                 const newTotal = p.score + (lbSnap.exists() ? (lbSnap.data().totalScore || 0) : 0);
                 await setDoc(lbRef, { id: p.id, name: p.name, avatar: p.avatar, totalScore: newTotal });
              });
              await Promise.all(updatePromises);
           }
        } catch(e) { console.error("Leaderboard Error:", e); }

        await updateDoc(roomRef, { status: 'finished' });
     } else {
        const snap = await getDoc(roomRef);
        if(snap.exists()) {
           const data = snap.data();
           const usedLetters = data.rounds.map(r => r.letter);
           
           const durationSecs = getDynamicTime(data.players);

           const newRound = { letter: getUnusedLetter(usedLetters), durationSecs, answers: {}, scores: {} };
           await updateDoc(roomRef, { status: 'playing', currentRound: data.currentRound + 1, rounds: [...data.rounds, newRound] });
        }
     }
  };

  const calculateRoundScores = (allAnswers, categories) => {
     const scores = {};
     let fastestUser = null;
     let minTime = Infinity;

     for (const uid of Object.keys(allAnswers)) {
        scores[uid] = { points: 0, breakDown: {} };
        if (allAnswers[uid].timeTaken < minTime && Object.values(allAnswers[uid].answers).some(a => a.isValid)) {
           minTime = allAnswers[uid].timeTaken; fastestUser = uid;
        }
     }

     for (const cat of categories) {
        const wordFrequency = {};
        
        for (const uid of Object.keys(allAnswers)) {
           const ansObj = allAnswers[uid].answers[cat];
           
           if (!ansObj || !ansObj.word || ansObj.word.trim() === "") {
               scores[uid].points -= 1;
           } else if (!ansObj.isValid) {
               scores[uid].points -= 2;
           } else {
               const normalizedWord = ansObj.word.toLocaleLowerCase('tr-TR').trim();
               wordFrequency[normalizedWord] = (wordFrequency[normalizedWord] || 0) + 1;
           }
        }
        
        for (const uid of Object.keys(allAnswers)) {
           const ansObj = allAnswers[uid].answers[cat];
           if (ansObj && ansObj.isValid && ansObj.word.trim() !== "") {
              const freq = wordFrequency[ansObj.word.toLocaleLowerCase('tr-TR').trim()];
              if (freq === 1) { 
                 scores[uid].points += 5;
                 allAnswers[uid].answers[cat].isUnique = true; 
              } 
              else if (freq > 1) { 
                 scores[uid].points += 3;
                 allAnswers[uid].answers[cat].isUnique = false; 
              }
           }
        }
     }
     
     if (fastestUser && scores[fastestUser]) { 
         allAnswers[fastestUser].isFastest = true; 
         scores[fastestUser].points += 2; 
     }
     
     return scores;
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative"><RefreshCw className="w-16 h-16 animate-spin text-cyan-500 mb-4" /></div>;

  if (showLeaderboard && !room) {
     return (
        <>
          <TopBar isMuted={isMuted} toggleMute={toggleMute} />
          <LeaderboardScreen onBack={() => setShowLeaderboard(false)} />
        </>
     )
  }

  return (
     <>
        <TopBar isMuted={isMuted} toggleMute={toggleMute} />
        {!room && <SetupScreen onJoin={handleJoinRoom} onCreate={handleCreateRoom} onShowLeaderboard={() => setShowLeaderboard(true)} />}
        {room?.status === 'lobby' && <LobbyScreen room={room} user={user} onStartGame={handleStartGame} onLeave={() => setRoom(null)} onAddBot={handleAddBot} />}
        {room?.status === 'playing' && <GameScreen room={room} user={user} onSubmitAnswers={handleSubmitAnswers} />}
        {room?.status === 'results' && <RoundResultsScreen room={room} user={user} onNextRound={handleNextRound} />}
        {room?.status === 'finished' && <FinalScoreScreen room={room} user={user} />}
     </>
  )
}
