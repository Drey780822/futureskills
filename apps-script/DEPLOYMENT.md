# Deployment — step by step

## 1. Create the Apps Script project

1. Go to https://script.google.com and click **New project**.
2. Rename it to `ILM`.
3. In the left rail, click ⚙️ **Project Settings** and enable **"Show `appsscript.json` manifest file in editor"**.

## 2. Copy the files

For each `.gs` file in `apps-script/`, create a matching **Script file** and paste the contents.

For each `ui/*.html` file, use **File → New → HTML** and name it `ui/Index`, `ui/Student`, `ui/Styles`, `ui/Scripts`, `ui/Components` (Apps Script treats the `/` as part of the filename — this is required so `include('ui/Styles')` resolves).

Replace `appsscript.json` with the manifest in this folder.

## 3. First run — grant scopes

1. Open `Code.gs` in the Apps Script editor.
2. Select the `doGet` function from the dropdown → click **Run**.
3. Grant the requested OAuth scopes (Sheets, external requests, user info).

## 4. Deploy as web app

1. Click **Deploy → New deployment**.
2. Select type: **Web app**.
3. **Execute as**: `User accessing the web app` (required so ownership works).
4. **Who has access**: `Anyone with Google account` (or restrict to your domain).
5. Click **Deploy** and copy the web-app URL — this is the **lecturer dashboard**.

## 5. Seed demo data

Open the web-app URL, then click **Seed demo data** in the sidebar. This creates:

- 1 course: *Introduction to Data Science (DSC101)*
- 2 activities: a reflection question + an environment-setup checklist
- 5 student responses with realistic South-African context
- Likes, a pinned lecturer comment, gamification progress

## 6. Embed inside your LMS

On any activity row click the `</>` icon → **Copy to clipboard**. Paste into:

- Canvas → *Rich Content Editor → HTML view*
- Notion → `/embed`
- Moodle → *HTML block*
- Blackboard → *Build Content → HTML*
- Google Sites → *Insert → Embed*
- MS Teams → *Tab → Website / iframe*

The snippet auto-resizes the iframe via `postMessage`.

## 7. (Optional) Wire real AI

Open **Project Settings → Script Properties** and add:

```
OPENAI_API_KEY = sk-...
```

Then in `AIService.gs → summarizeResponses`, uncomment the `UrlFetchApp.fetch(...)` block.

## 8. (Optional) Restrict domain

In **Deploy → Manage deployments**, change *Who has access* to your G-Suite/Workspace domain.
