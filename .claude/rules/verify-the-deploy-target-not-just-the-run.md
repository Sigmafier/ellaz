---
paths: ".github/workflows/**,deploy/**,**/scripts/**"
---

# A Green Deploy Is Not a Changed Website — Probe the Target Before Arming It

**Scope**: Any change to a deploy pipeline, host, credential, or upload path in this repo.
**Origin**: 2026-08-02, wiring ellaz.fun to CI. Three separate defaults, each plausible and
each read off the hosting panel, would have shipped a passing workflow beside a frozen site.

## Core Rule

**Before arming a deploy against a host you have not deployed to from CI, log in and LOOK.
List the directory you are about to upload into. Confirm the account authenticates. Read the
certificate.** Then, after the first real run, verify the *artifact the user receives* — not
the workflow's exit status.

The failure mode this prevents is the quiet one. A wrong upload path, a wrong username, a
wrong TLS assumption: none of them raise an alarm you would notice, because two of the three
fail *before* the transfer and the third succeeds into the wrong folder. In every case the
run is green, the log says "uploading", and the website is exactly as stale as before.

## What the panel tells you is not what the server does

Every one of these came straight off hPanel and was still wrong:

- **`Folder to upload files: public_html`** — true of the filesystem, false of FTP. The
  account is chrooted, so its FTP root already IS `public_html`. Uploading to `public_html/`
  creates a nested copy that nothing serves.
- **Two usernames listed side by side** — `u210394724.ellaz.fun` and `u210394724.ellaz`.
  They are different accounts. The longer, more obvious-looking one answers `530`.
- **Hostname `ftp.ellaz.fun`** — the server presents `CN=*.hstgr.io`, so strict certificate
  verification fails against both that name and the raw IP.

Cost of finding out by probing: about four minutes. Cost of finding out from production:
a green pipeline you now trust, and a site that silently stops updating.

## The probe

Read-only, before touching any workflow. Credentials go in a `600` config file so they never
land in argv or shell history.

```bash
umask 077
printf 'user = "%s:%s"\n' "$USER_NAME" "$PASS" > /tmp/.c1

# 1. Does this account authenticate at all, and what is at its root?
curl -sS -K /tmp/.c1 -k --ssl-reqd "ftp://$HOST/"

# 2. Does the folder you were about to configure actually exist?
curl -sS -K /tmp/.c1 -k --ssl-reqd --list-only "ftp://$HOST/public_html/"
#    "Server denied you to change to the given directory" => you are already in it.

# 3. What certificate is really presented?
echo | openssl s_client -connect "$HOST:21" -starttls ftp 2>/dev/null \
  | openssl x509 -noout -subject
```

If step 1 lists `index.html`, you are looking at the docroot. `server-dir` is `./`.

## Then verify the artifact, not the run

A workflow with a credential guard **succeeds while skipping everything** — that is
deliberate (a workflow that reds every push gets ignored), and it means a green checkmark
carries no information about whether a deploy happened.

```bash
gh run view <run-id> --json jobs \
  --jq '.jobs[].steps[] | "\(.conclusion)\t\(.name)"'   # the upload step: success or skipped?

curl -s https://ellaz.fun/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'  # matches your build?
```

And when checking a *header* you just changed, remember the CDN: an object cached before the
change keeps the old header until its TTL expires. Re-request with a cache-buster before
concluding the fix failed — `x-hcdn-cache-status: HIT` with the old value and `MISS` with the
new one means the fix is live and the edge is merely behind.

## When to Apply

- Adding or repointing any deploy workflow, host, or credential.
- Any report of "I pushed and the site didn't change" — check the upload step's conclusion
  and the `server-dir` before touching application code.
- Reviewing a deploy PR: if it names an upload path, ask how that path was confirmed.

**Companions**: [`docs/deploy.md`](../../docs/deploy.md) (the runbook and the verified
values) · [`pwa-stale-bundle-qa.md`](pwa-stale-bundle-qa.md) (the other way a fix looks
un-shipped).
