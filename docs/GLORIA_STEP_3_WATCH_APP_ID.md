# Selah TestFlight Setup — Part 3: Watch App ID & Provisioning Profile

Hi Gloria,

We've added an **Apple Watch companion app** to Selah. Before I can build a new TestFlight IPA that includes the Watch app, I need you to register a second App ID for the Watch and generate a matching provisioning profile.

Good news: this reuses the **same Apple Distribution certificate** you already created in Part 1 — no new certificate needed.

**Estimated time:** 10–15 minutes

---

## Background

The iPhone app uses bundle ID `com.pause.selah` (already done in Part 1).

The Watch app needs its **own** bundle ID: **`com.pause.selah.watchkitapp`**. This is an Apple convention — a watch companion bundle ID must be the iPhone bundle ID with `.watchkitapp` appended.

Each bundle ID needs:
- An **App ID** registered on the Developer Portal (with HealthKit enabled)
- An **App Store provisioning profile** signed with your Apple Distribution certificate

---

## Step 1 — Create the Watch App ID

1. Go to [https://developer.apple.com/account/resources/identifiers/list](https://developer.apple.com/account/resources/identifiers/list)
2. Click the **`+`** button
3. Select **App IDs** → **Continue**
4. Select **App** → **Continue**
5. Fill in:
   - **Description:** `Selah Watch App`
   - **Bundle ID:** select **Explicit** → enter exactly `com.pause.selah.watchkitapp`
6. Scroll down to **Capabilities** → tick **HealthKit**
   - This is critical — without it the Watch app cannot read heart rate / HRV data
7. Click **Continue** → **Register**

You should now see **two** App IDs in your list:
- `com.pause.selah` (iPhone — from Part 1)
- `com.pause.selah.watchkitapp` (Watch — just created)

---

## Step 2 — Create the Watch App Store provisioning profile

1. Go to [https://developer.apple.com/account/resources/profiles/list](https://developer.apple.com/account/resources/profiles/list)
2. Click the **`+`** button
3. Under **Distribution**, select **App Store** → **Continue**
4. **App ID:** select **`com.pause.selah.watchkitapp`** from the dropdown → **Continue**
   - Important: pick the Watch one, NOT `com.pause.selah`
5. **Select Certificates:** tick the **Apple Distribution** certificate you created in Part 1 (the one with the date you set it up) → **Continue**
6. **Provisioning Profile Name:** `Selah Watch App Store Profile` → **Generate**
7. Click **Download** to save the `.mobileprovision` file

---

## Step 3 — Send the new profile to Abby

Please send me (via the same channel you used last time):

1. **`Selah Watch App Store Profile.mobileprovision`** — the file from Step 2, point 7

That's the only file I need. The certificate, the iPhone profile, and everything else from Parts 1 and 2 are still valid — I have them locally.

Once I have this profile, I can build a new TestFlight IPA that includes both the iPhone app and the Watch app, and send it back with the same upload instructions you used for the first build.

---

## Checklist

- [ ] Watch App ID `com.pause.selah.watchkitapp` created on Developer Portal
- [ ] HealthKit capability ticked on the Watch App ID
- [ ] App Store provisioning profile `Selah Watch App Store Profile` generated and downloaded
- [ ] `.mobileprovision` file sent to Abby

---

## If anything goes wrong

Send me a screenshot of the error. Common issues:

- **Bundle ID `com.pause.selah.watchkitapp` already exists** — someone (maybe you on a previous attempt) already created it. Skip Step 1 and go straight to Step 2; just make sure HealthKit is ticked on the existing App ID by clicking it from the list.
- **Apple Distribution certificate not in the dropdown in Step 2** — your certificate may have expired. Send a screenshot of [your certificates page](https://developer.apple.com/account/resources/certificates/list).
- **Profile generation fails with HealthKit error** — go back to the Watch App ID, double-check HealthKit is enabled, save, then retry profile generation.

Thanks!
