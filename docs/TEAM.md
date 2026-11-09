# Team: roles, invites, assignment, sign-off, notifications

The studio works like a small Figma org: an Admin invites designers, assigns them to projects, and decides who can sign off.

Everything lives in **one Settings place** (account menu → *Settings & admin*):
- **Account** (everyone): Your account (name, password, away) · Notifications (sound, desktop alerts; chat channels for Admins)
- **Admin** (Admins only): Activity · People · Projects · Roles & sign-off · Security · Keys & integrations

The **Team** page (account menu) is the overview for everyone: who's online, what's waiting for sign-off, recent activity.

## Roles

| Role | Can |
|---|---|
| **Admin** | Everything: invite people, assign projects, approve direction, Final sign-off, delete, settings, keys |
| **Lead** | Sees and works on every project, approves direction and gives Final sign-off on any project. **No access to admin settings** (people, roles, security, keys). Use it for a design lead who covers sign-off. |
| **Designer** | Start BRDs (they're added to them automatically) and work on projects they're on: message the agent, answer questions, react, send comments, build in Figma, **request sign-off**. Approve and sign off only if an Admin gives them sign-off rights. |
| **Viewer** | See the projects they're on, comment and reply, @mention. Can't change a project or talk to the agent. Good for PMs and devs. |

Older accounts with the old "Requester" role become **Designer**.

## Inviting the team

Open **Settings → People** and press **Invite people**:
1. Pick the role, optionally a name and the projects to add them to.
2. **Create invite link**: the link is copied. Send it on Slack or by email.
3. They open it, choose a username and password, and land on their projects.

Links work once and expire after 7 days (change it in Security); pending links show in People and can be revoked. You can still add someone directly with a temporary password.

The link only works for people who can reach the studio. On your own Mac that's just you, so for the team host it (`docs/SETUP.md` → Hosting): set `STUDIO_HOST=0.0.0.0`, `STUDIO_PUBLIC_URL=https://…` and `STUDIO_SECURE_COOKIE=1` behind HTTPS.

## Who sees what

- Admins see every project.
- Designers and Viewers see projects they're on (assigned, or started themselves). Team → Access → **Designers can see every project** opens all projects to Designers, read-only unless they're on it.
- Assign people from the avatars in a project's top bar, or Settings → Projects. Each new person gets a notification.

## Sign-off when you're away (without giving anyone admin)

Two options, neither gives access to admin settings:
- **Lead role** (permanent): Settings → People → set their role to **Lead**. They sign off any project.
- **Temporary sign-off** (cover): Settings → Roles & sign-off → **Give temporary sign-off** → pick a Designer and an end date. They can approve and sign off the projects they're on until that date, then it ends by itself.

Settings → Roles & sign-off shows a matrix of what each role can do and **who can sign off right now**.
- **Away** (Settings → Your account, or the Team page) shows the team you're out until a date. Sign-off requests go to everyone who can sign off.
- Designers press **Request sign-off** (with an optional note and @mentions). Everyone who can sign that project off gets notified; the Team page lists everything **Waiting for sign-off**, who asked and how long ago.

## Activity (Settings → Activity, Admins)

- **BRDs**: every BRD that came in (when, from whom, how: dashboard, inbox, API), who's working on it, its status and round, who signed it off, and the latest feedback with time, person and text. Click the feedback line to see that project's full history.
- **All activity**: a time-stamped log of everything people did: BRDs received, feedback messages, 👍/👎 notes, pinned comments and replies, answers to the agent, approvals, sign-off requests and sign-offs, assignments, dev questions, sign-ins (with IP and failed attempts) and admin changes. Filter by date range, event, person or project, search the text, click a row to read the full feedback, and **download a CSV**.
- It updates live as feedback comes in. Leads and Designers can't see it.

Sign-ins and admin changes are kept in `apps/studio/.studio-audit.jsonl` (git-ignored); project feedback comes from each project's `specs/<slug>/events.jsonl` and `comments.json`.

## Security (Settings → Security, Admins)

- **Session length** (1–30 days) and **idle session timeout** (off, 8h, 1 day, 2 days, 7 days).
- **Invite link expiry** and **allowed email domains**: when set, invite sign-ups must use a work email on those domains.
- **Sign everyone out** (keeps you signed in), or a person's **⋯ → Sign out of all devices**.
- Read-only: failed sign-in lock (8 attempts / 15 min), password rules (scrypt-hashed, 10+ characters), studio access (this computer / network), secure cookies, secrets kept out of git.

## Notifications (the bell)

The bell in the top bar shows unread notifications with tabs for **Sign-off** and **Mentions**. People are notified when:
- someone requests their sign-off, or a direction is ready for them to approve;
- someone @mentions them (comments, replies, feedback, sign-off notes);
- they're added to a project or given sign-off rights;
- someone comments on or replies on their project;
- their project needs them (questions, refine, error), the handover is ready, or dev has a question.

Each one plays the chosen sound, shows a toast, and a desktop alert if the tab is in the background (Notification settings). Slack / Mattermost / Teams channels still work as before.

## @mentions

Type `@` in any comment, reply, feedback box, change request or sign-off note to pick someone. They get a notification and, if they weren't on the project yet, they're added to it so they can open it.

## Who's online

Avatars in the top bar show who's online. On a project, the avatars are the people on it: a green dot means online, a pink ring means they're looking at this project now. The Team page shows each person's status ("Viewing Daily Races", "Last seen 2h ago"), their projects and recent activity.

Stored in `apps/studio/.studio-team.json` and `.studio-inbox.json` (git-ignored, like the accounts).
