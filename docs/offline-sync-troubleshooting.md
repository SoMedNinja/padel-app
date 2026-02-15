# Offline sync & conflict troubleshooting (Web + iOS)

Det här dokumentet förklarar vad användare kan förvänta sig när appen är offline, när synkning försöker igen automatiskt och när en konflikt uppstår.

## När internet saknas

- Matcher och andra skrivningar sparas lokalt först.
- Banner visar **"Offline-kö aktiv"** med antal väntande ändringar.
- Användaren kan fortsätta använda appen; uppladdning sker automatiskt när anslutningen kommer tillbaka.

> **Note for non-coders:** "lokalt" betyder att informationen sparas på just den här enheten tills den kan laddas upp.

## Automatisk retry-policy

Både Web och iOS använder samma policy:

1. Max **3 automatiska försök** per köad ändring.
2. Backoff mellan försök: cirka **12s → 24s → 48s** (max 60s).
3. Efter tre misslyckade försök går posten till ett terminalt läge (**failed**) och väntar på manuell åtgärd.

> **Note for non-coders:** "backoff" betyder att appen väntar längre mellan varje nytt försök för att inte överbelasta nätet/servern.

## Terminala lägen

En köad ändring går till "manuell hantering" när:

- Tre automatiska försök har misslyckats.
- En verifierad konflikt hittas (samma `client_submission_id`, men olika innehåll/hash).

I dessa fall visas en felbanner med knapp **"Försök igen"** för manuell synkning.

## Konfliktmeddelande (gemensam formulering)

Både klienter visar samma text:

> "Konflikt upptäckt: en offline-sparad match skiljer sig från matchen som redan synkats. Öppna historiken och avgör vilken version som gäller innan du försöker igen."

## Vad support ska be användaren göra

1. Öppna historik/senaste matcher.
2. Jämför lokalt resultat med serverns resultat.
3. Välj korrekt version och försök synka igen.
4. Vid fortsatt fel: kontrollera nätverk och logga ut/in.

## Förväntade banners

- **Offline-kö aktiv**: data är säker lokalt, väntar på uppladdning.
- **Synkningen behöver hjälp**: auto-försök pausade efter flera fel.
- **Konflikt kräver åtgärd**: användaren måste granska historik innan ny synk.
