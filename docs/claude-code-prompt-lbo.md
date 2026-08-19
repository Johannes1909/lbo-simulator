# Build-Prompt für Claude Code — LBO Simulator

> **Anwendung:** Leeren Ordner anlegen, `claude` starten, diesen Text vollständig einfügen.
> Nach jedem Meilenstein prüfen, committen, dann `weiter mit Meilenstein N` schreiben.

---

## Rolle und Auftrag

Du baust mit mir zusammen einen **LBO-Simulator**: ein Web-Tool, das die Mechanik eines Leveraged Buyouts vollständig abbildet und dabei so anschaulich bleibt, dass ein Private-Equity-Investor es benutzen würde, um einem Kunden ohne Finance-Hintergrund zu erklären, wie sein Geld arbeitet.

Zwei Qualitätsmassstäbe, an denen alles gemessen wird:

1. **Rechnerische Korrektheit.** Ein Analyst, der eine Zahl mit seinem eigenen Excel-Modell nachrechnet, muss dasselbe Ergebnis bekommen. Jede Abweichung macht das gesamte Projekt wertlos. Deshalb: Modelllogik strikt getrennt von der Oberfläche, vollständig getestet, jede Annahme im Code dokumentiert.
2. **Erklärkraft.** Wer den Regler für den Fremdkapitalanteil bewegt, muss im selben Moment sehen, *warum* die Rendite steigt und wo das Risiko sitzt. Zahlen ohne visuelle Konsequenz sind gescheitert.

Ich bin Finance-Student, kein erfahrener Entwickler. Erkläre mir bei jedem Meilenstein kurz, was du gebaut hast und warum du technische Entscheidungen so getroffen hast. Schreibe keinen Code, den du mir nicht in drei Sätzen erklären kannst.

---

## Technischer Rahmen

- **Vite + React + TypeScript**, strict mode an
- **Tailwind CSS** für Layout, Design-Tokens als CSS-Variablen (Palette an einer Stelle änderbar)
- **Zustand** (die Bibliothek) für den Modellzustand — kein Redux, kein Context-Wildwuchs
- **Vitest** für Tests
- **Charts von Hand als SVG-Komponenten**, keine Chart-Bibliothek. Grund: volle Kontrolle über die Optik, kein Bibliotheks-Look, kleines Bundle
- **Kein Backend, keine Datenbank, keine Anmeldung.** Der komplette Deal-Zustand wird komprimiert in die URL kodiert (lz-string, base64url). Ein Link enthält den ganzen Fall
- Deployment auf **Vercel**, Repository auf GitHub
- **Sprache der Oberfläche: Englisch** (Zielgruppe sind Banker und internationale Recruiter). Alle sichtbaren Texte in `src/i18n/en.ts` sammeln, damit später eine deutsche Fassung ohne Umbau möglich ist. Code, Kommentare und Commits auf Englisch

### Projektstruktur

```
src/
  model/            reine Rechenlogik, keine React-Importe, keine Seiteneffekte
    types.ts
    sourcesUses.ts
    operating.ts
    debt.ts
    returns.ts
    analytics.ts
    engine.ts       orchestriert alles, exportiert runModel(inputs): ModelOutput
    __tests__/
  state/            Zustand-Store, URL-Kodierung, Szenarienverwaltung
  ui/               Komponenten
    controls/       Regler, Zahlenfelder, Tabelleneingaben
    charts/         SVG-Charts
    panels/         Ergebnisbereiche
  presentation/     Präsentationsmodus
  export/           Excel- und PDF-Ausgabe
  i18n/
  pages/
```

**Harte Regel:** Nichts unter `src/model/` importiert je aus React oder der UI. Die Modelllogik muss in einem Node-Skript ohne Browser lauffähig sein.

---

## Das Finanzmodell

Dies ist der Kern. Baue es vollständig und in dieser Reihenfolge.

### Eingaben — Grundsatz: alles überschreibbar

Jeder Parameter hat einen sinnvollen Standardwert und ist einzeln einstellbar. Wo eine Grösse über die Zeit läuft (Wachstum, Marge, Capex), gibt es **zwei Eingabemodi**: ein einzelner Wert für alle Jahre, oder eine Jahrestabelle mit individuellen Werten pro Jahr. Der Wechsel darf die bisherige Eingabe nicht verwerfen.

**Transaktion**
- Bewertungsbasis: EBITDA oder Umsatz (Multiple entsprechend)
- Entry-Multiple, LTM-EBITDA bzw. -Umsatz
- Bestehende Nettoverschuldung des Zielunternehmens (wird abgelöst)
- Transaktionskosten: M&A-Beratung, Rechtsberatung, Due Diligence (je % oder absolut)
- Finanzierungskosten: Arrangierungsgebühr je Tranche, OID
- Mindestliquidität, die nach Abschluss in der Firma bleibt
- Abschlussdatum, Haltedauer in Jahren (1–10), Jahresende bzw. Stichtag

**Mittelherkunft — beliebig viele Schuldentranchen, jede mit:**
- Bezeichnung und Rang (bestimmt die Reihenfolge im Tilgungswasserfall)
- Betrag, wahlweise absolut oder als Vielfaches des EBITDA
- Zins: fest, oder variabel als Referenzsatz plus Marge, mit optionalem Zinsfloor
- Referenzsatzkurve über die Laufzeit einstellbar (Forward-Kurve von Hand)
- Zinsart: bar zahlbar oder PIK (kapitalisierend) oder Mischform
- Planmässige Tilgung: Prozent p.a. des Ursprungsbetrags, oder endfällig
- Teilnahme am Cash Sweep: ja/nein, anteilig
- Vorfälligkeitsentschädigung in den ersten Jahren (Call Protection)
- Endfälligkeit

**Vorbelegung** mit einer realistischen europäischen Mid-Market-Struktur: Term Loan A (amortisierend, 5 % p.a.), Term Loan B (endfällig), revolvierende Kreditlinie (nur bei Bedarf gezogen, Bereitstellungsprovision auf den ungenutzten Teil), Mezzanine mit PIK-Anteil, Verkäuferdarlehen.

**Eigenkapitalseite**
- Sponsoren-Eigenkapital (ergibt sich als Restgrösse, muss aber auch fixierbar sein)
- Management-Rollover (Anteil des Managements, das reinvestiert)
- Sweet Equity: Anteil am Eigenkapital, den das Management zu Vorzugsbedingungen erhält
- Optional eine Ratchet-Stufe: ab einer Renditeschwelle steigt der Management-Anteil

**Operatives Modell**
- Umsatz Jahr 0, Umsatzwachstum p.a. (je Jahr überschreibbar)
- EBITDA-Marge (je Jahr überschreibbar) — erlaubt Margenausweitung als eigenen Werttreiber
- Abschreibungen als % vom Umsatz
- Capex als % vom Umsatz, getrennt in Erhaltungs- und Wachstums-Capex
- Working Capital wahlweise als % vom Umsatz **oder** über Kennzahlen: Debitoren-, Lager- und Kreditorenlaufzeit in Tagen
- Steuersatz, Verlustvorträge mit Vortragsfähigkeit
- Einmalige Kosten (Restrukturierung, Integration) pro Jahr eingebbar

**Ausschüttungen während der Haltedauer**
- Dividenden-Rekapitalisierung: in Jahr X zusätzliche Schuld aufnehmen und ausschütten
- Ordentliche Ausschüttung als % des freien Cashflows

**Exit**
- Exit-Multiple, alternativ Exit-Multiple gleich Entry-Multiple erzwingen
- Exit-Jahr (auch vor Ende der Haltedauer prüfbar)
- Verkaufskosten in %
- Bewertungsbasis für den Exit: letztes oder erwartetes nächstes EBITDA

### Rechenlogik

**1. Sources & Uses.** Mittelverwendung: Kaufpreis des Eigenkapitals, Ablösung Altschulden, Transaktions- und Finanzierungskosten, Mindestliquidität. Mittelherkunft: Summe aller Tranchen, Rollover, Verkäuferdarlehen, Sponsoren-Eigenkapital als Restgrösse. **Beide Seiten müssen auf den Rappen übereinstimmen** — schreibe dafür einen Test, der bei Abweichung fehlschlägt.

**2. Eröffnungsbilanz** nach Abschluss, inklusive Goodwill.

**3. Jahresrechnung je Periode:** Umsatz → EBITDA → Abschreibungen → EBIT → Zinsaufwand (bar und PIK getrennt) → EBT → Steuern (unter Berücksichtigung von Verlustvorträgen) → Jahresergebnis.

**4. Cashflow:** EBITDA minus Barsteuern, Barzinsen, Capex, Veränderung Working Capital, Einmalkosten = freier Cashflow vor Schuldendienst.

**5. Tilgungswasserfall**, strikt nach Rang:
   a) Planmässige Tilgungen bedienen
   b) Reicht der Cashflow nicht: revolvierende Linie ziehen, bis zum Limit; danach Liquiditätsengpass ausweisen und deutlich kennzeichnen
   c) Überschuss nach Mindestliquidität: Cash Sweep, nach Rang und nach eingestellter Beteiligungsquote der Tranchen
   d) PIK-Zinsen kapitalisieren auf den Tranchenbestand

**6. Zirkularität.** Zinsen hängen vom Schuldenstand ab, der Schuldenstand von der Tilgung, die Tilgung vom Cashflow nach Zinsen. Löse das durch **iterative Annäherung auf Basis durchschnittlicher Salden**: pro Periode maximal 50 Durchläufe, Abbruch bei einer Änderung unter 0,001. Konvergiert es nicht, gib das im Ergebnisobjekt als Warnung zurück, statt still eine falsche Zahl zu liefern. Baue einen Schalter "Zinsen auf Anfangsbestand" für alle, die es einfacher wollen — dokumentiere den Unterschied in der Methodenseite.

**7. Kreditkennzahlen je Jahr:** Nettoverschuldung zu EBITDA, Senior-Verschuldung zu EBITDA, Zinsdeckung (EBITDA zu Barzinsen), Schuldendienstdeckung (freier Cashflow zu Zins plus Tilgung), Free-Cashflow-Rendite. Frei einstellbare Covenant-Grenzen je Kennzahl, Ausweis des Abstands zur Grenze in Prozent, klare Kennzeichnung eines Bruchs.

**8. Rückflüsse und Rendite.** Baue eine **echte Zahlungsreihe** des Eigenkapitals: Auszahlung in t0, Zwischenausschüttungen und Rekaps zum jeweiligen Zeitpunkt, Exit-Erlös. IRR über **Bisektionsverfahren** im Bereich −99 % bis +1000 %, Toleranz 1e-7. Keine Wurzelformel — die ist falsch, sobald Zwischenflüsse existieren. Zusätzlich: Money Multiple, und die Aufteilung des Exit-Erlöses auf Sponsor, Management-Rollover, Sweet Equity und Verkäuferdarlehen mit **je eigener IRR und eigenem Multiple**.

**9. Wertschöpfungsbrücke.** Zerlege den Zuwachs des Eigenkapitalwerts in: Umsatzwachstum, Margenveränderung, Multiple-Veränderung, Entschuldung, Zwischenausschüttungen. **Die Summe muss exakt der Differenz zwischen Eintritts- und Austritts-Eigenkapital entsprechen** — auch das als Test absichern.

**10. Analysen.**
- Zweidimensionale Sensitivität mit **frei wählbaren Achsen** (jeder numerische Parameter gegen jeden), Zielgrösse wählbar zwischen IRR, Multiple und Exit-Eigenkapital
- Zielwertsuche: "Welches Exit-Multiple braucht es für 20 % IRR?" und "Wie viel Fremdkapital trägt der Deal bei einer Zinsdeckung von mindestens 2,5×?"
- Renditematrix nach Exit-Jahr: was hätte ein Ausstieg in Jahr 1 bis 10 gebracht
- Belastungstest mit einem Klick: Rezessionsszenario (Umsatzrückgang, Margendruck, Zinsanstieg) auf die aktuellen Annahmen angewendet

---

## Oberfläche

### Zwei Modi auf demselben Modell

Umschalter oben rechts, Zustand bleibt beim Wechsel erhalten.

**Essentials** — das, was ein Kunde oder ein Recruiter in 40 Sekunden versteht: acht bis zehn Regler, die Tombstone, drei Charts, die Wertschöpfungsbrücke. Alles Weitere ist ausgeblendet, nicht gelöscht.

**Full model** — Reiter für Sources & Uses, Betriebsplanung mit Jahrestabelle, Kapitalstruktur mit allen Tranchen, Erfolgsrechnung und Cashflow, Schuldenplan, Kreditkennzahlen mit Covenants, Rückflüsse nach Kapitalgeber, Sensitivitäten, Szenarien.

### Aufbau des Rechners

Links die Eingaben in Gruppen, rechts die Ergebnisse. Ganz oben, immer sichtbar und über dem Scrollbereich fixiert: eine kompakte Ergebniszeile mit IRR, Multiple, Verschuldungsgrad bei Eintritt und Austritt sowie einem Covenant-Statuspunkt. Der Nutzer soll beim Reglerziehen nie nach unten scrollen müssen, um die Wirkung zu sehen.

### Anschaulichkeit — hier entscheidet sich das Projekt

- **Jede Zahl ist rückverfolgbar.** Klick auf einen Ergebniswert öffnet die Herleitung: welche Formel, welche Eingaben, welches Zwischenergebnis. Das ist der Ersatz für "Formel in Excel anklicken" und der Grund, warum ein Banker das Tool einem Kunden zeigen würde
- **Werte animieren beim Wechsel** (200 ms), damit Veränderung sichtbar wird statt zu springen. `prefers-reduced-motion` respektieren
- **Vergleich mit dem Ausgangsstand:** Umschalter, der neben jedem Wert die Abweichung zum gespeicherten Basisfall zeigt
- **Warnungen im Klartext**, nicht als roter Punkt: "Der Cashflow deckt den Schuldendienst in Jahr 3 nicht — die Kreditlinie wird mit 4,2 Mio gezogen."

### Charts

Alle als eigene SVG-Komponenten, alle reagieren live:

1. **Entschuldung** — gestapelte Balken je Tranche über die Jahre, überlagert von der Verschuldungsgradlinie
2. **Wertaufteilung** — Unternehmenswert je Jahr, aufgeteilt in Nettoschulden und Eigenkapital; der wachsende Eigenkapitalkeil ist das zentrale Bild eines LBO
3. **Wertschöpfungsbrücke** — Wasserfalldiagramm von Eintritts- zu Austritts-Eigenkapital
4. **Sensitivitäts-Wärmematrix** mit hervorgehobener aktueller Annahme
5. **Covenant-Verlauf** — Kennzahl gegen Grenzwert über die Jahre, Bruchzone farblich hinterlegt
6. **Rückflussverteilung** — wer bekommt beim Exit wie viel

### Präsentationsmodus

Ein eigener Vollbildmodus für den Fall, dass jemand das Tool einem Kunden vorführt: grosse Typografie, eine Aussage pro Schritt, Weiterschalten per Pfeiltaste. Sechs Schritte, die aus dem aktuellen Deal erzählt werden:

1. Das ist das Unternehmen — Umsatz, EBITDA, Kaufpreis
2. So wird es bezahlt — Sources & Uses als Balken
3. Das Unternehmen wächst — Umsatz und EBITDA über die Zeit
4. Der Cashflow tilgt die Schulden — Entschuldungschart, animiert
5. Beim Verkauf gehört uns mehr — Wertaufteilung
6. Das ist die Rendite, und daher kommt sie — Tombstone und Brücke

Jeder Schritt zeigt echte Zahlen aus dem eingestellten Fall, keinen Beispieltext.

### Szenarien

Base, Upside, Downside plus eigene, benennbar. Speichern, laden, nebeneinander vergleichen in einer Tabelle mit IRR, Multiple, Verschuldungsgrad und Covenant-Status je Szenario. Ablage im Browser-Speicher, zusätzlich als JSON exportier- und importierbar.

### Export

- **Excel** über SheetJS: vollständiger Schuldenplan, Erfolgsrechnung, Cashflow, Kennzahlen, Sources & Uses — jedes auf eigenem Blatt, **mit lebenden Formeln in den Zellen**, nicht nur Werten. Ein Analyst muss die Datei weiterrechnen können. Zahlenformate wie im Banking üblich: Tausendertrennung, Klammern für negative Werte, Einheiten in der Kopfzeile
- **PDF-Einseiter** über ein Druck-Stylesheet und `window.print()`: Tombstone, Kennzahlen, Sources & Uses, Schuldenplan, Brücke. Muss auf A4 sauber umbrechen
- **Link teilen** — Zustand in der URL, mit Kopierknopf

---

## Gestaltung

Behalte die bestehende Bildsprache, aber führe sie sauber durch: dunkler, tiefblauer Grund, Messing als einziger Akzent, Stahlblau für Schulden, Rot ausschliesslich für echte Warnungen. Serifenschrift für Überschriften und die Tombstone, Monospace für **alle** Zahlen — Ziffern müssen untereinander stehen. Keine abgerundeten Ecken, keine Schlagschatten, keine Farbverläufe ausser dem einen auf der Tombstone.

Die Tombstone — die Deal-Plakette mit Messingrahmen — ist das Erkennungszeichen des Projekts und bleibt in beiden Modi erhalten.

Qualitätsuntergrenze ohne Diskussion: bis 380 px Breite benutzbar, Tastaturbedienung mit sichtbarem Fokus, ARIA-Beschriftungen an allen Reglern und Charts, Kontrastverhältnis mindestens 4.5:1 bei Fliesstext.

---

## Tests

Ohne diese Tests gilt kein Meilenstein als abgeschlossen:

- **Zwei vollständig von Hand nachgerechnete Fälle** als Referenz, jede Zwischengrösse geprüft. Baue den ersten mit mir gemeinsam, bevor du Code schreibst — ich liefere die Zahlen aus meinem eigenen Modell
- Sources gleich Uses, auf 0.01 genau
- Wertschöpfungsbrücke summiert exakt auf die Eigenkapitaldifferenz
- IRR-Verfahren gegen bekannte Zahlungsreihen, inklusive Vorzeichenwechsel und Randfällen
- Zirkularität konvergiert; ein bewusst nicht konvergierender Fall liefert die Warnung statt einer Zahl
- Schulden werden nie negativ, Liquidität nie unter der Mindestgrenze, Kreditlinie nie über dem Limit
- Grenzfälle: null Fremdkapital, 100 % Fremdkapital, negatives Wachstum, Haltedauer 1 Jahr, Eigenkapital beim Exit aufgezehrt
- URL-Kodierung: Zustand kodieren und dekodieren ergibt denselben Zustand

---

## Meilensteine

**Nach jedem Meilenstein hältst du an, fasst zusammen, was du gebaut hast, und wartest auf mein Signal.** Führe eine `CHANGELOG.md` mit Datum, Umfang und offenen Punkten.

**Meilenstein 1 — Fundament und erste Fassung online.**
Projekt aufgesetzt, Modell in reinen Funktionen mit Betriebsplanung, einer Schuldentranche, Cash Sweep, Zirkularität und Bisektions-IRR. Essentials-Oberfläche mit Tombstone und drei Charts. Referenzfälle als Tests. Zustand in der URL. `README.md` und Methodenseite. Auf Vercel veröffentlicht.
*Fertig heisst: Der Link funktioniert und ein Fremder versteht ohne Erklärung, was er sieht.*

**Meilenstein 2 — Kapitalstruktur.** Sources & Uses, beliebige Tranchen, Rang und Wasserfall, PIK, revolvierende Linie, Kreditkennzahlen mit Covenants, Schuldenplan-Tabelle.

**Meilenstein 3 — Vollmodell.** Erfolgsrechnung und Cashflow als Tabellen, Jahrestabellen für alle Zeitreihen, Working Capital über Laufzeiten, Verlustvorträge, Rekap und Ausschüttungen, Management-Beteiligung mit Rückflussverteilung, Full-model-Oberfläche mit Reitern.

**Meilenstein 4 — Analyse.** Frei wählbare Sensitivitätsachsen, Zielwertsuche, Renditematrix nach Exit-Jahr, Belastungstest, Szenarienverwaltung mit Vergleich, Herleitung per Klick auf jede Zahl.

**Meilenstein 5 — Vorführung und Ausgabe.** Präsentationsmodus, Excel-Export mit Formeln, PDF-Einseiter, Feinschliff bei Animation, Barrierefreiheit und mobiler Darstellung.

---

## Was du nicht tust

- Keine erfundenen Marktdaten, keine Kursabfragen, keine externen Schnittstellen
- Keine Anlageberatung im Text der Oberfläche; die Methodenseite beschreibt Rechenwege, nicht Empfehlungen
- Keine Bibliothek, wo dreissig Zeilen eigener Code reichen — jede Abhängigkeit begründest du mir
- Keine stillen Vereinfachungen: Wenn eine Grösse genähert wird, steht das im Code und auf der Methodenseite
- Nicht mehrere Meilensteine auf einmal

## Wenn du unsicher bist

Bei fachlichen Entscheidungen — welche Konvention bei Zinsberechnung, wie Sweet Equity üblicherweise strukturiert ist, ob Verkäuferdarlehen zum Fremdkapital zählen — frag mich, statt zu raten. Ich kenne die Finance-Seite, du die technische. Genau dort liegt der Nutzen unserer Zusammenarbeit.

**Beginne mit einer kurzen Rückfrage-Runde zu allem, was dir unklar ist. Danach Meilenstein 1.**
