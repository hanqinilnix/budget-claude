# What spending trackers usually have

Researched 9 November 2026 from each app's own App Store listing, website or help centre.

## Summary

- Nearly every tracker combines the same four things: quick entry, a category breakdown, reports over time, and some form of backup.
- Budgets are common (8 of the 11 apps checked), but they are an add-on. Logging and reporting work without them.
- The big general apps now compete on automatic capture: bank sync, reading notifications, receipt scanning. All of those need a server or a native app, so they don't suit an offline PWA.
- Trip apps add a separate ledger per trip, foreign currency converted to home currency, and spending per day. Foreign currency appears in all five.
- No first-party page describes what this app is building: a trip that stays open across launches and also feeds an everyday ledger. Trip apps stand alone, and general apps offer at most separate wallets. Marketing pages omit plenty, so this is "not advertised", not "doesn't exist".

## Features across the apps checked

General trackers: Money Manager ([listing][mm], [help][mm-home]), [Spendee][spendee], [Wallet][wallet], [Toshl][toshl], [Monefy][monefy], [Bluecoins][blue].
Trip and split apps: [Trail Wallet][trail] (discontinued, page kept as an archive), TravelSpend ([listing][ts], [site][ts-site], [Premium list][ts-prem]), [Trabee Pocket][trabee], [Tricount][tricount], [Splitwise][splitwise].

Counts are floors. They include only what a first-party page says, so an app not listed may still have the feature. (P) means paid tier.

| Group | Feature | Count | Confirmed in |
|---|---|---|---|
| Logging | Fast manual entry as a headline claim | 6 of 11 | Money Manager, Toshl (4 taps), Monefy (amount only), Trail Wallet, TravelSpend, Trabee |
| Logging | Built-in calculator | 3 | Money Manager, Monefy, Trabee |
| Logging | Receipt photo or scan | 6 | Spendee (AI), Toshl (P), Trail Wallet, TravelSpend (P), Trabee (AI), Tricount |
| Logging | Automatic capture | 5 | Spendee, Wallet (P), Toshl (bank sync); Bluecoins (notifications, SMS); TravelSpend (Apple Pay) |
| Logging | Tags or labels | 3 | Spendee, Toshl, Trail Wallet |
| Logging | Search | 2 | Money Manager, TravelSpend (P) |
| Logging | Saved frequent entries | 1 | Money Manager (payment profiles) |
| Categories | Editable categories | 4 | Money Manager (with sub-categories), Monefy, TravelSpend (P), Trabee (P) |
| Categories | Spending-by-category chart | 6 | Money Manager, Monefy, Toshl, Trail Wallet, TravelSpend, Trabee (P) |
| Periods and reports | Week, month and year statistics | 1 | Money Manager |
| Periods and reports | Choosable report period | 1 | Monefy |
| Periods and reports | Calendar view | 2 | Money Manager, Bluecoins |
| Periods and reports | Comparison with an earlier period | 3 | Spendee, Toshl (web app), Money Manager (month to month) |
| Periods and reports | Spending per day | 3 | Trail Wallet (last five days), TravelSpend, Trabee |
| Periods and reports | Custom month start day | 1 | Money Manager |
| Recurring | Recurring entries or bills | 4 | Monefy, Toshl (P), Bluecoins, Splitwise |
| Budgets | Budget tracking | 8 | Money Manager, Spendee, Wallet, Toshl, Bluecoins, Trail Wallet, TravelSpend, Trabee |
| Travel | A separate ledger per trip | 5 of 5 trip apps | Trail Wallet, TravelSpend, Trabee, Tricount, Splitwise (groups) |
| Travel | Foreign currency entry | 5 of 5 trip apps | As above. Also Money Manager, Spendee, Toshl, Monefy |
| Travel | Totals converted to home currency | 3 | Trail Wallet, TravelSpend, Trabee |
| Travel | Your own exchange rate | 2 | [Trail Wallet FAQ][trail-faq], TravelSpend (P) |
| Travel | Spread one cost over several days | 2 | Trail Wallet, TravelSpend |
| Travel | Offline entry | 4 | TravelSpend, Trabee, Tricount, Splitwise |
| Travel | Splitting costs with others | 3 | TravelSpend, Tricount, Splitwise |
| Travel | Spending per country | 1 | TravelSpend (P) |
| Travel | Trip as a diary (notes, photos, places) | 1 | Trabee |
| Data | Backup outside the device | 5 | Money Manager, Toshl, Monefy, Bluecoins, Trail Wallet |
| Data | CSV or spreadsheet export | 5 | Bluecoins (partly P), Trail Wallet, TravelSpend (P), Trabee (P), Splitwise |
| Data | CSV import | 2 | Toshl (web app), [Bluecoins][blue-import] |
| Data | Passcode or biometric lock | 4 | Money Manager, Toshl (P), Monefy, Bluecoins |
| Data | Stored on the device by default | 1 | [Money Manager][mm-backup] |

Detail worth keeping:

- **Trip dates.** Trail Wallet lets a trip have fixed dates, or open-ended dates set from its entries ([site][trail]). That is close to starting a journal and ending it later.
- **Exchange rates.** TravelSpend sells custom rates because market rates often don't match what you paid at the exchange office ([Premium list][ts-prem]).
- **Trip statistics.** TravelSpend charts spending by day, category and country ([site][ts-site]). Trail Wallet shows trip history, a pie chart and export per trip ([site][trail]).

## Do people give up on manual logging?

The evidence is weak, and this doc doesn't rely on any retention figure.

- A search of academic sources found no peer-reviewed study measuring drop-off in manual expense tracking.
- The figures that circulate have no traceable source. One [research page][finio] says 83% abandon within two weeks and gives no origin. A [student case study on Money Lover][moneylover] says only a tenth of users remain after 30 days, and the excerpt read shows no data behind it.
- The nearest research is indirect. A [52-person survey][arxiv] found young users wanting automated tracking and bank links. A [literature review on health apps][mhealth] links reminders and feedback to retention, but applying that to spending apps is an inference.
- The one thing the evidence does show is that vendors treat entry speed as a main selling point (6 of 11 above). That shows what they think matters, not what keeps people logging.

## How this app compares

Written against the app as planned after the change from budget tracker to spendings tracker.

| Area | This app | Compared with others |
|---|---|---|
| Scope | Spending only: no budgets, no income entry | Narrower than most. Budgets are common but not required for tracking |
| Periods | Day, 7 Days, Week, Month, Year, stepping back through past periods | Broader than most listings describe |
| Reports | Trend bars, comparison with the previous period, category breakdown | Matches the common set; earlier-period comparison is confirmed in only 3 apps |
| Trips | Travel journals with pre-trip, trip and post-trip stages; any number planned at once; the app reopens in the running trip; a Main/trip switch; past trips list | Per-trip ledgers are standard. The persistent open journal isn't advertised anywhere checked |
| Trips in the main view | Journal entries count in the main view, as one row per trip | Not described by any app checked. It matches the owner's sheet, where trip costs reach the main list as travel items |
| Receipts | A receipt mode lists items with prices and can hold a photo, and only its total counts | Photos match the 6 apps with receipt photos, without their scanning. Item-level entry wasn't checked in the comparison above |
| Storage | Local IndexedDB, JSON backup, no account | The most private option here, but the backup is manual; 5 apps back up off the device |
| Offline | Full | On par with trip apps |

### Gaps worth considering, most useful first

1. **Foreign currency on trips (done).** All five trip apps have it, and the owner's sheet records currency top-ups at hand-noted rates. Each trip now has its own currency, each day's rate is looked up online from a free public dataset, and a finished trip records the average rate it worked out at. Entries logged offline are shown in the trip currency and left out of home-currency totals until their rate can be fetched.
2. **CSV import of `data/spendings.csv`.** About two years of history would make the Year view and period comparisons useful from day one. Toshl and Bluecoins both import. The sheet's category names would need mapping to the app's categories.
3. **Faster entry.** Sort categories by recent use, and offer a calculator or saved entries. This is the feature vendors push hardest.
4. **Recurring entries.** Confirmed in 4 apps, and the sheet has a recurring category of its own.
5. **Search.** History is browsed month by month, so finding one purchase means knowing when it happened.
6. **Spreading a cost over several days.** Useful for accommodation in a trip's per-day view. Confirmed in 2 trip apps.

Left out on purpose: bank sync and automatic capture (they need a server or native access), AI receipt scanning (needs a network), and cost splitting (a different job, covered well by Tricount and Splitwise).

## What could not be confirmed

- Wallet's App Store text was read only as far as its premium features, so its other features are undercounted.
- Trail Wallet's page is an archive of a [discontinued][trail] app. It shows what trip apps offered, not what is on sale today.
- Some TravelSpend and Money Manager help articles are several years old, so paid-tier splits may have changed.
- Bluecoins' import details and Money Manager's backup details come from search extracts of their own pages, not full reads.

## Sources

- [Money Manager, App Store][mm]
- [Money Manager help: Home tab][mm-home]
- [Money Manager help: backup and restore][mm-backup]
- [Spendee, App Store][spendee]
- [Wallet by BudgetBakers, App Store][wallet]
- [Toshl Finance, App Store][toshl]
- [Monefy, App Store][monefy]
- [Bluecoins site][blue]
- [Bluecoins guide: import and export][blue-import]
- [Trail Wallet site (archive)][trail]
- [Trail Wallet FAQ][trail-faq]
- [TravelSpend, App Store][ts]
- [TravelSpend site][ts-site]
- [TravelSpend help: Premium features][ts-prem]
- [Trabee Pocket, App Store][trabee]
- [Tricount, App Store][tricount]
- [Splitwise, App Store][splitwise]
- [Money Lover case study (UX Foundation)][moneylover]
- [Finio research overview][finio]
- [Survey of young users' finance habits (arXiv 2601.08640)][arxiv]
- [Engagement and retention in mobile health apps (review)][mhealth]

[mm]: https://apps.apple.com/sg/app/money-manager-expense-budget/id560481810
[mm-home]: https://help.realbyteapps.com/hc/en-us/articles/360046150874-Home-tab
[mm-backup]: https://help.realbyteapps.com/hc/en-us/articles/360043020434-How-to-backup-and-restore-data
[spendee]: https://apps.apple.com/sg/app/money-tracker-spendee/id635861140
[wallet]: https://apps.apple.com/sg/app/wallet-budget-money-manager/id1032467659
[toshl]: https://apps.apple.com/sg/app/toshl-finance-best-budget/id921590251
[monefy]: https://apps.apple.com/sg/app/monefy-money-tracker/id1212024409
[blue]: https://www.bluecoinsapp.com/
[blue-import]: https://www.bluecoinsapp.com/guide/import-export/
[trail]: https://voyagetravelapps.com/trail-wallet/
[trail-faq]: https://voyagetravelapps.com/trail-wallet-faq/
[ts]: https://apps.apple.com/sg/app/travelspend-travel-budget-app/id1434284824
[ts-site]: https://travel-spend.com/
[ts-prem]: https://help.travel-spend.com/billing--subscription/4Sgj3hdVGepnZ4qtAyGSuV/what-features-are-unlocked-by-the-paid-premium-version/45WE6aZwwKsSFHsk8FuTKE
[trabee]: https://apps.apple.com/sg/app/trabee-pocket-travel-budget/id673659438
[tricount]: https://apps.apple.com/sg/app/tricount-split-settle-bills/id349866256
[splitwise]: https://apps.apple.com/sg/app/splitwise/id458023433
[moneylover]: https://uxfoundation.notion.site/Case-Study-Redesign-the-Money-Lover-App-to-cultivate-the-habit-of-expense-tracking-for-users-25a684fd8bbc4d499febe0eddb5858c4
[finio]: https://finio-gamma.vercel.app/research
[arxiv]: https://arxiv.org/pdf/2601.08640
[mhealth]: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9092233/
