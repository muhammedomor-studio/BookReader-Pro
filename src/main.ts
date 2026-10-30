import './style.css';
import { AdMobManager } from './admob.ts';
import { TTSEngine } from './tts.ts';

declare const pdfjsLib: any;
declare const St: any;

interface BookRecord {
  id?: number;
  title: string;
  totalPages: number;
  currentPage: number;
  coverUrl: string;
  pdfBytes: ArrayBuffer;
}

const tts = new TTSEngine();
let db: IDBDatabase;
let currentBook: BookRecord | null = null;
let pdfDoc: any = null;
let pageFlipInstance: any = null;

async function initDB(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.open('BookReaderTS_DB', 1);
    req.onupgradeneeded = (e: any) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('books')) {
        d.createObjectStore('books', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e: any) => {
      db = e.target.result;
      resolve();
    };
  });
}

async function loadBooks(): Promise<void> {
  const tx = db.transaction('books', 'readonly');
  const store = tx.objectStore('books');
  store.getAll().onsuccess = (e: any) => {
    const books: BookRecord[] = e.target.result || [];
    renderShelf(books);
  };
}

function renderShelf(books: BookRecord[]): void {
  const grid = document.getElementById('books-grid')!;
  grid.innerHTML = books.map((b) => `
    <div class="book-card glass">
      <div class="cover-box" onclick="window.openBook(${b.id})">
        <img src="${b.coverUrl}" alt="${b.title}" />
      </div>
      <div style="padding:10px;">
        <h4 style="font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.title}</h4>
        <p style="font-size:10px; color:var(--text-muted);">Page ${b.currentPage} of ${b.totalPages}</p>
      </div>
    </div>
  `).join('');
}

(window as any).openBook = async (id: number) => {
  const tx = db.transaction('books', 'readonly');
  tx.objectStore('books').get(id).onsuccess = async (e: any) => {
    currentBook = e.target.result;
    if (!currentBook) return;

    document.getElementById('reader-title')!.textContent = currentBook.title;
    document.getElementById('reader-modal')!.classList.remove('hidden');

    pdfDoc = await pdfjsLib.getDocument({ data: currentBook.pdfBytes.slice(0) }).promise;
    initFlipbook(currentBook.currentPage || 1);
  };
};

async function initFlipbook(startPage: number): Promise<void> {
  const mount = document.getElementById('flipbook-mount')!;
  mount.innerHTML = '<div id="flipbook-root"></div>';
  const root = document.getElementById('flipbook-root')!;

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pageDiv = document.createElement('div');
    pageDiv.className = `page-wrapper page-${i}`;
    pageDiv.innerHTML = `<canvas id="canvas-page-${i}"></canvas>`;
    root.appendChild(pageDiv);
  }

  pageFlipInstance = new St.PageFlip(root, {
    width: window.innerWidth < 768 ? window.innerWidth * 0.95 : 440,
    height: window.innerHeight < 768 ? window.innerHeight * 0.76 : 640,
    size: 'stretch',
    showCover: true
  });

  pageFlipInstance.loadFromHTML(document.querySelectorAll('.page-wrapper'));

  const renderPage = async (num: number) => {
    if (num < 1 || num > pdfDoc.numPages) return;
    const cvs = document.getElementById(`canvas-page-${num}`) as HTMLCanvasElement;
    if (!cvs || cvs.dataset.loaded) return;

    const page = await pdfDoc.getPage(num);
    const vp = page.getViewport({ scale: 2.0 });
    cvs.width = vp.width;
    cvs.height = vp.height;
    await page.render({ canvasContext: cvs.getContext('2d'), viewport: vp }).promise;
    cvs.dataset.loaded = 'true';
  };

  pageFlipInstance.flip(startPage - 1);
  renderPage(startPage);

  pageFlipInstance.on('flip', (e: any) => {
    const p = e.data + 1;
    renderPage(p);
    document.getElementById('reader-pages-indicator')!.textContent = `Page ${p} of ${pdfDoc.numPages}`;
    if (currentBook) {
      currentBook.currentPage = p;
      const tx = db.transaction('books', 'readwrite');
      tx.objectStore('books').put(currentBook);
    }
  });
}

function closeReader(): void {
  tts.stop();
  if (pdfDoc) pdfDoc.destroy();
  document.getElementById('reader-modal')!.classList.add('hidden');
  
  // বই পড়া শেষ হওয়া মাত্রই AdMob Interstitial বিজ্ঞাপন প্রদর্শন করা হবে
  AdMobManager.showInterstitial();
  loadBooks();
}

window.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  await AdMobManager.initialize();
  await loadBooks();

  document.getElementById('btn-close-reader')!.onclick = closeReader;
  document.getElementById('btn-add-modal')!.onclick = () => {
    document.getElementById('upload-modal')!.classList.remove('hidden');
  };
  document.getElementById('btn-cancel-upload')!.onclick = () => {
    document.getElementById('upload-modal')!.classList.add('hidden');
  };

  document.getElementById('btn-save-pdf')!.onclick = async () => {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const titleInput = document.getElementById('title-input') as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    const bytes = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    const page1 = await doc.getPage(1);
    const vp = page1.getViewport({ scale: 0.5 });
    const c = document.createElement('canvas');
    c.width = vp.width; c.height = vp.height;
    await page1.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;

    const book: BookRecord = {
      title: titleInput.value || file.name.replace('.pdf', ''),
      totalPages: doc.numPages,
      currentPage: 1,
      coverUrl: c.toDataURL('image/jpeg', 0.8),
      pdfBytes: bytes
    };

    const tx = db.transaction('books', 'readwrite');
    tx.objectStore('books').add(book).onsuccess = () => {
      document.getElementById('upload-modal')!.classList.add('hidden');
      loadBooks();
    };
  };

  // Text-To-Speech (TTS)
  document.getElementById('reader-tts-btn')!.onclick = async () => {
    if (tts.isSpeaking) {
      tts.pauseResume();
      return;
    }
    const cur = pageFlipInstance.getCurrentPageIndex() + 1;
    const page = await pdfDoc.getPage(cur);
    const content = await page.getTextContent();
    const text = content.items.map((i: any) => i.str).join(' ');
    tts.speak(text);
  };
});
