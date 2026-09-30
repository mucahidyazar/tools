# Bundled data sources

All series are monthly, stored as `date,value` CSV files and compiled into
`src/lib/generated/series.ts` by `node scripts/build-economic-data.mjs`.
Run the script with `--download` to refresh every file from its public source
(no API key is needed), then review the diff before committing.

| File | Series | Provider | Notes |
|------|--------|----------|-------|
| `cpi-us.csv` | CPIAUCNS | U.S. BLS via FRED | CPI-U, all items, 1982-84=100, not seasonally adjusted |
| `cpi-tr.csv` | TURCPIALLMINMEI | OECD MEI via FRED | CPI all items, 2015=100; the OECD series ended in April 2025 |
| `cpi-tr-hicp.csv` | CP0000TRM086NEST | Eurostat HICP via FRED | Extends `cpi-tr` from May 2025 by chaining its month-over-month changes |
| `cpi-gb.csv` | GBRCPIALLMINMEI | OECD MEI via FRED | CPI all items, 2015=100; the OECD series ended in March 2025 |
| `cpi-gb-ons.csv` | D7BT (MM23) | ONS time-series CSV | CPI index 2015=100; extends `cpi-gb` from April 2025 by chaining its month-over-month changes |
| `cpi-de.csv` | DEUCPIALLMINMEI | OECD MEI via FRED | CPI all items, 2015=100; the OECD series ended in March 2025 |
| `cpi-de-hicp.csv` | CP0000DEM086NEST | Eurostat HICP via FRED | Extends `cpi-de` from April 2025 by chaining its month-over-month changes |
| `usd-try.csv` | CCUSMA02TRM618N | OECD via FRED | TRY per USD, monthly average of daily rates |
| `eur-usd.csv` | EXUSEU | Federal Reserve H.10 via FRED | USD per EUR, monthly average |
| `gbp-usd.csv` | EXUSUK | Federal Reserve H.10 via FRED | USD per GBP, monthly average |
| `jpy-usd.csv` | EXJPUS | Federal Reserve H.10 via FRED | JPY per USD, monthly average |
| `inr-usd.csv` | EXINUS | Federal Reserve H.10 via FRED | INR per USD, monthly average |
| `cny-usd.csv` | EXCHUS | Federal Reserve H.10 via FRED | CNY per USD, monthly average |
| `chf-usd.csv` | EXSZUS | Federal Reserve H.10 via FRED | CHF per USD, monthly average |
| `cad-usd.csv` | EXCAUS | Federal Reserve H.10 via FRED | CAD per USD, monthly average |
| `aud-usd.csv` | EXUSAL | Federal Reserve H.10 via FRED | USD per AUD, monthly average |
| `try-rate.csv` | IRSTCI01TRM156N | OECD via FRED | Turkish overnight interbank rate, percent per year, monthly average |
| `nasdaq.csv` | NASDAQCOM | NASDAQ OMX via FRED | Composite index, monthly average of daily closes |
| `gold-usd.csv` | Pink Sheet, gold | World Bank Commodity Price Data | USD per troy ounce, monthly average, CC BY 4.0 |

Chained extensions keep the historical index level and apply the newer index's
monthly ratios after the original provider's last month, so long-run comparisons
keep their full history while recent months stay current. The HICP and the
national CPI use slightly different baskets, so chained months are an
approximation of the national index. The generated `source` text of each series
names the extension and the month it starts.

FRED data is subject to the [FRED terms of use](https://fred.stlouisfed.org/legal/);
the World Bank Pink Sheet is published under CC BY 4.0; ONS data is published
under the Open Government Licence v3.0. Values are informational
and are not investment advice. Empty values mark months the provider has not
published (for example the October 2025 U.S. CPI release).

`password-words-en.json` in `public/data` is documented in its own attribution file.

## Public holidays (`holidays/`)

`src/data/holidays/*.json` hold the nationwide and regional public holidays of
the countries the leave planner offers (Türkiye, Germany, the United Kingdom,
the United States, France, the Netherlands, Belgium, Austria, Russia and
Kazakhstan) for 2025–2029, downloaded from [Nager.Date](https://date.nager.at)
(MIT licence) by `node scripts/build-holidays.mjs --download` and compiled into
`src/lib/generated/holidays.ts`. Only entries typed "Public" are kept; regional
entries carry their ISO 3166-2 region codes, and dates the provider marks as
tentative (moon-sighting holidays in future years) keep a `tentative` flag.
Half-day eves (for example the Turkish *arife* afternoons) and one-off
administrative leave are not part of the data.
