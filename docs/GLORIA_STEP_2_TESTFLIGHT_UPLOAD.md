# Selah TestFlight Setup — Part 2: Upload & Install the Build

Hi Gloria,

Here's the first TestFlight build of Selah. You should have received a file called **`SelahApp.ipa`** from Abby. This guide walks you through uploading it and installing it on your iPhone.

**Estimated time:** 15–20 minutes

---

## Overview

What you're about to do:

1. **Upload the IPA** from your Mac to App Store Connect using Transporter (~5 min)
2. **Wait for Apple to process the build** (~10–30 min, happens in the background)
3. **Configure TestFlight** to make the build available to you (~5 min)
4. **Install TestFlight on your iPhone** and download Selah (~5 min)

---

## Step 1 — Install Transporter on your Mac

Transporter is Apple's free tool for uploading builds to App Store Connect.

1. Open the **Mac App Store**
2. Search for **"Transporter"** (made by Apple)
3. Click **Get** / **Install**
4. Open Transporter after it installs
5. Sign in with your **Apple ID** — the same one linked to the Selah Apple Developer account

---

## Step 2 — Upload the IPA

1. Drag **`SelahApp.ipa`** (the file Abby sent you) into the Transporter window
   - Or click **`+ Add App`** and select the file
2. Transporter shows the build details:
   - **Name:** Selah (or SelahApp)
   - **Bundle ID:** `com.pause.selah` ← verify this is correct
   - **Version:** 1.0 (or similar)
3. Click **Deliver** (top-right button)
4. Transporter uploads the IPA to App Store Connect
   - Progress bar shows upload status
   - Usually takes 1–5 minutes depending on your internet speed
5. When upload completes, you'll see a green checkmark
6. **Do NOT close Transporter until you see the checkmark** — closing early will cancel the upload

---

## Step 3 — Wait for Apple to process the build

After Transporter finishes uploading, **Apple processes the build on their servers**. This happens in the background and takes **10–30 minutes**.

You'll receive an email from `no_reply@email.apple.com` with a subject like:

> "The status of your app, Selah, has changed"

The email will say one of:

- **"Ready to Test"** — build is available in TestFlight, continue to Step 4
- **"Invalid Binary"** or similar — build failed Apple's validation, forward the email to Abby

**While waiting:** you can close Transporter and move on. The processing happens server-side.

---

## Step 4 — Configure TestFlight in App Store Connect

1. Go to [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com) → sign in
2. Click **My Apps** → **Selah**
3. Click the **TestFlight** tab (top navigation bar)
4. You should see build `1.0 (1)` listed under **iOS Builds**
   - If it's not there yet, the build is still processing — wait for the "Ready to Test" email
5. Click the build number `1.0 (1)` to open its details

### Answer the Export Compliance question

Apple asks about encryption for every build. For Selah:

- **Does your app use encryption?** → **Yes**
  - _Why: the app uses HTTPS (standard encryption) even though you didn't implement any custom crypto_
- **Does your app qualify for any of the exemptions provided in Category 5, Part 2 of the U.S. Export Administration Regulations?** → **Yes**
  - _Why: using only standard HTTPS / iOS crypto libraries is exempt_
- Click **Save** / **Internal Testing Only**

### Create an Internal Testing group

1. On the TestFlight page, click **Internal Testing** in the left sidebar
2. Click the **`+`** button next to "Internal Testers"
3. Create a group:
   - **Name:** `Internal`
   - **Enable automatic distribution** (optional, recommended)
4. Click **Create**
5. In the group, click **Add Testers**
6. Add yourself by your Apple ID email
7. Click **Add**
8. If not already automatically assigned, assign the build to this group:
   - Go to the **Builds** tab within the group
   - Click the **`+`** button → select build `1.0 (1)` → Add

You'll receive a TestFlight invite email at your Apple ID address.

---

## Step 5 — Install TestFlight on your iPhone

1. On your iPhone, open the **App Store**
2. Search for **"TestFlight"** (made by Apple)
3. Tap **Get** to install the TestFlight app (free)
4. Open TestFlight
5. Sign in with your **Apple ID** — the same one you added as an internal tester in Step 4

---

## Step 6 — Install Selah via TestFlight

1. In the TestFlight app on your iPhone, you should see **"Selah"** in the list of available apps
   - If not, pull down to refresh, or check your email for the invite link and tap it
2. Tap **Install** next to Selah
3. Wait for the download to complete
4. Tap **Open** to launch Selah
5. **When the HealthKit permission sheet appears**, toggle **all permissions ON** and tap **Allow**
   - You only get this sheet once per permission type — if you tap "Don't Allow", you'll need to manually re-enable in **Settings → Health → Data Access & Devices → Selah**
6. Enjoy the real build

---

## Troubleshooting

### Transporter says "Invalid Binary" or rejects the upload

Send Abby:
- The full error message from Transporter
- A screenshot of the error dialog

Common causes: missing app icon, wrong architecture, missing entitlements. These are usually fixable by rebuilding on Abby's side.

### "Ready to Test" email never arrives

- Check spam / junk folder
- Wait up to 1 hour before assuming it's stuck
- Refresh the TestFlight tab in App Store Connect — sometimes the build shows up there before the email arrives

### Build doesn't appear in TestFlight tab on App Store Connect

- It's still processing. Wait and refresh.
- If it's been more than 2 hours, something is wrong. Check your email for any rejection notices from Apple, or send Abby a screenshot of the TestFlight Builds page.

### iPhone TestFlight app says "No apps available"

- Make sure you're signed into TestFlight with the **same Apple ID** that's added as an internal tester
- Pull down to refresh
- Check your email for the TestFlight invite — tap the link on your iPhone to accept

### App crashes on launch

- Open the app again (sometimes the first launch is flaky)
- Send Abby: the TestFlight tab in App Store Connect shows crash reports under "Feedback" after a few minutes — screenshot those

### HealthKit permission sheet doesn't appear / HealthKit data is empty

- Check **Settings → Health → Data Access & Devices → Selah** — make sure all permissions are enabled
- Make sure you have actual heart rate / HRV data in your Health app (from Apple Watch, iPhone sensors, or manual entry)

---

## Checklist

- [ ] Transporter installed on Mac
- [ ] IPA uploaded successfully (green checkmark in Transporter)
- [ ] Received "Ready to Test" email from Apple
- [ ] Export compliance question answered on App Store Connect
- [ ] Internal Testing group created with yourself added
- [ ] Build assigned to the Internal Testing group
- [ ] TestFlight app installed on iPhone
- [ ] Signed into TestFlight with same Apple ID
- [ ] Selah installed via TestFlight
- [ ] HealthKit permissions granted
- [ ] App launches and works

---

## Feedback

Once you've tried the app, any feedback is welcome:
- Bugs / crashes
- UI issues
- HealthKit data not showing correctly
- Breathing / animation issues
- Anything confusing or unclear

You can send feedback directly via the TestFlight app itself (tap the app → scroll down → "Send Feedback") or just message Abby.

Thanks!
