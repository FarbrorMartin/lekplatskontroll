# Lekplatskontroll

En statisk webbapp för kontroll av lekplatser, anpassad för mobiltelefoner.
Prototypen innehåller fyra exempellekplatser, element och kontrollistor från Excel
samt ett fritextfält för besiktningsmannens namn. Namnet sparas i webbläsaren.

## Konfiguration i Excel

Excel-filen är huvudunderlaget. Redigera och spara **`data/lekplatskontroll.xlsx`**
direkt och publicera den uppdaterade filen tillsammans med appen. Ingen export
till CSV eller konvertering till JSON behövs. Arbetsboken har två flikar:

- **Lekplatsmatris**: kolumnen `Lekplats`, följd av en kolumn för varje element. Kolumnerna `Område` och `Adress` kan också läggas till. Markera med X vilka element som finns på varje lekplats och lämna övriga celler tomma. Ingen ID-kolumn behövs.
- **Element**: elementens namn på rad 1 och en lista med kontroller under varje namn. Varje element har en egen kontrollista. Samma formulering kan användas i flera kolumner. Tomma celler hoppas över och kontrollerna visas i ordning uppifrån och ned.

Använd X (stor eller liten bokstav) endast i Lekplatsmatris. I Element skriver du
själva kontrollerna. Listorna får vara olika långa. Ersätt exempelnamnen,
kontrollerna och X-markeringarna med det verkliga underlaget.
Flikarnas ordning spelar ingen roll, men behåll fliknamnen och kolumnrubrikerna
på rad 1. Formateringen kan ändras fritt. Tomma formaterade rader och kolumner
efter innehållet ignoreras.
Appen visar fel om flikar saknas, markeringar är ogiltiga, namn är dubblerade,
element inte stämmer överens mellan flikarna, kontrollistor är tomma, samma
kontroll förekommer flera gånger inom ett element eller Excel-celler innehåller
fel. Varje lekplats måste ha minst ett element och varje element minst en kontroll.

Lägg till lekplatser som nya rader med unika namn. Lägg till kontroller direkt
under elementets rubrik; kontroller behöver inga ID:n. För att lägga till ett
element skapar du en kolumn med samma rubrik i båda flikarna, skriver dess
kontroller och markerar vilka lekplatser som har elementet.
Spara som `.xlsx`, inte det äldre formatet `.xls`.

Lekplatsens namn identifierar dess sparade kontroller. Sortering i Excel påverkar
inte sparade svar, men ett namnbyte gör att lekplatsen behandlas som en ny lekplats.
Även element identifieras med sina namn; ett namnbyte skapar ett nytt element för
kommande kontroller. Påbörjade kontroller behåller en kopia av lekplatsens element
och kontrollistor. Ändringar och omsorteringar i Excel påverkar därför endast nya
kontroller.

Exempel på element är Gångbro, Spång, Skulptur och Lekhus. Appen måste köras via
en webbserver; att öppna `index.html` direkt från datorn fungerar inte eftersom
Excel-filen då inte kan hämtas. Appen läser sparade cellvärden och beräknar inte
formler. Om du använder formler måste du låta Excel beräkna dem och spara filen
innan du publicerar den.

Excel-läsaren SheetJS mini (0.20.3, Apache 2.0) ingår i `vendor/`. Den är
279 523 byte okomprimerad och cirka 86 859 byte med gzip-komprimering.
Ingen npm-installation, extern CDN, byggprocess eller backend behövs för att
publicera appen på GitHub Pages, Firebase Hosting eller annan statisk webbhosting.

## Kör lokalt

Starta en webbserver från appens katalog med `python -m http.server 8080` och
öppna sedan `http://localhost:8080`. För att testa på en telefon i samma
Wi-Fi-nätverk använder du datorns IP-adress i stället för localhost.
Publicera appen via HTTPS för att kunna använda den utan internet på telefoner.

## Sparade kontroller

Webbläsarens bakåt- och framåtknappar följer lekplatslistan, lekplatsöversikten
och elementets formulär. Vid omladdning återställs den aktuella vyn. När ett
formulär sparas återgår appen till den befintliga översikten i webbläsarhistoriken.
Bakåt från lekplatslistan kan lämna webbplatsen som vanligt.

Svar och beskrivningar av anmärkningar sparas löpande som utkast i localStorage.
Utkastet finns kvar om du laddar om sidan eller lämnar formuläret. Ett element
räknas som klart först när alla kontroller är besvarade, varje anmärkning har
en beskrivning och formuläret har sparats.

Besiktningsmannen registreras vid det första svaret. Rapportens datum är
tidpunkten för den senaste ändringen av kontrollen. Om du ändrar besiktningsmannens namn
gäller valet för nya kontroller. Poster som saknar besiktningsman märks med
att uppgiften inte är registrerad.

När alla element är klara blir rapporten tillgänglig. En lekplats räknas som
rapporterad först när användaren bekräftar att mejlet har skickats. Att öppna
mejlappen bekräftar inte att mejlet har levererats. Rapporten kan också kopieras
till urklipp.

En ny kontroll kan startas från lekplatsöversikten. Då sparas den föregående
rapporten som vanlig text i lekplatsens historik och de aktuella svaren töms.
Historik och utkast finns endast i den här webbläsaren. De tas bort om du rensar
webbläsardata eller använder appens återställningsfunktion.

## Användning utan internet och rapporter via mejl

På HTTPS (eller localhost) sparar en service worker appen i webbläsarens cache
efter det första besöket med internetanslutning. Låt installationen bli klar
innan du förlitar dig på att appen kan öppnas utan internet. Detta stöd gäller
inte när du öppnar filen direkt eller använder HTTP via datorns lokala IP-adress
på telefonen.

För att skicka mejl behövs fortfarande en mejlapp och internetanslutning.
Långa rapporter via `mailto:` bör testas på de telefoner och mejlappar som ska
användas. Om överföringen till mejlappen inte fungerar kan rapporten kopieras
till urklipp.

## Verifiering

Kör `node test-app.cjs` för att kontrollera återställning av utkast,
besiktningsman, obligatoriska beskrivningar, säker visning av text,
rapporthistorik och hantering av lagringsfel. Kör `node --check app.js` och
`node --check sw.js` för syntaxkontroll.

Kör `node test-workbook.cjs` för att testa läsning av XLSX-filer och validering
av Excel-underlaget.

De automatiska testerna använder en simulerad DOM. Mobilens layout och
överföringen till den vanliga mejlappen behöver testas på riktiga enheter.
