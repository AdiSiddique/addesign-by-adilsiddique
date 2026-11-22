ADDESIGN SITE - QUICK GUIDE
===========================

PEHLI BAAR (sirf ek dafa)
  1. Is folder ko extract karo, terminal isi folder mein kholo
  2. npm install
  3. Purane project ka hidden ".vercel" folder is folder mein copy kar do
     (ya:  vercel link  -> existing project "addesign-porfolio" select karo)

ROZ KA KAAM (naya design upload karna)
  1. content/<category>/ ke andar naya folder banao, e.g.
       content/adobe-stock/2026-11-14-blue-waves/
  2. Us folder mein daalo:
       - images (01.jpg, 02.jpg ...)   <- slider isi order mein chalega
       - info.txt  (template: content/_TEMPLATE-info.txt)
       - optional: .zip/.ai/.eps  (free download button khud ban jata hai)
  3. Terminal mein:   npm run go
     (ye images ko optimize karta hai aur site deploy kar deta hai)

Sirf preview dekhna ho:  npm run dev   -> localhost link kholo

CATEGORIES (content/ ke andar folder names)
  illustrations, freepik, adobe-stock, shutterstock, pinterest, clients, premium

SETTINGS BADALNE KE LIYE:  public/js/config.js
  tagline, Linktree, aur apne Freepik/Adobe/Shutterstock/Pinterest profile links

NOTES
  - Sample folders (sample-...) delete kar do, phir npm run go
  - Premium folder ki files public nahi hoti. "buy:" mein Gumroad/Payhip link do
  - Bohat bari files (50MB+) Google Drive pe rakho aur info.txt mein "download:" link do
  - URL tricks: /illustrations aur /illustrations/<folder-name> direct links kaam karte hain
