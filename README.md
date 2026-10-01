# Lekplatskontroll

En statisk webbapp för kontroll av lekplatser, anpassad för mobiltelefoner.
Prototypen innehåller exempellekplatser, element och kontrollistor från Excel
samt ett obligatoriskt fritextfält för besiktningsmannens namn. Namnet sparas i webbläsaren.

## Så använder du appen

1. **Skriv ditt namn** i fältet Besiktningsman.
2. **Välj en lekplats** och öppna det element du vill kontrollera, till exempel Gångbro eller Lekhus.
3. **Gå igenom kontrollpunkterna.** Välj OK om allt är i ordning. Välj Anmärkning om du hittar ett problem och beskriv vad som är fel. En anmärkning måste ha en beskrivning för att kontrollpunkten ska räknas som klar.
4. **Avsluta textredigeringen** med Klar eller genom att trycka utanför textfältet. Du kan öppna fältet igen med Ändra. Dina svar sparas automatiskt, även om du inte trycker Klar.
5. **Tryck Stäng** i elementets formulär för att gå tillbaka till lekplatsens översikt och välja nästa element. Tryck Stäng på översikten för att återgå till lekplatslistan. Du kan också använda bakåtpilen. Dina svar sparas automatiskt, och du kan fortsätta senare i samma webbläsare på samma telefon eller dator.
6. **Skicka rapporten när alla kontrollpunkter är klara.** Tryck Skicka rapport på lekplatsens översikt, läs igenom rapporten och tryck Skicka rapport i förhandsgranskningen. Rapporten öppnas i din mejlapp, där du behöver trycka Skicka för att mejlet ska skickas.
7. **Gå tillbaka till appen** och tryck Bekräfta att rapporten är skickad när du har skickat mejlet. Lekplatsen får då status Rapport skickad. Att bara öppna mejlappen räknas inte som att rapporten är skickad.

### Vad betyder statusen?

- **Ej påbörjad:** inga svar har registrerats.
- **Påbörjad 2/5:** två av fem kontrollpunkter är klara. Resten behöver besvaras eller få en beskrivning av anmärkningen.
- **Klar 5/5:** alla fem kontrollpunkter är besvarade. Det kan fortfarande finnas anmärkningar – klar betyder att kontrollen är ifylld.
- **Rapport skickad:** du har bekräftat att rapporten har skickats från mejlappen.

Siffrorna visar kontrollpunkter, inte antal element. Inne i ett element visas dess
progress högst upp. På lekplatsens översikt visas den sammanlagda progressen längst ned.

### Fortsätta eller börja om

Öppna samma lekplats och element för att fortsätta där du slutade. Om du
vill börja om kan du välja Rensa på lekplatsens översikt.
Alla svar och tidigare kontroller för den lekplatsen tas bort från appen efter
bekräftelse, och lekplatsen blir ej påbörjad. Redan skickade mejl påverkas inte.

Om checklistan ändras innan rapporten är skickad kan nya eller ändrade punkter
behöva besvaras när du nästa gång öppnar appen eller går tillbaka till
lekplatslistan. Svar på oförändrade punkter finns kvar. Redan rapporterade
kontroller ändras inte av en ny checklista.

### Inställningar och rensning

Tryck på kugghjulet i lekplatslistan för att ändra mottagande e-postadress.
Här finns också Rensa inspektionsdata. Du får bekräfta innan pågående och
slutförda inspektioner, historik och ditt namn tas bort. Mottagaradressen behålls.
Rapporter som redan skickats med mejl påverkas inte.

Utan internet kan du använda appen om den tidigare har laddats färdigt med
internetanslutning. Appen visar då att ett sparat underlag används. För att skicka
mejl behöver du internet. Om rapporten inte går att öppna i mejlappen kan du
välja Kopiera rapporttext och klistra in den i ett mejl själv.

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
Även element identifieras med sina namn; ett namnbyte skapar ett nytt element.
Appen hämtar Excel-underlaget utan HTTP-cache när den öppnas och när användaren
återvänder till lekplatslistan. Inne i en lekplats hålls underlaget stabilt.
Kontroller som ännu inte har markerats som rapporterade uppdateras då från Excel:
svar behålls för samma elementnamn och kontrolltext, även vid omsortering.
Ändrade eller borttagna kontrolltexter förlorar sina svar; nya element och kontroller
läggs till obesvarade. Inledande och avslutande blanksteg ignoreras vid textmatchning.
Rapporterade kontroller behåller sitt tidigare underlag och sina svar.
En ny kontroll använder alltid det senast inlästa underlaget.

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

För att återställa appen vid testning, öppna den med `?reset=1`, till exempel
`http://localhost:8080/?reset=1`. Detta tar endast bort appens två localStorage-poster:
kontroller (inklusive historik och checklistkopior) och inställningar (inklusive namn).
Övriga appar, cookies och webbläsarens cache påverkas inte. Parametern tas bort
från adressen efter återställningen så att nästa omladdning inte rensar igen.

Webbläsarens bakåt- och framåtknappar följer lekplatslistan, lekplatsöversikten
och elementets formulär. Vid omladdning återställs den aktuella vyn. Tillbaka från ett formulär återgår till lekplatsöversikten.
Bakåt från lekplatslistan kan lämna webbplatsen som vanligt.

Svar och beskrivningar av anmärkningar sparas löpande som utkast i localStorage.
Utkastet finns kvar om du laddar om sidan eller lämnar formuläret. Ett element
räknas som klart först när alla kontroller är besvarade, varje anmärkning
har en beskrivning. Ingen separat sparknapp behövs.

Anmärkningar öppnas i ett textfält. Med giltig text avslutas redigeringen genom
Klar eller när fokus lämnar redigeringsområdet. Samma textfält blir då skrivskyddat
med grå bakgrund och knappen Ändra, utan att ändra storlek. Tomma beskrivningar stannar öppna med en uppmaning att
fylla i text. Svaren sparas och räknas i progressen direkt, även utan att trycka Klar.

Besiktningsmannen registreras vid det första svaret. Rapportens datum är
tidpunkten för den senaste ändringen av kontrollen. Om du ändrar besiktningsmannens namn
gäller valet för nya kontroller. Ett namn måste anges innan en kontroll kan påbörjas.

När alla element är klara blir rapporten tillgänglig. En lekplats räknas som
rapporterad först när användaren bekräftar att mejlet har skickats. Att öppna
mejlappen bekräftar inte att mejlet har levererats. Rapporten kan också kopieras
till urklipp.

Efter att en rapport har markerats som skickad kan en ny kontroll startas från lekplatsöversikten. Då sparas den föregående
rapporten som vanlig text i lekplatsens historik och de aktuella svaren töms.
Historik och utkast finns endast i den här webbläsaren. De tas bort om du rensar
webbläsardata eller använder appens återställningsfunktion.

## Användning utan internet och rapporter via mejl

På HTTPS (eller localhost) sparar en service worker appen i webbläsarens cache
efter det första besöket med internetanslutning. Låt installationen bli klar
innan du förlitar dig på att appen kan öppnas utan internet. Detta stöd gäller
inte när du öppnar filen direkt eller använder HTTP via datorns lokala IP-adress
på telefonen.

Excel-underlaget sparas separat för användning utan internet först efter att hela
arbetsboken har validerats. Utan anslutning används den sparade kopian och appen
visar detta i lekplatslistan. En ogiltig uppdatering ändrar inte befintliga svar.

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
