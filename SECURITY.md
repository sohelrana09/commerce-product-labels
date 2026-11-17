# Security policy

## Supported versions

Security fixes go into the latest release and `main`. Older releases don't get patches: update to the latest version.

## Reporting a vulnerability

Please **don't open a public issue** for a security problem.

Report it privately through GitHub instead: [Report a vulnerability](https://github.com/sohelrana09/commerce-product-labels/security/advisories/new) (Security tab → Advisories → Report a vulnerability).

Include what you can of:

- what is affected (an action, the Admin page, the storefront kit) and what an attacker could do with it;
- the steps to reproduce it, or a proof of concept;
- the version or commit you tested.

You'll get an answer within 7 days. Once a fix is released, the advisory is published and you're credited, unless you'd rather not be.

## Scope

In scope: the code in this repository, for example:

- the public `rules` action (anything beyond the published label rules it exposes);
- authentication on the Admin actions;
- what the actions log or store;
- the Admin page;
- the storefront kit (`storefront/`), for example markup or script injection through a label rule.

Out of scope:

- vulnerabilities in Adobe Commerce, App Builder, I/O Runtime or other Adobe services themselves: report those to [Adobe](https://helpx.adobe.com/security/alertus.html);
- findings that need a leaked `.env`, `.aio` or workspace credentials;
- missing hardening headers or rate limits without a concrete attack.

Please test against your own App Builder workspace and Commerce instance, never someone else's.
