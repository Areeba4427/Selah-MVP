# Selah TestFlight Setup — Part 1: What I Need From You

Hi Gloria,

Before I can send you a TestFlight-ready build of Selah, I need three things from your Apple Developer account. This guide walks you through every step.

**Estimated time:** 20–30 minutes

---

## Prerequisites

You need an **active paid Apple Developer Program membership** (\$99/year). Free accounts cannot use TestFlight. If your account is active, you're good to go.

You'll also need **your Mac** (for generating the Certificate Signing Request in Part 2).

---

## Part 1 — Create the App Store Connect record for Selah

1. Go to [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com) and sign in
2. Click **My Apps**
3. Click the **`+`** button (top-left of the apps list) → **New App**
4. Fill in the form:
   - **Platforms:** iOS
   - **Name:** `Selah`
     - _This is the display name in TestFlight and the App Store. Can be changed later._
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** select `com.pause.selah` from the dropdown
   - **SKU:** `selah-ios` (any unique string, just for your records)
   - **User Access:** Full Access
5. Click **Create**

### If `com.pause.selah` is NOT in the Bundle ID dropdown

You need to create the App ID first on the Developer Portal:

1. Go to [https://developer.apple.com/account/resources/identifiers/list](https://developer.apple.com/account/resources/identifiers/list)
2. Click the **`+`** button
3. Select **App IDs** → Continue
4. Select **App** → Continue
5. Fill in:
   - **Description:** `Selah`
   - **Bundle ID:** select **Explicit** → enter `com.pause.selah`
6. Scroll down to **Capabilities** → tick **HealthKit**
   - This is critical. Without this, HealthKit won't work in the TestFlight build.
7. Click **Continue** → **Register**
8. Go back to App Store Connect and create the app (the bundle ID should now appear in the dropdown)

> **Note:** You don't need to fill out App Information, Pricing, App Privacy, etc. right now — those are only required for public App Store submission. TestFlight can use the app record immediately after it's created.

---

## Part 2 — Generate an Apple Distribution certificate

### Step 2a — Create a Certificate Signing Request (CSR) on your Mac

1. Open **Keychain Access** on your Mac
   - Press `Cmd+Space`, type `Keychain Access`, press Enter
2. In the top menu: **Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority…**
3. Fill in the dialog:
   - **User Email Address:** your Apple ID email
   - **Common Name:** `Gloria Kamidi`
   - **CA Email Address:** leave blank
   - **Request is:** select **Saved to disk**
4. Click **Continue**
5. Save the `.certSigningRequest` file to your **Desktop**

### Step 2b — Generate the certificate on the Developer Portal

1. Go to [https://developer.apple.com/account/resources/certificates/list](https://developer.apple.com/account/resources/certificates/list)
2. Click the **`+`** button (top-right of the certificates list)
3. Under **Software**, select **Apple Distribution** → **Continue**
4. Upload the `.certSigningRequest` file you just saved to your Desktop → **Continue**
5. Click **Download** to save the generated `.cer` file

### Step 2c — Install the certificate into your keychain

1. **Double-click the downloaded `.cer` file**
   - Keychain Access opens and imports it into your login keychain
   - This links the distribution cert to the private key that was created with the CSR

### Step 2d — Export the certificate as a `.p12` file

1. Open **Keychain Access**
2. In the left sidebar, select **login** (under "Default Keychains")
3. Select **My Certificates** in the category list
4. Find the new entry: **"Apple Distribution: Gloria Kamidi (2PCRVU9UX2)"**
5. Click the arrow next to it to expand — **verify there's a private key underneath**
   - If there's no private key, the export won't work. Something went wrong with Step 2a/2c. Let Abby know.
6. **Right-click** the certificate → **Export "Apple Distribution..."**
7. Save the file:
   - **Name:** `SelahDistribution.p12`
   - **Where:** Desktop (or anywhere you'll remember)
   - **File Format:** Personal Information Exchange (.p12)
8. Click **Save**
9. **Set a password** on the `.p12`:
   - Pick something simple but not empty (e.g., `SelahDist2026`)
   - **Remember this password — you need to send it to Abby along with the file**
10. Click **OK** (you may be prompted for your Mac login password to confirm)

---

## Part 3 — Create an App Store provisioning profile

1. Go to [https://developer.apple.com/account/resources/profiles/list](https://developer.apple.com/account/resources/profiles/list)
2. Click the **`+`** button
3. Under **Distribution**, select **App Store** → **Continue**
4. **App ID:** select `com.pause.selah` from the dropdown → **Continue**
5. **Select Certificates:** tick the **Apple Distribution** certificate you just created (the one with today's date) → **Continue**
6. **Provisioning Profile Name:** `Selah iOS App Store Profile` → **Generate**
7. Click **Download** to save the `.mobileprovision` file

---

## Part 4 — Send these three things to Abby

Please send me (via email, Slack, WhatsApp — whatever works):

1. **`SelahDistribution.p12`** — the file from Part 2, Step 2d
2. **The password** you set on that `.p12` (from Part 2, Step 2d)
3. **`Selah iOS App Store Profile.mobileprovision`** — the file from Part 3, Step 7

Once I have these, I can build a TestFlight-ready IPA and send it back to you with separate upload instructions.

---

## Checklist

Before you send the files, double-check:

- [ ] Selah app record created in App Store Connect with bundle ID `com.pause.selah`
- [ ] HealthKit capability enabled on the `com.pause.selah` App ID (Part 1)
- [ ] Apple Distribution certificate generated and installed in your Keychain
- [ ] `.p12` file exported with a password you remember
- [ ] App Store provisioning profile generated and downloaded
- [ ] Both files + the password ready to send to Abby

---

## If anything goes wrong

Send me a screenshot of the error — I'll help debug. Common issues:

- **"You already have a current iOS Distribution certificate"** → You already have one from a previous app. Either use the existing one (find it in Keychain, right-click → Export), or revoke the old one on the Developer Portal first.
- **Bundle ID dropdown is empty** → You skipped the App ID creation step in Part 1. Go back and do it.
- **HealthKit capability missing from App ID** → Edit the App ID on the Developer Portal, tick HealthKit, save, then regenerate the provisioning profile.

Thanks for your help!
