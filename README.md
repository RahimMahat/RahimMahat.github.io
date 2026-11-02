# rahimmahat.github.io

Portfolio of **Rahim Mahat**, Senior Data Engineer. Live at **[rahimmahat.github.io](https://rahimmahat.github.io)**.

A home page plus four case studies, one for each independent project:

| Case study | What it measures | Source |
|---|---|---|
| [WarehouseGPT](https://rahimmahat.github.io/warehouse-gpt.html) | How much context is worth to a text-to-SQL agent: 63.5% → 98.0% | [repo](https://github.com/RahimMahat/warehouse-gpt) |
| [Leakproof](https://rahimmahat.github.io/leakproof.html) | What data leakage costs a fraud model once it goes live: ROC-AUC 0.999 offline, 0.901 live | [repo](https://github.com/RahimMahat/leakproof) |
| [Lossproof](https://rahimmahat.github.io/lossproof.html) | What an ordinary week of faults does to a change-data-capture lake: 69% wrong vs 0 | [repo](https://github.com/RahimMahat/lossproof) |
| [Nightshift](https://rahimmahat.github.io/nightshift.html) | An LLM as an ETL step, and an AI agent on call against a 101-line runbook: 11 vs 15 of 16 | [repo](https://github.com/RahimMahat/nightshift) |

Every figure on the site comes from those write-ups. The independent projects run locally and are not production deployments; the production work is described from paid engagements.

## How it's built

Plain HTML, CSS and JavaScript, with no framework and no build step. [Lenis](https://github.com/darkroomengineering/lenis) is vendored for smooth scrolling. Fonts are Archivo, Instrument Serif and JetBrains Mono from Google Fonts. There are no analytics and no cookies, and every animation turns off under `prefers-reduced-motion`.

| File | Role |
|---|---|
| `index.html` | The home page |
| `warehouse-gpt.html`, `leakproof.html`, `lossproof.html`, `nightshift.html` | The case studies |
| `style.css` | All styles, including the dark / paper section themes |
| `site.js` | Shared by every page: the text-as-data-rows effect, page transitions, the scroll loop, reveals |
| `home.js` | Home page only: hero streams, pinned sections, the stack pipeline |
| `case.js` | Case studies only: charts that advance one step per screen of scroll |
| `vendor/lenis.min.js` | Lenis 1.3.27 |

## Run it locally

Open `index.html` in a browser, or serve the folder:

```sh
npx serve .
```

## Deploy

GitHub Pages serves the `main` branch from the repository root. Pushing to `main` publishes in about a minute. `.nojekyll` tells Pages to serve the files as they are.

## Contact

[rahimmahat07@gmail.com](mailto:rahimmahat07@gmail.com) · [GitHub](https://github.com/RahimMahat) · [LinkedIn](https://www.linkedin.com/in/rahim-mahat/)
