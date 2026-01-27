# System Configuration

## The Story of Platform Tuning

| Feature | Description |
| :--- | :--- |
| **What** | Global toggles and branding settings that define the platform's behavior. |
| **Who** | **System Administrators** with full backend access. |
| **When** | During initial deployment or when launching new hiring initiatives. |
| **Why** | To ensure the platform scales with your company and reflects your corporate identity. |
| **Where** | Under the **Settings > System Settings** navigation item. |
| **How** | 1. Go to **Settings > System Settings** <br> 2. Toggle **AI Matching** (or other flags) <br> 3. Update **Logo URL** <br> 4. Change **Hex Colors** <br> 5. Save and refresh page to verify |

## 1. Feature Toggles (Modular Logic)
Activate or deactivate entire segments of the app without code changes:
- **AI Matching**: Connect or disconnect the Google Gemini engine for candidate scoring.
- **Basic Auth**: Allow or block fallback login methods (email/password) alongside SSO.
- **Recruiter Sync**: Automate the assignment of incoming candidates to the correct recruitment owner.

## 2. Branding (Identity Work)
Make the platform feel like home:
- **Dynamic Logos**: Replace the default FitScan branding with your company's SVG/PNG logo.
- **Core Theming**: Adjust the primary and secondary hex colors to align with your brand guidelines.

## 3. Email Configuration
Manage outgoing communication standards.
- **SMTP Settings**: Connect your own mail server (Office 365, SendGrid) to verify sender identity.
- **Templates**:
    1.  Navigate to **Settings > Email Templates**.
    2.  Customize automated messages for:
        *   *Application Acknowledgement*
        *   *Interview Invite*
        *   *Rejection Letter*

## 3. How to Verify (Test Case)
To test branding updates:
1.  **Navigate**: Go to **"Settings > System Settings"**.
2.  **Act**: Change the **"App Name"** to "Demo Hire" and upload a temporary logo. Save.
3.  **Confirm**: Refresh your browser. Verify the title in the browser tab and the sidebar logo have updated to reflect the new identity.

